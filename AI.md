# AI usage

Used Claude (Sonnet 5, in Claude Code) throughout as a pairing tool for
this assignment.

## What I delegated to it

- **Scaffolding the framework's boilerplate** - `playwright.config.ts`,
  `tsconfig.json`, ESLint/Prettier/Husky wiring, the initial project
  layout - the skeleton my own architectural decisions then built on top
  of (component-per-screen Page Objects, fixtures, the `@Step` decorator,
  the API client layer).
- **Finding stable selectors against the live widget.** There are no
  `data-testid`s anywhere on this product, and Angular's own generated
  class hashes change on every deploy. Rather than manually poking through
  DevTools for an hour per screen, I had Claude dump the real DOM (class
  names, roles, accessible names, the actual Angular route components
  behind each step) and turn that into the locator that's actually stable
  - `formcontrolname` over `getByLabel` on the contact form, for instance,
    once we found a duplicate `id` bug that broke label association. That's
    minutes of work instead of a couple of hours of trial and error per
    screen.
- **First-pass implementation of decisions I made.** Once I decided how a
  piece should work - e.g. partitioning `SlotPicker`'s day selection by
  worker index instead of relying on randomization alone - Claude wrote
  the actual TypeScript for it and iterated until the suite passed
  reliably across repeated runs.
- **Diagnosing failing runs** - reading trace/error output and narrowing
  down root causes fast when something broke, instead of me stepping
  through it manually.

## What I rewrote by hand, and why

Several pieces went through a first pass from Claude that I rejected and
had reworked from scratch once I saw the actual result:

- The original `BookingWidget.bookServiceUpToContactForm()` God-method
  that hid the four-screen flow behind one call - I had it split into one
  component per real screen instead, because a Page Object shouldn't own
  step-order knowledge that belongs to the test.
- The first fix for the parallel-worker slot collisions was "just
  randomize the slot" - I pushed on whether that was actually safe with
  real parallel workers, which is what led to the worker-index
  partitioning that actually ships.
- The first `continueTo(label)` fix duplicated the same method body across
  three picker classes - I flagged the duplication and had it reworked
  into the `ContinueBar` composition instead of a shared base class.

## One specific thing the model got wrong that I caught

After the parallel-worker slot race first showed up (`Схоже, цей час уже
заброньований` on 1 out of 3 runs), Claude's first explanation was
server-side eventual consistency - the widget's own slot list lagging
behind a just-created booking. That was wrong: rerunning the full suite
showed all 3 parallel bookings failing together, every time, which
eventual consistency alone doesn't explain. The real cause was in our own
code - `SlotPicker` always picked the first free slot, so every worker
converged on the identical one. I only caught this by insisting on
rerunning the suite multiple times instead of accepting the first
explanation and one green run as proof.
