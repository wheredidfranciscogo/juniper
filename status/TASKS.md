# Juniper — Tasks

<!--
Queue for the autonomous loop. Top-to-bottom priority.
States: [ ] todo · [~] in progress · [x] done · [!] blocked (human signal — the runner
will not skip past one, so keep them below the work you want done).

Rewritten 2026-08-15 against DECISIONS.md. The previous file was ~11 weeks stale: it held
two [!] blockers at the top that git had already resolved (the Phase 1 checkpoint was
committed as 4bdb8f4 on 2026-05-25; the post-onboarding red overlay was fixed for real in
c6b9419 via Stack.Protected), so the loop sat "blocked" on paperwork while the work was done.

If an item here contradicts the code, trust the code and fix this file.
If an item here contradicts DECISIONS.md, DECISIONS.md wins.
-->

## Phase 1 — Useful

<!-- Phase 0 (the restructure) shipped 2026-08-15 in commits 570d211, bf0f3ff, 2e230f0.
     See the Done section. -->


### The loop (D7 — this is the product)

- [~] **EAS setup** (D6). `eas.json`, `expo-dev-client`, `owner`, the expo-notifications
      config plugin and the EAS project are all in (`c3a4796`, `853c749`).
      **Android development build #1 succeeded** 2026-08-15 (17 min, Expo SDK 54, v1.0.0):
      [APK](https://expo.dev/artifacts/eas/FtxQbualPAfXgh9Jf2JE95Af_5ye-A7jYU0TRk5eqkY.apk).
      **One step left, and it needs a human:**
  - [ ] **Cut the iOS development build interactively.** EAS has to create the ad-hoc
        provisioning profile and distribution certificate, and it refuses to do that in
        `--non-interactive`. Your iPhone (UDID `00008150-…E9401C`) is already registered
        under team `62NSMDCDAD` from the Alchemilla work, and the Apple session is cached,
        so this should be a matter of confirming the prompts:
        ```
        cd juniper-app && npx eas build --profile development --platform ios
        ```
        Install the result, then run `npx expo start --dev-client --port 8082` and scan.
- [x] **Fixed the model bug that made the whole loop impossible.** `Plant` stored
      `daysSinceWater: number`, a frozen counter nothing ever incremented — `waterPlant` set
      it to 0 and it stayed there, so a plant watered once could never become thirsty again.
      Replaced with an absolute `lastWateredISO`; everything time-related is derived from the
      clock in `src/lib/watering.ts`. Storage schema v1 → v2 with a migration.
- [x] **`src/lib/watering.ts`** — pure, RN-free, node-testable: `daysSinceWatered`,
      `nextWateringDate`, `isThirsty`, `daysUntilWater`, `buildReminderQueue`. Calendar-day
      arithmetic rather than millisecond division, so daylight saving can't shift a plant a
      day early. 25 tests.
- [x] **`src/lib/notifications.ts`** — idempotent `syncReminders()` (cancel-all then rebuild),
      Android channel, permission requested post-onboarding, prefs in AsyncStorage. One pending
      notification per plant — the *next* one only, since watering moves every later date.
      13 tests.
- [x] **`src/lib/use-reminders.ts`** — resync on garden change and on app foreground; taps
      deep-link to `plant/[id]`, handling both the warm listener and the cold-start
      `getLastNotificationResponseAsync` path that otherwise silently does nothing.
- [x] **Warm copy, never scolding** — four rotating lines, "Marcel could use a drink." A test
      asserts the body never matches /missed|overdue|forgot|neglect|streak/.
- [x] **Reminders can now be switched on.** The You tab carries the toggle and the time
      picker; the loop is complete end to end in code.

### The screens that make the loop controllable

- [x] **You tab** — archetype, stats card (in your care / longest tended / plant-days), and a
      working reminder toggle + time picker. 9 component tests covering the states that matter
      most: a toggle must never read "on" while the OS will never deliver anything.
      **Four deliberate divergences from the handoff**, written up at the top of `you.tsx`:
      reminders are inline rather than a chevron row to a screen that doesn't exist; the time
      control is preset chips rather than a native wheel, which would have meant a native
      dependency and the end of Expo Go (D6); "Watering schedule" is dropped because cadence is
      per plant already; "Export your journal" is left out until it works.
- [x] **Fixed `tendedDays`, the same frozen-counter bug in miniature.** It was stored and never
      incremented, so Plant Detail read "TENDED FOR 247 DAYS" forever — and the seed's stored
      values had already drifted out of step with their own `addedISO`. Now derived in
      `src/lib/stats.ts`, along with the garden stats. 12 tests.
- [x] **Backup export** — "Save a copy" on the You tab writes the whole garden to
      `juniper-garden-YYYY-MM-DD.json` and hands it to the share sheet. `buildBackup` is pure
      and node-testable; the file goes to the CACHE directory, not documents, because it is a
      transient artefact and writing it to documents would accumulate a full copy of the
      garden on every export. Refuses to export an empty garden. 10 tests.
- [ ] **Backup IMPORT — the other half, and the honest gap.** An export you cannot restore is
      a data dump, not insurance. Restoring needs a file picker (`expo-document-picker`, a new
      dependency) and a merge decision: replace the garden wholesale, or merge by plant id and
      reconcile conflicts. Until this lands, the export protects you only if you are willing to
      hand the JSON back to a future version.
- [x] **Real photos** — picked images are copied out of the picker's cache directory into the
      app's document directory before their URI is stored (`src/lib/photos.ts`), because the OS
      may clear that cache at any time and a stored cache URI becomes a broken image weeks
      later. Add-photo affordance on Plant Detail's "A SLOW RECORD"; both camera and library.
      13 tests.
- [x] **Fixed: the photo timeline never displayed photos.** It rendered a `Pressing`
      placeholder for every entry and never read `photo.uri` — so the image captured during
      Add Plant was stored and then never shown to anyone. Third instance of the same shape as
      the `daysSinceWater` and `tendedDays` bugs: a field written but never actually consumed.
      The timeline now renders the real image when there is one and falls back to the pressing
      for the seeded history, which has dates but no images.

### Ship

- [ ] **Both platforms at fidelity** — the design is iOS-flavoured; verify Android.
- [ ] **Run the Maestro flows against a real build.** They were authored from on-screen text
      and have never once been executed.
- [ ] **TestFlight + Google Play internal track.**
- [ ] **Two weeks of real use on your own plants** before calling Phase 1 done.

## Deferred — needs a device or a key

- [ ] Perenual API key in `.env` as `EXPO_PUBLIC_PERENUAL_KEY`. Without it the Search path in
      Add Plant falls through to the manual form, which is a fine degradation.
- [ ] Card-highlight fidelity gap — the prototype's `inset 0 1px 0 rgba(255,255,255,0.5)` is a
      hairline border in RN. Only worth fixing if the cards feel flat in the hand.

## Done

<!-- Phase 1's completed [x] items live in PLAN.md. New completions get appended here. -->

### 2026-08-15 — Phase 0 restructure

- [x] **Plan rewritten against a decision record.** `juniper-design/DECISIONS.md` created
      (D1–D9); PLAN.md, STATUS.md and this file rewritten to match. Supabase cut, web app
      cut, Phase 3 deleted, notifications promoted to the front of the queue.
- [x] **Collapsed to one repo** (`570d211`). Three repos → one at the wrapper folder,
      `juniper-app` history preserved (87 renames detected). `juniper-design/` and `status/`
      now under version control. Stranded June working-tree edits committed; stray
      `hyperlocal/` removed.
- [x] **Website replaced with static HTML** (`bf0f3ff`). Four files, root `vercel.json`,
      palette copied from `src/theme/tokens.ts`. Old tracker preserved at
      `github.com/…/jungle-jungle`; its unpushed branches were verified present on that
      remote and a local stash archived to `.archive/` before deletion.
- [x] **Rename finished + web target dropped** (`2e230f0`). Bundle IDs to
      `com.wheredidfranciscogo.juniper` ahead of the first build. **The splash screen was
      still rendering "Jungle Jungle"** despite STATUS.md claiming otherwise since May.
- [x] **CI un-broken.** `.github/` was inside `juniper-app/`, where GitHub never looks —
      the collapse had silently disabled it. Moved to the root with
      `working-directory: juniper-app`; bundle check swapped to `--platform ios`.
- [x] **Supabase references removed** from `src/lib/store.tsx` and `src/data/seed.ts`,
      which both described the store as a stopgap awaiting a backend. It isn't (D2).
- [x] **Verified green after every step**: tsc clean, 12 suites / 105 tests,
      `expo export --platform ios` produces a 4.16 MB bundle.
- [x] **Both stale `[!]` blockers cleared.** The Phase 1 checkpoint commit and the
      post-onboarding red overlay were both resolved in git back in May/June; the markers were
      never flipped, which is why the loop reported `blocked` for eleven weeks.
