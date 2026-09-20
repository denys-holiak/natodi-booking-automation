# Why this project is structured the way it is

**Two Playwright projects, not one.** `booking-e2e` drives a real browser
against a live third-party product; `api` hits a REST API directly and
never needs one. Splitting them means the API tests stay fast (~100ms
each), and `npm run test:booking` / `npm run test:api` let you run just the
slice you're iterating on.

**One component per real widget screen, not one Page Object for the whole
flow.** The booking widget isn't a single page - Angular swaps in a
different root element per step (`<app-employee>`, `<app-services>`,
`<app-date>`, `<app-home>` for the summary, `<app-confirmation>` for
contact details), confirmed by inspecting the live DOM rather than assumed
from the visible UI. `ExecutorPicker` / `ServicePicker` / `SlotPicker` /
`BookingSummary` / `ContactForm` each scope their own locators to their
own root, so a selector in one screen can never accidentally match a
similarly-worded element on another (both "Дата та час" and "Продовжити"
happen to repeat across screens). `BookingWidget` composes the five and
owns navigation plus the two triggers that sit outside all of them (see
the naming section below) - it does _not_ own the
service→executor→slot→summary→contact-form sequence itself (or any other
order - see the `ContinueBar` note below). An
earlier version had that sequence as one `BookingWidget.
bookServiceUpToContactForm()` method; removed because it made
`BookingWidget` responsible for knowing the internal step order of four
screens it otherwise has no opinion about - a God-method by another name.
The happy path and the negative cases' `beforeEach` now call each
component's own method directly, in order, so the full flow is visible in
the test file itself instead of one level of indirection away. It costs a
few duplicated lines between `happy-path.spec.ts` and
`negative-cases.spec.ts`; that's an accepted trade for not having to open
a second file to see what a test actually does.

Each is named after what it structurally _is_ (a picker, a summary, a
form), not after its position in the flow (`Step1`/`Step2`) - only
`ContactForm` genuinely renders a `<form>` element; `ServicePicker` and
`SlotPicker` are lists/calendars with no `<form>` in sight, which is the
reason they aren't both called `...Form` either. One naming wrinkle worth
knowing: `BookingWidget.openServicePicker()`'s trigger and `BookingSummary`
both live under the _same_ `<app-home>` root - Angular reuses that one
route component for the widget's empty and filled-in states, so the two
share a root even though they're two different steps for the user. That
trigger lives on `BookingWidget` rather than inside `ServicePicker` for
the same reason: it renders one screen _before_ `<app-services>` (and
`ServicePicker`) exists at all, so scoping it there would make it
permanently unfindable - the exact mistake described in `AI.md`.

**A staff picker exists because the test account has two staff members on
purpose.** With only one, the widget auto-selects it and the "Виконавець"
screen never renders at all - a single-master account would make
`ExecutorPicker` untestable dead code. The account was deliberately set up
with two masters (see `STRATEGY.md`/admin notes) specifically so this step
has something to click through, the same reasoning as
`BOOKING_SERVICE_NAME` needing a real service to name.

**A `ContinueBar` collaborator, held by composition, for the repeated
"continue" bar - not a shared base class, and not a copy-pasted method
either.** `ExecutorPicker`, `ServicePicker` and `SlotPicker` all trigger
navigation through the same widget component,
`<app-animated-continue-button>` (a bottom bar with a label that changes
per screen - "Послуги", "Дата та час", "Продовжити"). It went through two
wrong shapes before landing here, both worth knowing about:

1. First version: each picker had its own method named after whatever
   screen it happened to lead to next in one specific flow order -
   `ServicePicker.continueToExecutorPicker()`,
   `ExecutorPicker.continueToSlotPicker()`. Wrong, because the continue
   bar isn't a single "next step" button - it shows one label per
   still-unfilled required field, so which labels are available (and how
   many) depends on what's already been picked, not on which component
   you're looking at. With only a service chosen it offers _both_
   "Виконавець" and "Дата та час"; pick a master and it drops to offering
   just "Дата та час". Reordering the flow once (service → executor →
   date, this suite's actual order, versus an earlier executor-first
   version) immediately made the old method names lie about what they'd
   click.
2. Second version: fixed that by giving each picker the same
   `continueTo(label: ContinueLabel)` method - correct behavior, but now
   the identical method body (`continueBarButton(this.root,
label).click()`) was copy-pasted into three files. The obvious next
   move looks like a shared base class every picker extends - the exact
   thing already rejected elsewhere in this file for `BookingSummary` and
   `ContactForm` not sharing this button at all, and for nothing needing
   a bundled "step" abstraction beyond this one interaction.

The actual fix: composition instead of inheritance. `ContinueBar` is a
small class - `root: Locator` in, `goTo(label)` out - that each picker
holds as a field (`readonly continueBar = new ContinueBar(this.root)`)
instead of extending. `ServicePicker`/`ExecutorPicker`/`SlotPicker` share
this one interaction by holding the same kind of object, not by being the
same kind of object; nothing about back-navigation or any other unrelated
screen behavior comes along for the ride, and adding it to a fourth picker
later is one field, not a new inheritance decision. The flow order itself
stays decided by the tests, not encoded in any component.

**Locators, ranked by how much they leaned on inspecting the live app:**

1. `formcontrolname` attributes (`ContactForm`'s fields) - Angular's own
   reactive-form binding, the most stable handle available. Found by
   dumping the real DOM rather than guessing from the accessibility tree;
   also what exposed the duplicate-`id` bug (STRATEGY.md #3), since
   `getByLabel()` couldn't tell `Ім'я` and `Прізвище` apart but
   `formcontrolname` can.
2. Structural classes the app renders consistently
   (`app-short-info-card`, `.time-cell`, `mydatepicker`'s `.myDpDaycell`).
3. Visible (Ukrainian) text, only where the first two aren't available -
   e.g. `app-animated-continue-button`'s "Дата та час" / "Продовжити"
   triggers, which render as plain `<div>`s with no ARIA role at all, so
   `getByRole('button', ...)` silently matches nothing there. Each such
   trade-off is called out in the component's own docstring, not just
   here, so the next person editing it sees why.

There are no `data-testid` attributes anywhere in the widget, and Angular's
autogenerated `_ngcontent-*` hashes change on every deploy, so this ranking
is the most stable set of handles actually available - not a stylistic
preference.

**A `@Step` decorator on Page Object actions, plain `test.step(...)` in the
tests themselves - two different jobs, not one pattern picked over the
other.** Every POM action (`selectByName`, `continueBar.goTo`, `fill`,
`submit`) is wrapped in `test.step(...)` via one decorator instead of
manually opening a step block at every call site; the tests separately use
`test.step(...)` directly for their own business-level checkpoints
("verify the summary reflects the selected service, master and slot",
`` `submit the booking for day ${slot.day} at ${slot.time}` ``). This
split is deliberate, not an arbitrary choice: a decorator on POM methods
means every call automatically gets a report entry without the test
author remembering to wrap it and without repeating the same label at
every call site, while `test.step(...)` inside a test is for framing a
checkpoint that's specific to _that_ test's story, not a generic reusable
action - wrapping every single POM call in its own inline `test.step()`
would mean re-writing "select service"/"select master"/etc. at every call
site instead of once, for a report that reads the same either way. `Step`
also accepts a function of the method's own arguments, not just a fixed
string - `@Step((name: string) => \`Select service "${name}"\`)` -
so the report shows the real value passed in
(`Select service "Шугаринг рук та ніг"`) instead of a generic label
repeated identically on every run regardless of what was actually
selected.

**`expect()` lives in the tests, not inside component methods.** Component
methods only expose locators and perform actions (`click`, `fill`); they
don't assert. An earlier version of this codebase had `ContactForm.
expectConfirmed()` and `BookingSummary.expectVisible()` wrapping an
`expect()` internally, which needed an `assertFunctionNames` escape hatch
in `eslint.config.ts` just to stop `playwright/expect-expect` from
(correctly) flagging tests that called them as having no visible
assertion. Removed in favor of exposing the locator
(`ContactForm.confirmationHeading`) and asserting in the test itself -
matching how the negative cases already assert on `phoneErrorMessage` /
`submitButton`, matching Playwright's own POM guide, and needing no lint
exception. `confirmationHeading` is scoped to `.success-moment .title`
rather than `<app-confirmation>` like the rest of the class, because
Angular swaps in a _different_ root for this final confirmed state - not
a mistake, called out in the property's own comment.

**A `bookingWidget` fixture, not `new BookingWidget(page)` in every test.**
`src/fixtures.ts` extends Playwright's own `test`/`expect` with a fixture
that constructs `BookingWidget` and navigates it once; every spec just
destructures `{ bookingWidget }` instead of repeating setup boilerplate.

**No `data-testid` layer, no mocking of the booking widget itself.** There
is no staging/sandbox environment for this product and no seeding API, so
the tests run against the real thing. That constrains what's testable
end-to-end (see STRATEGY.md, "unavailable slot") and is called out
explicitly rather than worked around with a fragile approximation.

**`src/config/env.ts` instead of Playwright's `baseURL`.** The booking
page's URL carries a required `?userId=` query string. Playwright's
`baseURL` + `page.goto('/')` combination silently drops query parameters
when resolving a relative URL against a base that already has one, so the
full URL is built once in `env.ts` and imported directly by
`BookingWidget.goto()` instead.

**`BOOKING_URL`/`BOOKING_SERVICE_NAME` are required env vars with no
fallback, not defaults baked into source.** An earlier version had this
account's real URL hardcoded as the `??` fallback in `env.ts` - convenient,
but wrong: it's a live, one-off test account whose subscription gets
cancelled once this is submitted, so a "default" pointing at it would
quietly go dead in source control forever. `env.ts` now throws a clear
error if either var is missing instead of silently reusing someone else's
account. `.env` (loaded via `dotenv/config` in `playwright.config.ts`) is
gitignored like any `.env` normally is - not because these values are
secret, but because committing one anyway reads as careless regardless of
what's actually in it. `.env.example` ships committed with the same keys
and placeholder values instead, and README.md's "Configuring the target
booking page" section has this assignment's own account's real values
ready to paste in, so `npm test` still needs zero setup beyond one
`cp .env.example .env` and a paste - just without a tracked `.env` sitting
in the repo.

`BOOKING_SERVICE_NAME` sits next to `BOOKING_URL` here rather than as a
plain constant in the test files because it isn't arbitrary test data -
it has to be the name of a service that actually exists on whatever
account `BOOKING_URL` points at, so the two are coupled and travel
together. Compare `ContactBuilder`'s faker-generated name/phone/email,
which stay valid no matter which account is under test - that's genuine
test data and lives with the tests, not in `env.ts`.

**ESLint (typescript-eslint + eslint-plugin-playwright) + Prettier +
Husky/lint-staged, not just `tsc`.** `playwright/expect-expect` in
particular catches a test that silently has no assertion, with its default
settings - no exceptions needed now that assertions live in the tests
themselves (see above). The pre-commit hook runs `lint-staged`, not the
test suite itself - running `npm test` on every commit would create a real
booking each time, which is
exactly the kind of side effect a pre-commit hook shouldn't have.

**Picked `api.escuelajs.co` (Platzi Fake Store API) over two other public
APIs tried first, and the reason was found the hard way.** The API tests
went through three targets before landing here:

1. `jsonplaceholder.typicode.com` - no rate limit, completely stable, but
   its writes are pure echo with no real backing store: a `POST`/`DELETE`
   always "succeeds" without actually persisting anything, so a
   create-then-read-back test would be lying about what it verifies.
2. `restful-api.dev` - real persistence (confirmed by creating an object,
   reading it back by its own ID, and seeing a real 404 after deleting
   it), so it replaced jsonplaceholder. Then this suite's own development
   ran directly into its limit: 50 requests/day **per IP**, no API key
   available without signing up. Running the full suite a handful of
   times while iterating on it was enough to exhaust the quota mid-session
   - confirmed by literally getting a `405` with `"You've reached the
daily request limit..."` in the response body instead of the expected
     `200`/`404`. That's not a rare edge case; it's what happens to anyone
   - a reviewer included - who runs `npm test` more than a few times
     within the same day from the same network.
3. `api.escuelajs.co` - has both properties jsonplaceholder and
   restful-api.dev each lacked one of: real persistence (confirmed the
   same way - create, read back, delete, confirm it's gone) **and** no
   rate limit or auth on either reads or writes, verified by hitting it
   repeatedly during this exact investigation with no throttling.

**API tests read a fixed seeded product (`SEEDED_PRODUCT_ID`), not one
they create for themselves - except the one test that's actually about
creating.** `tests/api/products.spec.ts` has three read-only tests (200 on
a valid ID, 400 on a missing one - this API's own `EntityNotFoundError`
convention, not a classic REST 404 - plus schema validation) and one that
exercises the full write path (create → read back → delete). The
read-only tests point at this API's own built-in seed data (`id: 1`,
always present) instead of creating a product first and reading it back.
That was a deliberate call, not the obvious default: having every test
create its own fixture data sounds safer, but it isn't free here - a GET
test that first calls `createProduct` no longer tests just GET, it
silently also depends on POST working. If `createProduct` broke, "should
retrieve a product successfully" would fail too, and the report would
blame the wrong endpoint. Pointing read-only tests at stable seed data
instead keeps each test's failure meaning what its name says. The one test
that's actually about the write path (`should create, read back and
delete a product`) is the one that creates its own product - because
that's the behavior it exists to verify, not an incidental setup step.

**`trace: 'retain-on-failure'`, not `'on'` or `'on-first-retry'`.** `'on'`
records a full trace for every test regardless of outcome and keeps it -
harmless for a handful of tests, but it makes `playwright-report/` balloon
with trace-viewer assets and per-test trace archives even on an all-green
run (10MB+ for this suite's 6 tests), which is the common case and the one
actually committed as the report deliverable. `'on-first-retry'` avoids
that, but only fires on a _second_ attempt - useless with `retries: 0`
locally, so a run with no retries would never capture anything to debug a
failure with. `retain-on-failure` records every test's trace like `'on'`
does, but deletes it immediately if that test passes - same policy this
config already uses for `screenshot`/`video`, and the only one of the
three that gives a debuggable trace on failure without either bloating a
green report or requiring retries just to make tracing work.
