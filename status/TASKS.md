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

- [x] **EAS setup** (D6). `eas.json`, `expo-dev-client`, `owner`, the expo-notifications
      config plugin and the EAS project are all in (`c3a4796`, `853c749`).
      **iOS preview build `55b80f8a` is the one to use** — cut 2026-08-30 from `1c45840`,
      standalone with the JS embedded, so no Metro and no laptop and it can be lived with.
      It carries both photo-covers and plant deletion; the two earlier previews (`ff9faed1`,
      `9fb83381`) are superseded. Install by opening the build page ON THE PHONE:
      https://expo.dev/accounts/wheredidfranciscogo/projects/juniper/builds/55b80f8a-09e1-4634-bee0-fdd93d673f5c
      (Ad-hoc internal distribution; the provisioning profile from the dev build already
      covers the registered iPhone and is valid to June 2027, which is why this cut
      without any interactive credential setup.)

      **⏳ IT EXPIRES 2026-09-13.** Ad-hoc internal builds die on a 14-day clock. After that
      there is no installable copy of Juniper on the phone until a new one is cut —
      `eas build --platform ios --profile preview` from `juniper-app`.

      Superseded: Android dev builds #1–#3 and the iOS *development* build. A development
      build is a shell that loads JS from Metro — useful for fast refresh, useless away
      from the desk.

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

- [x] **You tab** — stats card (in your care / longest tended) and a working reminder toggle +
      time picker. 9 component tests covering the states that matter most: a toggle must never
      read "on" while the OS will never deliver anything. (The archetype header and the
      "plant-days" stat described here originally were both retired in `afe7898` — the archetype
      because it configured nothing, plant-days because it was a number with no interpretation.)
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
- [x] **Fixed: a plant's photograph was never its picture.** Fourth instance of the same shape,
      and the one that mattered most — photos were read *only* by the detail-screen timeline, so
      the image captured while adding a plant showed up nowhere the plant itself appeared.
      `src/lib/cover.ts` derives the cover (newest photo wins, since both add paths prepend) and
      `Pressing` takes an optional `uri`, falling back to the herbarium illustration when there
      is none. Passed explicitly rather than derived inside the component, because the timeline
      uses `Pressing` as a *per-entry* fallback and would otherwise stamp the cover on every row.
      The photo block now also shows while EDITING, not only while adding, so a picture can be
      changed. 6 tests.
- [x] **Remove a plant.** There was no delete anywhere — no store action, no UI — which blocked
      the whole point of the preview build: moving a real garden in. `removePlant` drops the
      plant **and its log entries**, deliberately: an entry whose plant is gone renders as a row
      about nothing, and `parseBackup` already treats such orphans as corrupt and drops them, so
      leaving them would mean an export that cannot round-trip. Photo files are deleted by the
      screen, not the store, which never touches the filesystem. The affordance sits last and
      quiet at the bottom of the edit form, behind a confirmation that names the plant, says the
      photographs and the log go too, and says so explicitly when it is the only plant left.
      7 tests.

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
- [~] **The 17 remaining audit findings are two upstream dead ends. Recheck on the SDK 55 bump.**
      Nothing here is actionable today; both are recorded next to the overrides in
      `juniper-app/package.json` so this is not re-derived from scratch each time.
        1. **`image-size` — 9 highs.** Its advisories cover `<=2.0.2` and 2.0.2 is the latest
           version published, so there is no release to move to. `metro` pins it, and `metro`,
           `metro-config`, `metro-transform-worker`, `@expo/metro`, `@expo/metro-config`,
           `@expo/cli`, `expo` and `@react-native/metro-config` are all flagged downstream of that
           one package. Build-time only. npm proposes `expo@57`, which is a two-major jump against
           D6 and would still resolve a vulnerable `image-size`.
        2. **`decode-uri-component` — 8 moderates, and this one ships.** 0.5.0 is outside the
           advisory range but is ESM-only with no `require` condition, and `query-string@7` is
           CommonJS and calls `require()` on it — forcing it breaks deep-link parsing in the app to
           close a local DoS. Every `@react-navigation/core` up to 7.21.13 still pins
           `query-string@^7`, so the escape has to come from upstream.
      The check to re-run is the one that produced this list: export with `--source-maps` and read
      the module list, rather than reasoning about what "looks like" build tooling.
- [ ] **`you.test.tsx` — "turning it on persists the preference and schedules the queue" is racy.**
      Fails roughly 1 run in 6, on `main` as much as anywhere — measured at 1/8 on the unmodified
      tree while checking the overrides had not caused it. The test `waitFor`s on the AsyncStorage
      write and then asserts `scheduleNotificationAsync` synchronously, but scheduling settles on a
      later tick; under full parallel load it loses. Fix is to move the assertion inside the
      `waitFor`. Left alone here to keep the dependency change clean, but it makes the test gate
      unreliable and will flap CI.
- [ ] **TestFlight + Google Play internal track.**
- [ ] **Two weeks of real use on your own plants** before calling Phase 1 done.

## Deferred — needs a device or a key

- [ ] Perenual API key in `.env` as `EXPO_PUBLIC_PERENUAL_KEY`. Without it the Search path in
      Add Plant falls through to the manual form, which is a fine degradation.
- [ ] Card-highlight fidelity gap — the prototype's `inset 0 1px 0 rgba(255,255,255,0.5)` is a
      hairline border in RN. Only worth fixing if the cards feel flat in the hand.

## Done

<!-- Phase 1's completed [x] items live in PLAN.md. New completions get appended here. -->

### 2026-09-07 — npm audit: 30 → 17, and one shipped HIGH that nobody knew was shipped

- [x] **Established which advisories reach the IPA**, rather than assuming. `expo export
      --platform ios --source-maps`, then read the 1,722-module source map. **`nanoid/non-secure`
      ships** — a HIGH — reached from `@react-navigation/routers` and `expo-router` for route keys;
      so do `decode-uri-component`, `query-string`, five `@react-navigation` packages and
      `expo-router`. Everything else (`tar`, `shell-quote`, `undici`, `ws`, `metro*`, `image-size`,
      `browserslist`, `js-yaml`, `fast-uri`, `form-data`, `brace-expansion`, `postcss`,
      `@xmldom/xmldom`, `@babel/core`) is confirmed **absent** from the bundle — build-time only,
      as expected, but now measured rather than assumed.
- [x] **30 → 17 via targeted overrides**, no SDK move (D6). Both criticals cleared (`shell-quote`,
      `tar`), and `nanoid` — the one shipped HIGH — taken 3.3.12 → 3.3.18 in-major. Written with
      npm's `"pkg@range": "version"` key form where a package is installed at several majors at
      once, because only an in-major bump is API-safe there: `brace-expansion@5` exports
      `{expand}` where `@1` exports the function, so a blanket `^5` would have broken `minimatch@3`
      across the build toolchain.
- [x] **Verified green**: tsc clean, 21 suites / 239 tests, `expo export --platform ios` builds.
      `expo start` smoke-tested as well, since `ws` sits under both Metro and the dev-client
      inspector — both websocket endpoints complete a 101 handshake and the dev server serves a
      1,073-module bundle.
- [x] **Corrected the claim in STATUS.md** that all audit warnings were cleared. It was true in
      2026-06 and had not been true for months; it was read as current on 2026-09-07 and sent
      today's work down the wrong path before the numbers contradicted it.

### 2026-08-30 — The app becomes usable with a real garden

- [x] **Personality layer stripped** (`afe7898`), on the first feedback from a real phone.
      Onboarding seven screens → two; the archetype deleted everywhere including the backup
      format; "plant-days", "temp" and the pressing picker all retired for configuring nothing;
      `location` added so the indoor/outdoor filters work for the first time; filters that match
      nothing no longer rendered; developer text removed from the species search. Recorded as
      **DECISIONS.md D11 — ask nothing that doesn't configure something.**
- [x] **A plant's photograph became its picture** (`74a473d`) and **plants can be removed**
      (`1c45840`) — the two things standing between the app and a real garden. Detail above.
- [x] **Three iOS preview builds cut**, the last of which (`55b80f8a`) is the one to install.
- [x] Verified green after each: tsc clean, **21 suites / 239 tests**, `expo export --platform ios`.

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
