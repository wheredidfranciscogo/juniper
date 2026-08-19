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
      **Android development build #3** (2026-08-15) is the current one — it carries the
      reminders, the You tab, backup export and photos:
      [APK](https://expo.dev/artifacts/eas/UtsXgfznG1J-A_4vf3Q0uSjzcY2TaR-7ICP9kbVh4LI.apk).
      Builds #1 and #2 are superseded.
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
- [x] **Backup import** — "Restore from a copy" on the You tab. The merge question is settled
      in **DECISIONS.md D10**: restoring **replaces** the garden and does not merge, because
      every plant carries the `lastWateredISO` that drives thirst and reminders, and every
      "which timestamp wins?" rule yields a garden nobody chose. The confirmation names real
      numbers on both sides and is worded differently for an empty garden, where nothing is at
      stake. `parseBackup` is pure and treats the file as untrusted: wrong app, future format,
      malformed plants, duplicate ids, orphan log entries, absurd cadences, unparseable dates,
      and photo URIs from another device are all handled rather than trusted. 21 new tests.
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

- [~] **Both platforms at fidelity.** Static Android pass done 2026-08-16 — four issues that
      are invisible on iOS, all fixed:
        1. **Italics rendered in the wrong typeface.** Five styles used `fontStyle: 'italic'`
           on families with no italic face loaded. iOS synthesises a slant; Android falls
           back to the SYSTEM font, so that copy would have shown in Roboto. Loaded
           `PublicSans_400Regular_Italic` (the handoff asks for sans italic by name) and
           pointed every italic at a real face.
        2. **`includeFontPadding` was never disabled.** Android adds vertical padding on top
           of the explicit lineHeight every preset sets, so text sits low and blocks run
           tall. Applied once in `tokens.ts` rather than at ~30 call sites.
        3. **`userInterfaceStyle` was `automatic`** on an app with no dark mode (D8). On a
           phone set to dark, native surfaces — including the Alert dialogs the restore flow
           depends on — would render dark against a light app. Now `light`.
        4. Splash wordmark hardcoded a font-family string instead of the token.
      Two token guards added, because all of this is invisible on iOS and would regress
      unnoticed. **Still needs a real device** for what static analysis cannot see: touch
      targets, the tab bar against gesture navigation, elevation, and whether the cards feel
      flat in the hand.
- [~] **Run the Maestro flows against a real build.** Flows are written, audited against the
      current screens, and extended to five (`onboarding`, `navigate-tabs`, `water-plant`,
      `you-tab`, `add-plant`). **Still never executed a single assertion.** Decision on
      2026-08-16: stop trying to make GitHub's emulator cooperate and run them on the phone
      instead — `maestro test .maestro/` against a real device takes about a minute.
      ```
      brew install maestro
      maestro test juniper-app/.maestro/
      ```
      (Set `appId: host.exp.Exponent` in the flows if testing through Expo Go rather than a
      dev build.)

      The E2E workflow is left in a known state, with six separate infrastructure problems
      diagnosed and fixed in `.github/workflows/e2e.yml` — it is worth resuming rather than
      restarting if it is ever wanted:
        1. Runner disk exhausted unpacking the emulator → split into two jobs, each with its
           own fresh 72G disk; unrelated toolchains freed.
        2. A racy `rm -rf` of the Gradle caches killed the job under `bash -e` → cleanup is
           best-effort and judged on free space, not on every rm succeeding.
        3. 45-minute job timeout fired while the emulator was still booting → KVM enabled and
           the AVD cached and snapshotted.
        4. Debug APK booted into the expo-dev-client launcher → build `assembleRelease`
           (see DECISIONS.md D6).
        5. The emulator's Pixel launcher ANR'd and its dialog stole the focused window, which
           is all Maestro can read → `settings put global hide_error_dialogs 1`.
        6. Build cancelled at exactly 45 minutes; the one that passed took 44m37s → timeout
           raised to 90 and Gradle dependencies cached.
      What was proven along the way: `expo prebuild` generates a working native project, the
      release APK builds on a clean machine, and Juniper launches and renders its splash
      correctly on Android 34 (screenshot in the run artifacts). What was never proven: any
      flow assertion.
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
