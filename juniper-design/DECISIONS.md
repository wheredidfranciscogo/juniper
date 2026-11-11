# Juniper — Decision Record

Load-bearing product & architecture decisions, newest-relevant first. Lightweight
ADR style: the *call*, the *why*, the *consequences/caveats*.

The point of this file is that decisions stop getting re-litigated. If something here
contradicts PLAN.md or TASKS.md, this file wins and the other one gets fixed.

---

## D13 — Juniper is a web app. The native app is retired.
**Date:** 2026-11-08 · **Status:** Decided (reverses D1, demotes D7)

**The call.** Juniper is a web app: Vite, React, plain CSS, served from a URL. The Expo
app is no longer built. `juniper-app/` stays in the repository, frozen, because its pure
modules are the web app's ancestry and its git history is the project's — but nothing
new ships from it.

**Why.** The user, unprompted, the day after the first grid build was cut: *"I think this
ideas are better as web apps. For some reason it make more sense like that, I know the
notification an all that, but still."*

The reason is in this project's own record. **The one feature that justified being native
has never worked.** The watering reminder — D7 called it "the product" — has never fired
on real hardware in the app's entire life. Meanwhile the app sat unopened for two months
and its build expired unused. Native bought a notification nobody has ever received, at
the cost of an install step, a 14-day ad-hoc certificate, and four and a half minutes
between a colour change and seeing it.

The grid is also simply a better fit for the web. A field of squares that drift between
two colours is close to the platform's native idiom; `grid-template-columns: repeat(
auto-fill, minmax(…))` replaced every line of the native version's tile-size arithmetic,
and `getBoundingClientRect()` being synchronous deleted the whole apparatus the expanding
card needed on native — the bridge round-trip, the rect cached on layout, the
re-measure-on-scroll, the fallback for a rect that never arrived.

**What D1 got right, and where it was wrong.** D1 argued that the tactile parts degrade in
a browser and that "when you are standing next to your plants, you are holding your phone."
The first half was true of the app D1 described, whose pleasures were the ripple and the
haptics. D11 deleted most of that, and D12 moved the pleasure into *colour*, which a
browser renders at least as well. The second half still stands — which is why the grid is
designed phone-first and the page is a PWA candidate, not a desktop dashboard.

**Consequences and caveats.**
- **No reminders, and that is the bet.** Web Push on iOS requires the page be installed to
  the home screen and cannot schedule locally, so a real reminder needs a server holding
  subscriptions and a cron — which would reverse D2. Instead the grid *is* the reminder:
  you come back because looking is pleasant, not because something nagged. Revisit only if
  real use shows otherwise. D7 is hereby demoted from "the product" to "an open question".
- **"On-device" is much weaker in a browser, and this is the real cost.** The garden lives
  in one browser on one machine: localStorage for the record, IndexedDB for photographs.
  "Clear site data" destroys it, and it does not follow you to a laptop. **The export is
  therefore the only backup that exists**, which is why a failed write is surfaced loudly
  (`storageError`) instead of swallowed, and why the footer says so in plain words. This,
  not notifications, is what will eventually argue for accounts.
- **581 lines of pure logic ported byte for byte**, with 74 of their tests: `dryness`,
  `watering`, `stats`, `cover`, `today-utils`, and the seed. Keeping those modules
  RN-free was not fastidiousness; it is the reason this pivot cost a day instead of a
  rewrite.
- **The ramp moved into TypeScript** (`src/lib/ramp.ts`) rather than CSS, and this was
  forced by evidence, not taste — see D14.
- Haptics are gone (no Vibration API on iOS Safari). `expo-notifications`,
  `expo-file-system`, `expo-image-picker` and Reanimated have no successors; photos are a
  file input, export is a download, import is a file picker. Each is *smaller* than what
  it replaced.
- The bundle is **68 kB gzipped**, against the native bundle's 4.43 MB.

---

## D14 — The dryness ramp is computed in TypeScript, not CSS.
**Date:** 2026-11-08 · **Status:** Decided (from browser behaviour observed directly)

**The call.** `src/lib/ramp.ts` interpolates the moss→dried ramp in OKLab and returns an
`oklab()` string; the tile sets it as a concrete inline `background-color`. The stylesheet
owns the two endpoint colours and the transition duration, and does no arithmetic.

**Why. Two CSS versions of this were written, looked correct, and were silently broken.**

1. `background-color: color-mix(in oklab, var(--dried) calc(var(--dryness) * 100%),
   var(--moss-soft))` with `transition: background-color`. In Chrome 152 the colour
   resolves once at first paint and never again.
2. A tall `linear-gradient` slid by `background-position-y`, transitioned. Identical
   failure: the element's inline position read `0%` and its computed position stayed
   `100%`.

In both cases **no transition events fired at all**, and watering a plant updated the
store, the DOM, the inline style and the accessibility label while leaving the square
exactly the colour it already was. Reduced to isolation: *any* transition on
`background-position` froze it, and a transitioned property computed from a custom
property does not re-resolve when that property changes.

**The deeper point is how nearly this shipped.** Every test passed through both broken
versions, because no test could see a colour — the same blind spot the native app had,
where Reanimated is mocked to a plain View and `interpolateColor` returns a constant.
The grid's entire purpose is a colour, and the colour was the one thing nothing checked.

**Consequences and caveats.**
- The ramp is a pure function of one number, so `ramp.test.ts` asserts it directly —
  including that it **saturates** (D12: ninety days late is the colour of due today) and
  that the OKLab midpoint is near-neutral rather than the khaki sRGB mixing produces.
  These are the first tests in the project's history that cover the colour.
- Component tests assert `toHaveStyle({ backgroundColor: rampColor(d) })`, so a tile
  wired to the wrong number now fails.
- `ramp.ts` and `styles/tokens.css` both hold the ramp's endpoints and must be kept in
  step. That duplication is the price of the above and is marked in both files.
- **Anything that must visibly change should be checked on a screen before it is called
  done.** Nothing in the test suite was capable of catching this.

---

## D12 — The garden is a grid of squares that drift from watered to dry.
**Date:** 2026-11-07 · **Status:** Decided (from user feedback after two months of not using the app)

**The call.** The app's home is a grid. Every plant is one square: its photograph matted
on a coloured mount that drifts `mossSoft → dried` as the plant goes from watered to due.
Watering happens from the square itself. Tapping a square expands it in place. This
**replaced both the Today card carousel and the filtered Garden list**, which are deleted.

**Why.** The project sat untouched from 2026-09-09 to 2026-11-07 — the preview build
expired unused and the watering reminder still never fired on hardware. The app had solved
the problem on paper and did not pull anyone back. The user's framing: *"at the end of the
day people stay in the webapps because is fun and resolved a problem, otherwise people
would use pen and paper for it."*

Pen and paper can hold a date. What it cannot do is **show you the state of everything at
once**. A list has to be read, sorted and filtered because its rows all look alike; a grid
does not, because colour carries the state and stable position makes each plant
recognisable. Watering then produces a visible change you caused, and the slow drift back
is a countdown that never nags.

**This is not a reversal of D11.** D11 cut *decoration* — questions and labels that
performed at you and configured nothing. This adds *reward*: the app giving something back
for the thing you actually do. D11 forbids theatre, not pleasure.

**Consequences and caveats.**
- **The ramp holds at 1.** A plant three days late looks identical to one due today. The
  colour saturates at `dried` and stops; nothing escalates, nothing reddens, nothing counts
  how late you are. Same rule the reminder copy is held to by a test, now enforced for the
  grid by `dryness.test.ts`. **No streaks, no badges, no scores** — a streak punishes you
  for a weekend away, and the plant does not care.
- **No filters.** "Thirsty" was the only one anyone wanted and the grid answers it before
  you could tap a chip. Indoor/Outdoor goes with it. `location` stays on the model; it is
  no longer surfaced.
- **Colour is never the only signal.** Every square carries a spoken label ("Marcel, 3 days
  to go"), because a grid encoding its only information as hue is no interface at all to a
  colourblind or screen-reader user.
- **The peek is a look, not a replacement.** Plant Detail keeps everything that
  accumulates — the photo timeline, the per-plant log, editing — one tap further in.
- **Three tabs, not four.** Garden · Log · You. The tab bar carries an invisible spacer so
  the fixed-width FAB stays on the centre line.
- **Photographs now have a job on the main screen**, which retroactively earns the cover
  work from 2026-08-30. Plants without a photo fall back to their herbarium pressing, so
  the grid is complete from a cold install.
- **Build it for one real garden first, then generalise.** The user's sequencing: *"I wanna
  make it work for my first, and then make it something like a product."* That order has
  been right every time on this project.

---

## D11 — Ask nothing that doesn't configure something. No personality layer.
**Date:** 2026-08-16 · **Status:** Decided (from user feedback on the first device build)

**Context.** Onboarding was seven screens: five personality questions ("What draws you to
plants?", "Where have you tended plants before?"), a name, and a reveal that christened
you an archetype — The Plant Whisperer, The Quiet Collector. The archetype then reappeared
on Today and headlined the You tab. None of it changed a single thing the app did.

**Decision.** **The archetype is deleted**, and onboarding asks only what it configures:
a name (for the greeting) and reminders (permission plus a time, so watering reminders
work from the first day). Two screens.

**The rule, generally:** if an answer does not set something up, do not ask it. The same
test retires anything on screen that cannot be acted on or understood — "plant-days" was
a number with no interpretation, "Temp: warm / any / cool" configured nothing, and
"Pressing: moss / clay / deep" asked the user to name an illustration style.

**Why.** From the first real look at the app on a phone: *"questions of, like, how was
your childhood, and it doesn't have anything related with the app — then don't ask."* The
handoff's personality layer read as the app performing rather than being useful, and every
one of those screens sat between someone and the thing they came for.

**Consequences.**
- `Plant.temp` is gone. `Plant.location` ('indoor' | 'outdoor') replaces it, because that
  one *does* drive something — the Garden filters, which previously could not work.
- The pressing tone stays in the data (it is the card's colour) but is chosen for you.
- Backups from before this still restore: an archetype in the file is ignored, not rejected.
- A corollary that now has its own rule: **a control that cannot change what you see should
  not be on screen.** Garden hides any filter matching nothing, rather than offering
  Indoor/Outdoor chips that do nothing.
- And developer text never ships: the species search said "Add EXPO_PUBLIC_PERENUAL_KEY to
  .env", which is a note to me, not to the person holding the phone.

---

## D10 — Restoring a backup replaces the garden. It does not merge.
**Date:** 2026-08-16 · **Status:** Decided

**Context.** Export shipped without import, which made it a data dump rather than
insurance (D2's one real downside). Import needs a merge decision, and that decision is
the whole substance of the feature.

**Decision.** Importing a backup **replaces** the entire garden — plants, log, name and
archetype — behind an explicit confirmation that states the counts on both sides. There
is no merge-by-plant-id.

**Why.** Merge sounds kinder and is where silent corruption lives. Every plant in a
backup carries a `lastWateredISO`, and that timestamp *is* the watering loop: it decides
thirst, the Today list, and when the next reminder fires. So a merge has to answer "which
timestamp wins?" and every answer is bad:

- **Backup wins** — a three-week-old file makes a plant you watered yesterday look
  parched, and fires a reminder that is simply wrong.
- **Current wins** — then importing did nothing for the plants you already had, which is
  usually the whole reason you were importing.
- **Newest wins** — plausible, and the worst of the three: the result is a blend nobody
  chose, and *you can no longer say what your garden is*.

That last point decides it. After a replace you can state your data in one sentence: it
is the file. After a merge you cannot state it at all, and an app whose entire job is
telling you when to water cannot afford ambiguity in the field that drives the reminders.

**Consequences / rules.**
- The confirmation must name real numbers — how many plants and entries are in the file,
  how many are about to be discarded, and when the backup was taken. "Are you sure?" is
  not enough for an irreversible act with no undo and no server-side copy.
- Restoring into an **empty** garden is the common case (new phone, reinstall) and is
  trivially safe; the confirmation should not treat it as if it were destructive.
- A picked file is untrusted input. Parsing must validate rather than trust: wrong app,
  unknown future format, malformed plants, duplicate ids, unparseable dates. A bad file
  must fail with a sentence a person can act on, never a crash and never a half-imported
  garden.
- Import replaces state through a single store action so the existing reminder resync
  (which watches `plants`) reschedules everything automatically. No special-casing.
- If merge is ever genuinely wanted, it needs a real conflict UI — per-plant, showing both
  timestamps — not a silent rule. That is a different and much larger feature.

---

## D1 — Native app only. There is no web app.
**Date:** 2026-08-15 · **Status:** SUPERSEDED by D13 (2026-11-08) — Juniper is now a web
app and the Expo app is retired. Kept for the reasoning, which is still worth reading:
D13 says which half of it held up.

**Context.** Juniper started as a Next.js web plant tracker (`jungle-jungle`) and was
re-founded as an Expo app, but the web app was never actually killed — it still sits in
`juniper-website/` doing utility work against Supabase, 8 commits behind its own origin.
Two implementations of the same product, one of them unloved.

**Decision.** The product is an **Expo app for iOS and Android**. The web version is not
"later, smaller" — it does not exist and is not on the roadmap.

**Why.** A web app is easy to reach and impossible to make feel native. The tactile parts
of Juniper — the WaterButton ripple, the paper texture, the haptics, the herbarium
pressings — are the entire point of the design, and they are exactly what degrades in a
browser. More practically: **when you are standing next to your plants, you are holding
your phone.** Not a laptop. The web version optimises for the moment that never happens.

**Consequences.**
- `juniper-website/` stops being an app and becomes a marketing site (see D5).
- Any "but it'd be nice on desktop" impulse is answered here, not re-argued.
- `react-native-web` and `react-dom` come out of the app's dependencies.

---

## D2 — Data lives on the phone. AsyncStorage. No backend.
**Date:** 2026-08-15 · **Status:** Decided

**Context.** PLAN.md has had "Supabase wiring" as a Phase 1 requirement since day one.
It is the single item that has never been started, and the Phase 1 definition of done is
gated on it ("data persists — Supabase-backed"). Meanwhile the app *already* persists:
`src/lib/store.tsx` hydrates from and writes to AsyncStorage on every change, versioned.

**Decision.** **On-device only. Keep AsyncStorage.** Delete Supabase from the plan entirely.
Do not port Alchemilla's SQLite layer either.

**Why.**
- The backend was never the product; it was a habit carried over from the web app. It is
  the reason Phase 1 has been "nearly done" for three months.
- No backend means: nothing to provision, secure, migrate, pay for, or keep up at 2am.
  This is the single decision that let Alchemilla reach real testers.
- **SQLite is the right call for Alchemilla and the wrong one for Juniper.** Alchemilla
  queries 56-day grids, cross-symptom correlations and date-ranged aggregates — real query
  load. Juniper holds a few dozen plants and an append-only event log, read whole on every
  screen. A JSON blob is genuinely the correct data structure here. Copy the *principle*
  from Alchemilla (on-device, no server), not the *implementation*.
- It already works. Shipping the thing that works beats rewriting it.

**Caveats / when to revisit.**
- Revisit if the log grows past ~5k entries or the blob past ~1MB — neither is plausible
  for years of one person's plants.
- Photos are files, not store data: keep the image in the app's document directory and
  store the URI. The blob stays small regardless of how many photos exist.
- Losing the phone loses the data. That is an accepted v1 trade (see D3).

---

## D3 — No sync in v1, and no sync decision yet either.
**Date:** 2026-08-15 · **Status:** Decided (deferred deliberately)

**Decision.** v1 ships with no backup and no multi-device sync. We are **not** picking a
sync technology now.

**Why.** Alchemilla's answer (CloudKit private DB — sync through the *user's* iCloud, never
a server we control) does not transfer, because **Juniper is iOS + Android**. CloudKit is
Apple-only. So the clean, zero-liability answer that worked there is unavailable here, and
the honest position is that this is an unsolved problem we don't need to solve yet.

**Consequences.**
- Do not let this reopen D2. "We'll need a backend for sync eventually" is not a reason to
  build one before a single person uses the app.
- When it does come up, the options are: platform-native (CloudKit + Google Drive, two
  implementations), an end-to-end-encrypted server we can't read, or a manual export/import
  file. Export/import is cheap and probably enough — a "back up my garden" button that
  writes a JSON file to the share sheet is a day of work and needs no infrastructure.

---

## D4 — One repository, at the wrapper folder.
**Date:** 2026-08-15 · **Status:** Decided

**Context.** Juniper is currently three git repos: `juniper-app` → `github.com/…/juniper-app`,
`juniper-website` → `github.com/…/jungle-jungle` (still the old name), and `juniper-design`
tracked nowhere at all. State is scattered, the status docs sit outside every repo, and
nothing has a single history.

**Decision.** One repo at `juniper-project/`, mirroring Alchemilla exactly:
`github.com/wheredidfranciscogo/juniper`, containing `juniper-app/`, `juniper-website/`,
`juniper-design/` and `status/`.

**Why.** Alchemilla's clean sync state is not luck — it is the consequence of there being
exactly one place for things to be. One history, one set of PRs, one status folder that
lives *with* the code it describes.

**Consequences.**
- `juniper-app`'s history is preserved as the base of the new repo; the old standalone repo
  gets archived, not deleted.
- The old Next.js tracker stays alive at `github.com/…/jungle-jungle` as its own archived
  thing. Nothing is lost by removing it locally.

---

## D5 — The website is static HTML on Vercel. It sells the app; it is not the app.
**Date:** 2026-08-15 · **Status:** Decided

**Decision.** Replace the Next.js app in `juniper-website/` with hand-written static HTML —
landing page, privacy policy, terms, support — deployed from the monorepo root via a
`vercel.json` with `outputDirectory: "juniper-website"`. Exactly Alchemilla's setup.

**Why.** The site has three jobs: explain the app, satisfy the App Store's privacy/terms
link requirement, and give people somewhere to land. Static HTML does all three, deploys in
seconds, has no build step to break, and generates no dependency alerts. Alchemilla's site
is four HTML files and has never once needed maintenance.

**Consequences.** No Next.js, no Tailwind build, no shadcn, no Supabase client, no
`node_modules` on the web side at all.

---

## D6 — Expo Go for building screens. EAS dev build for anything native. EAS production to ship.
**Date:** 2026-08-15 · **Status:** Decided

**Context.** "Just use Expo Go" is right about the *development* loop and wrong as a
*shipping* strategy — Expo Go is a host app, not a distribution channel.

**Decision.** Three tiers, deliberately:
1. **Expo Go** — day-to-day screen work. Juniper can stay here longer than Alchemilla could,
   because it has **zero custom native modules**; every dependency is Expo SDK. Alchemilla
   had to leave the moment RevenueCat landed.
2. **EAS development build** (`expo-dev-client`) — required to test notifications properly.
   Local-notification behaviour in Expo Go is limited and differs from a real build on both
   platforms; trusting Expo Go here will produce reminders that work in dev and not in life.
3. **EAS production build** + auto-submit — TestFlight and Google Play internal track.

**Consequences.**
- `app.json` needs `ios.bundleIdentifier` and `android.package` set before any build. These
  edits are already sitting uncommitted in the working tree.
- Add `eas.json` with development / preview / production profiles, copied from Alchemilla.
- Budget a dev build *before* starting notification work, not after.
- **A locally built DEBUG APK is not a runnable copy of Juniper.** Since `expo-dev-client`
  became a dependency, a debug build boots into the dev-launcher screen ("Start a local
  development server with: `npx expo start`") and waits for a Metro server. `npx expo
  run:android` still works because it starts Metro for you — but a debug APK handed to
  anyone else just shows them the launcher. Use `assembleRelease`, or an EAS build, for
  anything that has to stand on its own. Discovered the hard way: it failed all five
  Maestro flows at their first assertion, on CI, with a screenshot of the launcher.

---

## D7 — The watering reminder is the product.
**Date:** 2026-08-15 · **Status:** DEMOTED by D13 (2026-11-08). The reminder was never
once delivered on real hardware, and the web app has none. The claim is now an open
question, not a decision.

**Context.** Notifications have sat at the bottom of Phase 1 behind five screens, as if they
were the finishing touch. `expo-notifications` has been an installed dependency for months
and is imported by exactly nothing.

**Decision.** Reorder the whole plan around it. **A plant app that doesn't tell you to water
your plants is a database with nice typography.** The reminder is the reason the app exists;
every screen is in service of it.

**Why.** The app you actually want is: it knows your plants, it tells you when to water them,
you tap once, it reschedules. That loop is worth shipping on its own. Nothing else in Phase 1
is worth shipping without it.

**Consequences.**
- Notifications move to the front of the queue, ahead of the You tab and photos.
- Port the pattern from `alchemilla-app/src/lib/notifications.ts`: a rolling queue of one-shot
  local notifications, an idempotent `cancel-all + reschedule` sync function called on every
  relevant event, and warm copy that never scolds. It is proven and it is ~120 lines.
- Juniper's version differs in one way: reminders are **per-plant on a cadence**, not one
  daily nudge — so the scheduler keys off each plant's `lastWatered + frequency`, and
  watering a plant reschedules just that plant.
- **Never scold.** No streaks, no "you killed Marcel", no red badges. The design is calm;
  the notifications must be too.

---

## D8 — Phase 3 is deleted. Phase 2 is cut to photos.
**Date:** 2026-08-15 · **Status:** Decided

**Decision.** Delete the social phase from the plan entirely — plant-sitting map, cuttings
marketplace, "plants around me", community ID, following. Not "later": gone. Cut Phase 2 down
to **real photo capture** and nothing else. Dropped: widgets, Live Activity, dark mode,
PlantNet, species search, offline resilience (the app is already offline-only per D2),
iCloud sync, onboarding A/B.

**Why.** The roadmap described a company. What is being built is a tool for one person who
wants to know when to water their plants. Every item above is a reason not to ship. The
social features in particular are each their own product with their own moderation, safety
and liability surface — they are not features of a plant tracker.

**Consequences.** They can come back, one at a time, if the app is ever loved by people who
aren't you. That is a much later, much better-informed conversation. Until then they don't
appear in PLAN.md, so they can't quietly become work.

---

## D9 — Jungle Jungle is dead. Finish the rename.
**Date:** 2026-08-15 · **Status:** Decided

**Context.** The rename is half-done and leaking: PLAN.md is titled "Project Plan — Jungle
Jungle", the URL scheme is `jungleapp`, the proposed bundle ID is `com.wheredidfranciscogo.jungleapp`,
Maestro flows target `com.jungle.app`, and the website's git remote is `jungle-jungle`.

**Decision.** One deliberate pass, **before the first EAS build**, taking everything to
Juniper. Bundle ID `com.wheredidfranciscogo.juniper`, scheme `juniper`.

**Why.** Bundle identifiers are effectively permanent once a build reaches App Store Connect —
Alchemilla got away with a rename only because it was pre-submission, and even then it
deliberately left `clarity.db` alone to avoid orphaning tester data. Juniper has no shipped
build and no users, so this is free right now and expensive in a month.

**Caveat.** The AsyncStorage key `@juniper/store` is already correct and must not change —
it is the one name that is user-data-bearing.
