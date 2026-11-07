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
      **iOS preview build `4bc720fe` is the one to use** — cut 2026-09-09 from `687ce5b`
      (`main`), standalone with the JS embedded, so no Metro and no laptop and it can be
      lived with. Install by opening the build page ON THE PHONE:
      https://expo.dev/accounts/wheredidfranciscogo/projects/juniper/builds/4bc720fe-fe92-43e4-be66-01299573ba12
      (Ad-hoc internal distribution; the provisioning profile from the dev build already
      covers the registered iPhone and is valid to June 2027, which is why this cut
      without any interactive credential setup.)

      **☠️ `4bc720fe` EXPIRED 2026-09-23 AND WAS NEVER REPLACED.** As of 2026-11-07 there is
      **no installable copy of Juniper at all**, and no build has ever contained the grid.
      Ad-hoc internal builds die on a 14-day clock, so this stops being a recurring chore
      only once the app is genuinely being lived with. Cutting one is the gate on every
      remaining item:
      ```
      cd juniper-app && eas build --platform ios --profile preview
      ```

      Earlier previews `55b80f8a` (2026-08-30, expired 2026-09-13), `9fb83381` and `ff9faed1`
      are dead. Product-wise `4bc720fe` is the same app as `55b80f8a` — everything merged
      since is dependency overrides, tests and docs, none of which reach the bundle. Its
      fingerprint `3dccf87f` matches all three earlier previews, which is the check that the
      native config did not drift.

      Also superseded: Android dev builds #1–#3 and the iOS *development* build. A
      development build is a shell that loads JS from Metro — useful for fast refresh,
      useless away from the desk.

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


### The grid (D12 — the garden you can read at a glance)

- [x] **The Garden is a grid of squares.** Each plant is one square: its photograph matted on
      a coloured mount that drifts `mossSoft → dried` across the plant's own cadence, so one
      glance reports every plant with nothing to read. **Replaced both Today and the filtered
      Garden list**, which are deleted; three tabs now, not four, with an invisible spacer in
      the tab bar keeping the fixed-width FAB on the centre line.
      Built because the project sat untouched 2026-09-09 → 2026-11-07 while the build expired
      unused. The app had solved the problem on paper and did not pull anyone back.
- [x] **`src/lib/dryness.ts`** — pure, RN-free, node-testable. `dryness` (0 = watered today,
      1 = due), `drynessStage`, `drynessLabel`, `byThirst`. Derived from `daysSinceWatered`, so
      it inherits that module's calendar-day arithmetic and cannot be shifted by daylight
      saving. **The ramp holds at 1**: a plant three days late is indistinguishable from one
      due today. Guards a zero and a negative cadence, and treats an unparseable timestamp as
      *watered* rather than due — better to under-report than to claim a plant needs water on
      no evidence. 15 tests.
- [x] **Watering from the square**, without opening the plant — the point of an ambient view.
      Turns to a tick and refuses further taps once watered today, so a day cannot collect two
      waterings. The colour is the feedback.
- [x] **The peek** — tapping a square expands it in place, animating out of the tile's own
      measured rect. **The rect is cached, not measured on press**: `measureInWindow` answers
      through a bridge round-trip, so waiting on it would put a frame of nothing between the
      tap and the response. A null cache is a supported input and falls back to a centre
      scale-up. Re-cached on layout and whenever the grid settles after a scroll.
- [x] **`src/lib/haptics.ts`** — one place, because the right call differs by platform. The
      SDK 54 docs are explicit that `impactAsync` is *simulated* on Android via the Vibrator
      service and recommend `performAndroidHapticsAsync` instead, which has no iOS equivalent.
- [x] **No filters, and colour is never the only signal.** "Thirsty" was the only filter
      anyone wanted and the grid answers it before you could tap a chip. Every square speaks
      its state ("Marcel, 3 days to go"), because a grid encoding its only information as hue
      is no interface to a colourblind or screen-reader user. 13 screen tests.
- [x] **Every Maestro flow was dead, and had been since August.** `onboarding.yaml` still drove
      the five personality questions and the archetype reveal deleted in `afe7898`; since every
      other flow begins `runFlow: onboarding.yaml`, **the whole suite had been failing at its
      second step for about three months.** `you-tab.yaml` asserted "YOU ARE", "The Plant
      Whisperer", "PLANT-DAYS" and "6 plants" — none of which exist. Nobody learned any of it
      because the flows have never been executed: an unrun suite rots into fiction and still
      looks like coverage. All five rewritten against strings read out of the current source.
      **A rewrite is not a run — they remain unverified.**

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
      flat in the hand. **The grid (D12) adds a whole screen of unvalidated surface**: whether
      the colour drift reads at a glance, whether the mat is the right weight, whether a 26pt
      drop inside a ~100pt square is a comfortable target, and whether watering from a square
      is satisfying enough to want to do daily.
- [~] **Run the Maestro flows against a real build.** Five flows (`onboarding`,
      `navigate-tabs`, `water-plant`, `you-tab`, `add-plant`). **Still never executed a single
      assertion**, and on 2026-11-07 all five were found to have been **dead since August** —
      this file previously claimed they were "audited against the current screens", which was
      not true: `onboarding.yaml` still drove the five personality questions deleted in
      `afe7898`, and every other flow runs it first, so the suite failed at its second step.
      Rewritten against strings read out of the current source, but **a rewrite is not a run.**
      Decision from 2026-08-16 stands: stop trying to make GitHub's emulator cooperate and run
      them on the phone — `maestro test .maestro/` against a real device takes about a minute.
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

### 2026-09-09 — A preview build that does not expire on Sunday

- [x] **Cut iOS preview build `4bc720fe`** from `687ce5b` (`main`), replacing `55b80f8a` two days
      before it expired. Ad-hoc internal distribution, 5 minutes, no interactive credential setup —
      the provisioning profile from the dev build still covers the registered iPhone and runs to
      June 2027. **Expires 2026-09-23**, so this is a recurring cost until the app is actually
      lived with, not a task that closes.
      https://expo.dev/accounts/wheredidfranciscogo/projects/juniper/builds/4bc720fe-fe92-43e4-be66-01299573ba12
- [x] **Confirmed the native config had not drifted**: fingerprint `3dccf87f`, identical to all
      three earlier previews. Product-wise this build is the same app as `55b80f8a` — everything
      merged since (#2–#6) is dependency overrides, tests and docs, none of which reach the bundle.
- [x] **Repointed the docs at it.** Twelve references across STATUS.md, TASKS.md, PLAN.md and
      status.json still named the expiring build; leaving them would have recreated exactly the
      stale-claim problem this run started with.

### 2026-09-07 — Housekeeping: a flaky test and the dependency backlog

- [x] **The racy `You — reminders` test is fixed** (`4f1cb49`, PR #2). Failed ~1 run in 6 under a
      full parallel `npx jest`, passed alone. **The reported cause was wrong**, which is worth
      keeping: moving the `scheduleNotificationAsync` assertion inside the `waitFor` made it
      *worse* (4 failures in 10), because `waitFor` polls for a second and still saw zero calls —
      the call genuinely never happened. Real cause is upstream of the toggle: `syncReminders`
      returns early without scheduling for an empty garden, and `mount()` only waited for the
      static `YOUR GARDEN` overline, so under load the toggle was flipped before the seed effect
      landed. One line — wait for the `1 plant` stat — fixes it, and restores what the test is
      *for*: as written it could have passed against an empty garden, exactly the case where
      scheduling nothing is correct.
- [x] **Audit backlog: 30 findings → 17, both criticals cleared** (`2e8685e`, PR #3), via targeted
      `overrides` in `package.json`. Each live major line pinned separately so nothing crosses a
      boundary — `ws` 6/7/8, `js-yaml` 3/4, `brace-expansion` 1/2/5, `@xmldom/xmldom` 0.8/0.9.
      GitHub's 48-alert headline overstates the exposure: it reads the lockfile without knowing
      this app's runtime is a bundled JS blob, and nearly every finding is build tooling that
      never reaches a phone.
- [x] **`npm audit fix` tried, then backed out — read this before reaching for it again.** It
      looked strictly better (30 → 16, `package.json` untouched) but re-resolved whole subtrees
      and pulled **26 Expo 56/57 packages into this Expo 54 app**, including a second `expo`
      nested inside `expo` carrying `@expo/cli@57.0.22`. `tsc`, all 239 tests, *and* `expo export`
      for both platforms passed on that tree, because the hoisted 54 paths still won for the
      bundle. **Only `npm ci` caught it.** Run `npm ci` — not `npm install` — before pushing any
      lockfile change; it is what CI runs and the only check that sees this class of problem.
- [x] **CI billing blocker closed.** Unverifiable since 2026-08-30 (a job that ran one second
      with no steps, annotated with failed payments). Now observed four times with real steps:
      green at 1m32s and 1m48s, and correctly red on the `npm ci` failure above.

Left deliberately: `image-size` (9 high, pinned by `metro`) and `decode-uri-component`
(8 moderate, **no patched release exists**). Both clear only with Expo 57.
`decode-uri-component` is the one finding that reaches the app — `expo-router` parses deep links
through `query-string@7` — and its worst case is the app hanging on a hostile `juniper://` link
until force-quit, with nothing leaving the device. Not worth a major SDK migration before the
build expiry; take them when SDK 57 is wanted for its own sake.

### 2026-08-30 — The app becomes usable with a real garden

- [x] **Personality layer stripped** (`afe7898`), on the first feedback from a real phone.
      Onboarding seven screens → two; the archetype deleted everywhere including the backup
      format; "plant-days", "temp" and the pressing picker all retired for configuring nothing;
      `location` added so the indoor/outdoor filters work for the first time; filters that match
      nothing no longer rendered; developer text removed from the species search. Recorded as
      **DECISIONS.md D11 — ask nothing that doesn't configure something.**
- [x] **A plant's photograph became its picture** (`74a473d`) and **plants can be removed**
      (`1c45840`) — the two things standing between the app and a real garden. Detail above.
- [x] **Three iOS preview builds cut**, the last of which (`55b80f8a`) was the one to install
      until it expired on 2026-09-13. Superseded by `4bc720fe`.
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
