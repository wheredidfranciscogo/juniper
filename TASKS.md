# Tasks — Testing & Phase-1 build

Tracking what's **done & pushed** vs. what **must be done locally** — steps
that need a device, emulator, or network access the remote Claude Code on the
web container doesn't have — before they can be verified and pushed.

## Done (pushed to origin)

### Testing & CI

- [x] Jest harness: `jest-expo` preset + React Native Testing Library
      (`jest.config.js`, `jest-setup.ts`).
- [x] Self-contained `react-native-reanimated` mock + `expo-haptics` and
      `expo-image-picker` stubs in `jest-setup.ts` (the bundled reanimated v4
      mock boots native worklets and crashes under Jest).
- [x] Added `babel-preset-expo` devDependency (was missing; required by
      Jest's babel transform and by app bundling).
- [x] npm scripts: `test`, `test:watch`, `test:ci`, `typecheck`.
- [x] Unit tests — `src/lib/log-utils`, `src/data/seed` (`pickArchetype` +
      seed integrity), `src/lib/store`, `src/lib/perenual`.
- [x] Component tests — `Pill`, `LogFeed`, `WaterButton`, `AddEdit` form.
- [x] Maestro E2E flow files authored —
      `.maestro/{onboarding,water-plant,navigate-tabs}.yaml`.
- [x] CI workflow `.github/workflows/ci.yml` — typecheck + tests on push/PR.
- [x] Manual E2E workflow `.github/workflows/e2e.yml` (Android emulator,
      `workflow_dispatch`).
- [x] `.gitignore` — ignore `/coverage` and `.env`.

### Task #11 — Add Plant

- [x] `expo-image-picker` (~17) installed.
- [x] `src/lib/perenual.ts` — species-list client + watering/sunlight mappers.
- [x] `src/lib/image-picker.ts` — thin wrapper around camera + library.
- [x] `PlantPhoto` extended with optional `uri` for user-captured photos.
- [x] `src/app/add/edit.tsx` — full form covering all three paths
      (photo → camera/library + manual form, search → Perenual results +
      manual form, manual → blank form). Save is gated on name + species,
      then calls `addPlant` and routes to `/(tabs)/garden`.
- [x] `.env.example` documenting `EXPO_PUBLIC_PERENUAL_KEY`.

Current state: 59 tests / 8 suites green, `tsc --noEmit` clean.

## Needs local implementation, then push

These can't be completed in the remote container — they need a simulator/
emulator, a native build, or network/API access that's blocked here.

### Task #11 follow-ups

- [ ] **Drop a Perenual key in `.env`** (gitignored) as
      `EXPO_PUBLIC_PERENUAL_KEY=...`. Without it the Search path renders a
      hint and falls through to the manual form.
- [ ] **Smoke the Add Plant flow** on a device once the key is set — verify
      camera/library permissions prompt as expected and search results map
      onto the form fields cleanly.

### Testing pyramid follow-ups

- [ ] **Set native app identifiers** in `app.json`: add
      `expo.android.package` (e.g. `com.jungle.app`) and
      `ios.bundleIdentifier`. Required before `expo prebuild` / `expo run:*`
      can produce a build for E2E.
- [ ] **Update Maestro `appId`** in all `.maestro/*.yaml` to match the built
      app's id (currently the placeholder `com.jungle.app`). For Expo Go
      testing instead, use `host.exp.Exponent`.
- [ ] **Run the Maestro flows against a real build** and fix any drift —
      `npx expo run:ios` (or `run:android`) then `maestro test .maestro/`.
      The flows are written from on-screen text but have never been executed.
- [ ] **Verify `e2e.yml` end-to-end** on GitHub Actions once the two items
      above are done (it's `workflow_dispatch`-only so it never blocks PRs).
- [ ] **ESLint config** — `npx expo lint` here failed to auto-create a config
      (the Expo API host is outside the container's network allowlist). Run
      it locally to generate `eslint.config.js`, then add a `lint` step to
      `ci.yml`.

## Notes / open questions

- [ ] **Expo version mismatch**: `AGENTS.md` says "read the v56.0.0 docs"
      but `package.json` pins Expo `~54.0.0`. Reconcile the instruction or
      the SDK.
- [ ] `package-lock.json` reports 16 moderate-severity audit warnings;
      decide whether to `npm audit fix`.
- [ ] The Phase 1 commit referenced `status/STATUS.md`, which was never
      committed — confirm whether that doc should live in the repo.

## Next likely tasks

- **Log tab full feed** — small lift; `LogFeed` already exists, just wire it.
- **Task #13 — Supabase migration** — the in-memory `StoreProvider` is
      marked Phase-1-only; replacing it with Supabase-backed hooks is the
      next architectural shift. The Claude Code MCP environment ships a
      Supabase server (projects, schema, migrations, edge functions).
