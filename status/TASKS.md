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

## Phase 0 — Restructure (one pass, then never again)

Setting Juniper up the way Alchemilla is set up. Nothing else starts until this lands.

- [ ] **Collapse to one repo** (D4). Make `juniper-project/` the git root at
      `github.com/wheredidfranciscogo/juniper`, preserving `juniper-app`'s history as the
      base. Bring `juniper-design/` and `status/` under version control for the first time.
      Archive the old standalone `juniper-app` repo.
- [ ] **Commit the stranded working-tree edits** in `juniper-app`: `app.json` bundle
      identifiers and the `package.json` `expo run:*` script switch. They've been sitting
      uncommitted since June.
- [ ] **Remove the stray `juniper-app/hyperlocal/` folder** — untracked spillover from the
      other project that shares the dev-server port. Three files, none of them Juniper's.
- [ ] **Replace the website with static HTML** (D5). Delete the Next.js tracker from
      `juniper-website/`; write `index.html`, `privacy.html`, `terms.html`, `styles.css`.
      Add root `vercel.json` with `outputDirectory: "juniper-website"`. The old tracker stays
      archived at `github.com/…/jungle-jungle` — nothing is lost.
- [ ] **Finish the rename** (D9). `com.wheredidfranciscogo.juniper`, scheme `juniper`,
      Maestro `appId`, and every remaining "jungle" in copy and config. **Do not touch the
      AsyncStorage key `@juniper/store`** — it is user-data-bearing and already correct.
- [ ] **Strip the web target** (D1). Drop `react-native-web` and `react-dom`; remove the
      `web` block from `app.json` and the `web` npm script. Note: CI currently uses
      `expo export --platform web` as a bundle check — swap it for `--platform ios`.
- [ ] **Delete Supabase from the codebase and docs** (D2). No `supabase.ts` exists yet, so
      this is comments and plan references only — including the `schema.sql`-style leftovers
      and any "replace with Supabase-backed hooks" notes in `src/lib/store.tsx`.

## Phase 1 — Useful

### The loop (D7 — this is the product)

- [ ] **EAS setup first** (D6). Add `eas.json` (development / preview / production, copied
      from Alchemilla), set bundle identifiers, and cut a **development build**. Notifications
      cannot be trusted in Expo Go — build the dev client *before* writing the scheduler, not
      after debugging phantom failures.
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

- [x] **2026-08-15 — Plan rewritten against a decision record.** `juniper-design/DECISIONS.md`
      created (D1–D9); PLAN.md and this file rewritten to match. Supabase cut, web app cut,
      Phase 3 deleted, notifications promoted to the front of the queue.
- [x] **Both stale `[!]` blockers cleared.** The Phase 1 checkpoint commit and the
      post-onboarding red overlay were both resolved in git back in May/June; the markers were
      never flipped, which is why the loop reported `blocked` for eleven weeks.
