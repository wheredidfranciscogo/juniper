# Juniper — Decision Record

Load-bearing product & architecture decisions, newest-relevant first. Lightweight
ADR style: the *call*, the *why*, the *consequences/caveats*.

The point of this file is that decisions stop getting re-litigated. If something here
contradicts PLAN.md or TASKS.md, this file wins and the other one gets fixed.

---

## D1 — Native app only. There is no web app.
**Date:** 2026-08-15 · **Status:** Decided

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
**Date:** 2026-08-15 · **Status:** Decided

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
