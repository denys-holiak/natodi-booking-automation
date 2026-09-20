# Strategy

## 1. What would you automate, and what would you keep manual?

**Automate:** the booking widget's core transaction path (service → slot →
contact → confirmation) and its input validation - this is where regressions
are frequent (form fields, price/duration math, calendar availability) and
silent failure directly costs the business money (a client who can't book
just leaves). Also automate anything with a deterministic, checkable output:
API contracts, pricing calculations, notification triggers.

**Keep manual:** visual/layout QA (spacing, overlapping buttons - see bug
#3), first-run onboarding UX judgment calls, payment provider integration
edge cases (3-D Secure, expired cards, chargebacks) where the cost of a
realistic automated harness outweighs the risk for a small team, and
anything that depends on a human judgment call about tone/content (e.g.
whether a Telegram reminder message "feels" right). Exploratory testing of
new features before they're stable is also better spent as manual
sessions - see how much unrelated breakage turned up just from a 15-minute
walk through registration and service setup for this assignment.

**Why this split:** automation pays for itself on paths that run often and
have a clear pass/fail signal. It pays badly on paths that change
constantly, are inherently subjective, or would need heavy mocking of a
third-party (payment) system to test safely.

## 2. How would you make time-dependent tests deterministic?

Two different problems hide under "booking depends on time":

1. **The test's own clock drifting relative to real time** (a hardcoded
   "book tomorrow at 10:00" eventually becomes "book last month"). Fix:
   never hardcode a date/time; compute it relative to `Date.now()` at run
   time, or - cleaner - mock the system clock with Playwright's
   `page.clock` (or inject a fixed `Date` via an init script) so the app
   always believes it's a fixed instant, and drive the calendar from that
   fixed instant. This is the textbook fix and the one I'd push for once
   there's a non-production environment to run it against.
2. **The booking calendar's availability being live, shared state**, which
   is what this assignment's real widget actually does: each successful
   booking consumes a slot, so "book slot X" is not repeatable no matter
   how the clock is handled. Given no staging/seeding API for this
   account, `SlotPicker.selectNextAvailableSlot()` dynamically walks the
   calendar and books whatever slot is next available, instead of a fixed
   time - the test's assertions don't depend on which exact slot it was.
   That keeps the happy-path test runnable more than once, but it is not
   free: it can still fail honestly (not flakily) if the account's working
   hours run out of capacity, which is the correct behavior for a test
   with no control over backend state, and it's the reason the happy path
   is the one test in this suite that is not safe to re-run indefinitely.

Observed in practice, not just in theory: this suite's own booking tests
run with 3 parallel workers by default, and every worker read the same
live calendar at nearly the same instant. The first version of
`SlotPicker` always picked the _first_ slot on the first day with any
availability - so with 3 workers running together, all 3 converged on the
identical "next available" slot and raced each other for it. The losers
hit "Схоже, цей час уже заброньований" on the contact form, even though
the calendar had dozens of other free slots that day. The fix was to pick
a _random_ slot among the ones visible that day instead of always the
first. In practice that still collided more often than expected, because
every worker still walked calendar days _in order_, so all of them landed
on the same nearest day and only spread out within its slots. The actual
fix was to shuffle the day order too, spreading workers across the whole
month instead of one day - confirmed by rerunning the full parallel suite
repeatedly afterward, not just once. It still didn't eliminate the
theoretical race (two workers can roll the same day _and_ the same slot),
only lower its odds.

The version actually shipped goes one step further: `SlotPicker` splits
the calendar's bookable days into one slice per Playwright worker
(`dayIndex % totalWorkers === parallelIndex`, from `test.info()`) and only
randomizes within its own slice. Two workers in the same run can no longer
even _try_ the same day - not "unlikely to collide", structurally unable
to, regardless of how much random draws. This is a guarantee, not a
probability, but a narrow one: it only covers workers inside _one_
`npm test` invocation. It does nothing for two independent test runs (this
suite plus a colleague's, or two overlapping CI jobs) hitting the same
account concurrently, or for eventual-consistency lag between a booking
landing and the calendar reflecting it - those still rely on the slot pool
being large relative to how much concurrent activity there is, which is
why the account is configured with weeks of daily 09:00-19:00 availability
rather than a handful of slots. The real, complete fix for that remaining
layer is backend-side: a seeding/reset API or a disposable per-test-run
sandbox company, so tests can create and tear down their own slots instead
of contending over the one production calendar at all.

Confirmed this residual gap in practice, not just on paper: running `npm
test` twice in a row (two separate invocations, not parallel workers
within one) failed the happy-path test on the second run with "Схоже, цей
час уже заброньований" - the exact collision described above, just across
runs instead of within one. That's the expected, honest failure mode of
testing against a live shared calendar with no seeding API, not a bug in
the suite, so nothing in `SlotPicker` was changed in response to it.

If this widget exposed a booking API (which it likely does, since the UI
calls something to render/reserve slots), the actual fix would move the
problem out of the UI layer entirely: create and clean up each test's own
slot through direct API calls in `beforeEach`/`afterEach` (or a seeding
endpoint, if one existed) instead of racing real users for whatever the
calendar happens to have open. That turns "does a slot exist and survive
until I click it" from a live contention problem into a fixture concern -
the same reasoning that already puts this suite's API tests in a separate
Playwright project. Calendar/slot-availability behavior itself would then
be worth a couple of _API_-level tests (does booking a slot make it
unavailable, does releasing one free it up again) where assertions don't
depend on racing concurrent UI runs at all. The UI suite would keep the
happy path as a smoke test but wouldn't be the layer proving slot
contention rules - it would stay focused on interactions that don't depend
on which slot won the race: form validation, picker navigation, the
summary reflecting a selection correctly. This wasn't implemented here
because there's no documented booking API for this account to call
directly (only the public widget), not because it wouldn't be the right
design with one.

## 3. Bug reports

**#1 - Fully configured service invisible on the public booking widget**

- Description: this bug spans two different surfaces - the setup happens
  in the **admin panel**, where the business owner creates a
  service, assigns a staff member and configures their schedule; the bug
  itself is only visible on the **public booking widget**
  (`book.natodi.com/<slug>`), the client-facing page this suite's UI
  tests actually drive. A service can look fully configured from the
  admin panel's own point of view and still never appear to a real client
  if one specific admin-only setting (a staff member's working schedule)
  was skipped.
- Steps to reproduce:
  1. Create a service with a name, price and duration.
  2. Assign a staff member to it.
  3. Enable both "Доступність для запису" toggles (staff app + client
     widget).
  4. Do **not** configure a working schedule for that staff member.
  5. Open the public booking widget and pick that service's category.
- Expected result: either the service appears with the next available
  slot, or - at minimum - a message that tells the business owner _why_
  it's hidden ("no working hours set").
- Actual result: the widget silently shows "Послуги відсутні / У цій
  категорії немає послуг", identical to the empty-category state, with no
  actionable hint anywhere in the admin panel pointing at the missing
  schedule.
- Severity: **High** - a fully paid, fully configured account cannot take
  a single booking, with no error message anywhere directing the owner to
  the fix.
- Priority: **High** - blocks the account's core function (taking
  bookings) with no workaround visible to the owner; worth an immediate
  fix or at least an immediate error message.

**#2 - Zero client-side validation on required registration fields**

- Description: the same missing-validation pattern shows up in two
  unrelated places, both in the **admin-facing** side of the product (not
  the public booking widget): the initial **sign-up wizard** a new
  business owner fills in once (name, business name), and, separately,
  the **admin panel**'s own "Services" ("Послуги") service-creation form,
  used any time a service is added. They're grouped into one report
  because it's the same underlying defect (required-looking fields
  accepting blank/whitespace input), not because they're the same screen.
- Steps to reproduce:
  1. During sign-up, on the "Як вас звати?" step, enter only spaces into
     "Прізвище" (or leave it blank) and continue.
  2. Separately, on the business name step, leave the name empty even
     though there's no "Skip" option for what looks like an optional
     field, and continue.
  3. Later, in the admin panel's "Послуги" (Services) section, create a
     new service and leave both the name and category empty, then save.
- Expected result: a required field marked with `*` rejects
  blank/whitespace-only input; an optional field that blocks progress
  either isn't required or offers an explicit "Skip".
- Actual result: all three accept anything, including whitespace-only or
  empty values. This is how a service with a blank name ended up
  genuinely listed in the public widget next to real services during this
  session.
- Severity: **Medium** - doesn't block usage, but produces bad data
  (nameless services, junk client records) with no recovery path other
  than manually noticing and fixing it later.
- Priority: **Medium** - not urgent (doesn't block a working account),
  but worth fixing before more junk data accumulates and needs manual
  cleanup.

**#3 - Company deletion's confirmation step can never be completed**

- Description: found while following this assignment's own "After you
  finish" instructions - specifically the fallback path it describes
  ("if cancelling doesn't work... that's a finding"). This is in the
  **admin panel**, Settings → Account → "Видалення акаунта" ("Delete
  account"), a separate, more destructive action than cancelling the
  subscription (it deletes the company and all its data - bookings,
  clients, staff, finances - immediately and irreversibly).
- Steps to reproduce:
  1. Admin panel → Налаштування → Акаунт → "Видалити" under "Видалення
     акаунта".
  2. Step 3 of 3 asks: "Введіть назву компанії для підтвердження" (enter
     the company name to confirm), with a hint line below the input
     labelled "Введіть:" ("Type:") that's clearly meant to show the exact
     expected value.
  3. Type the company's actual, correct name (confirmed against
     Компанія's own page - "Sugar & Silk Studio") into the field.
- Expected result: typing the correct company name enables "Видалити
  компанію назавжди" ("Delete company forever").
- Actual result: the "Введіть:" hint line renders completely empty - the
  expected confirmation value never gets populated - and the delete
  button stays disabled regardless of what's typed, correct name or not.
  The confirmation step, and therefore account deletion itself, cannot be
  completed through the UI at all.
- Severity: **High** - a core account-management action (the only
  self-service way to delete your own data) is completely non-functional,
  not just visually broken.
- Priority: **High** - broken exactly where the product should be most
  trustworthy (irreversible data deletion), and directly on the path this
  assignment's own instructions pointed at.
