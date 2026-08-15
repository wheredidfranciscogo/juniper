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
      config plugin and the EAS project are all in (`c3a4796`, `853c749`). Android
      development build cut. **One step left, and it needs a human:**
  - [ ] **Cut the iOS development build interactively.** EAS has to create the ad-hoc
        provisioning profile and distribution certificate, and it refuses to do that in
        `--non-interactive`. Your iPhone (UDID `00008150-…E9401C`) is already registered
        under team `62NSMDCDAD` from the Alchemilla work, and the Apple session is cached,
        so this should be a matter of confirming the prompts:
        ```
        cd juniper-app && npx eas build --profile development --platform ios
        ```
        Install the result, then run `npx expo start --dev-client --port 8082` and scan.
- [ ] **`src/lib/notifications.ts`** — port the shape of
      `alchemilla-app/src/lib/notifications.ts`: a rolling queue of one-shot local
      notifications, an idempotent `syncReminders()` that cancels all and reschedules, an
      Android channel, and a permission request that fires **post-onboarding**, never at launch.
      Juniper's difference: schedule **per plant**, keyed off `lastWatered + frequency`, rather
      than one daily nudge. Re-sync on: app focus, watering, adding a plant, editing a cadence,
      changing the reminder time.
- [ ] **Warm copy, never scolding** — "Marcel could use a drink." Not "You missed 3 waterings."
      No streaks, no red badges, no guilt. The design is calm; the notifications must match.
- [ ] **Deep-link the tap** — notification opens `plant/[id]` directly, not the tab root.
- [ ] **Reschedule on water** — tapping the `WaterButton` cancels that plant's pending
      reminder and queues the next one at `now + frequency`.
- [ ] **Test the scheduler as a pure function** — `nextWateringDate(plant, now)` and the queue
      builder should be RN-free and node-testable, the way Alchemilla's insight engine is.
      That is what makes a small test suite trustworthy.

### The screens that make the loop controllable

- [ ] **You tab** (`src/app/(tabs)/you.tsx`) — currently a stub. Archetype, stats card, and the
      settings that matter: notifications on/off, reminder time, and export.
- [ ] **Backup export** — one button, garden to JSON, straight to the share sheet
      (`expo-sharing`, already proven in Alchemilla). Cheap insurance against D2's one downside.
- [ ] **Real photos** — `expo-image-picker` is already a dependency. Capture to the app's
      document directory, store the URI on `PlantPhoto` (the field already exists), render on
      the timeline alongside the pressings.

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
