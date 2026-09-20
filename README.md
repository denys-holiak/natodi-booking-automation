# Natodi booking automation

Playwright + TypeScript tests for the Natodi public booking widget
(`https://book.natodi.com/<slug>`) and a small suite of public REST API
tests (`api.escuelajs.co`, the Platzi Fake Store API).

## Prerequisites

The booking tests run against a **live** Natodi account, not a sandbox, so
that account needs to already have (see `AI.md` / `STRATEGY.md` for why
there is no seeding/mock layer):

- at least one active service with a name, duration and price,
- **two** staff members assigned to that service, with the toggle
  "Клієнтам - для самозапису через віджет" enabled on both - with only
  one, the widget auto-selects it and skips the "Виконавець" picker
  screen entirely, leaving it untested,
- a working schedule configured for both staff members - without it the public widget silently shows "Послуги відсутні"
  even though the service itself is fully configured. See bug #1 in
  `STRATEGY.md`.

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

This also installs a `pre-commit` hook (via Husky) that runs ESLint/Prettier
on staged files - it does **not** run the test suite itself, since the
happy-path test creates a real booking (see below) and must not fire on
every commit.

## Running the tests

```bash
npm test
npm run test:report
```

`npm test` runs every project (booking e2e + API) and writes an HTML
report to `playwright-report/`; `npm run test:report` opens it.

Narrower runs:

```bash
npm run test:booking   # only the booking widget (opens a real Chromium)
npm run test:api       # only the API tests (no browser needed)
```

### Configuring the target booking page

`BOOKING_URL`, `BOOKING_SERVICE_NAME` and `BOOKING_MASTER_NAME` are all
**required** - the suite throws a clear error on startup if any is missing
rather than silently falling back to a hardcoded account. None of these
are secrets, just account-specific config, but `.env` itself is
gitignored rather than committed - copy `.env.example` to `.env` and
paste in this assignment's own account's values below to get running:

```bash
cp .env.example .env
```

```
BOOKING_URL=https://book.natodi.com/-f7caa7f3?userId=e37acc82-b813-4abe-b67c-e1dca4928b2d
BOOKING_SERVICE_NAME=Шугаринг рук та ніг
BOOKING_MASTER_NAME=Олена Гончарук
```

That account's subscription gets cancelled once this assignment is
submitted (per the assignment's own instructions), so `BOOKING_URL` will
eventually stop resolving - at that point the booking tests need a
different account's values in `.env` to run again (env vars exported in
your shell take precedence over `.env`, if that's more convenient).

## What's covered

`tests/booking/happy-path.spec.ts`

- Selects a service, picks a staff member from the "Виконавець" picker,
  books the **next available** date/time slot (see "Determinism" in
  `STRATEGY.md` for why it's dynamic and not a fixed date), verifies the
  "Ваш запис" summary reflects all three choices, fills in full contact
  details (name, phone, email, Instagram, Telegram), submits, and asserts
  the confirmation screen. **This test creates a real appointment** - it
  is not safe to spam-run against a schedule with little remaining
  capacity.

`tests/booking/negative-cases.spec.ts`

- Rejects an incomplete phone number (inline validation error + disabled
  submit).
- Keeps the submit button disabled while the required name field is
  empty.
- Both stop before the final "Записатись" click, so they never create a
  booking and are safe to re-run any number of times, in any order, in
  parallel.

`tests/api/products.spec.ts` (`api.escuelajs.co`)

- `GET /products/{id}` on a stable seeded product → 200, success case.
- `GET /products/{id}` on a non-existent ID → 400 (`EntityNotFoundError` -
  this API's own convention, not a classic REST 404, confirmed against the
  live API), negative case.
- The seeded product's response validated against an Ajv JSON Schema.
- Full write lifecycle: create a product, read it back by its own ID,
  delete it, then confirm it's really gone - the one test that exercises
  the write path, so it's the one that creates its own data instead of
  relying on the seeded product (see `NOTES.md`).

This API was chosen over a couple of alternatives tried first
(`jsonplaceholder.typicode.com`, `restful-api.dev`) specifically because it
has real persistence (unlike jsonplaceholder's echo-only writes) **and** no
rate limit on either reads or writes (unlike restful-api.dev's 50
requests/day per IP, which this suite's own development ran into - see
`NOTES.md`).

### Quality checks

```bash
npm run lint         # ESLint (typescript-eslint + eslint-plugin-playwright)
npm run format:check # Prettier
npm run typecheck    # tsc --noEmit
```

## CI

`.github/workflows/playwright.yml` runs on every PR to `main`: lint,
typecheck, the API tests, and the booking negative cases. It deliberately
**excludes** the happy-path test - that one creates a real appointment on a
live account with a small pool of slots, so it isn't safe to run
unattended on every PR.

## Project structure

```
src/
  config/
    env.ts                  BOOKING_URL / BOOKING_SERVICE_NAME /
                             BOOKING_MASTER_NAME - required, no hardcoded
                             fallback (see ".env", above)
    apiEnv.ts                PLATZI_API_BASE_URL - a fixed public sandbox
                              URL, not account-specific, so no requireEnv
  components/                One class per real widget screen, each scoped to
                              its own Angular root element:
    ExecutorPicker.ts           <app-employee> - pick a staff member
    ServicePicker.ts            <app-services> - pick a service
    SlotPicker.ts                <app-date> - pick a date/time
    BookingSummary.ts            <app-home> - confirm the "Ваш запис" summary
    ContactForm.ts               <app-confirmation> - contact details + submit
    ContinueBar.ts              a small class each picker holds by
                                  composition (`readonly continueBar = new
                                  ContinueBar(this.root)`), not extends, for
                                  <app-animated-continue-button>, the bottom
                                  action bar reused (with a different set of
                                  labels) by ExecutorPicker, ServicePicker and
                                  SlotPicker
  pages/BookingWidget.ts     Composes the five components; owns navigation
                             and the two cross-step triggers that live outside
                             all of them (the initial "Оберіть майстра" /
                             "Оберіть послуги" links)
  api/
    PlatziApiClient.ts       Thin client for api.escuelajs.co
                              (getProduct/createProduct/deleteProduct);
                              methods return a typed `{ status, body }`, so
                              tests never call response.json() themselves
    endpoints.ts              URL builders, imported by the client instead
                               of inline string concatenation
    schemas/product.schema.ts Ajv JSON Schema + the `Product` type
    schemas/validator.ts       Shared Ajv instance (with ajv-formats)
  data/
    contactBuilder.ts        Randomized-but-valid contact details (faker),
                              so tests don't all book under the same name
    productBuilder.ts         Same idea for the API tests' create payload
  utils/
    step.ts                  @Step decorator - wraps Page Object actions in
                              test.step() for a readable report/trace
    workerPartition.ts        Pure day-index partitioning/shuffling math used
                               by SlotPicker - kept separate from it since
                               it has nothing to do with Locators/DOM
  fixtures.ts                 Custom `test`/`expect` exposing `bookingWidget`,
                               `contactBuilder`, `apiClient` and
                               `productBuilder` fixtures
tests/booking/              Playwright + browser tests, driven through fixtures.ts
tests/api/                  Playwright API tests (no browser), same fixtures.ts
playwright.config.ts
eslint.config.ts / .prettierrc
```

`@app/*` resolves to `src/*` (see `tsconfig.json` `paths`).

See `NOTES.md` for the reasoning behind this structure, `STRATEGY.md` for
the automate-vs-manual call, the determinism approach and bug reports, and
`AI.md` for how AI tooling was used while building this.
