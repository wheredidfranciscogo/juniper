# Tasks — Testing & CI

Tracking for the testing work started on branch `claude/app-status-check-htqgv`.
Split into what's **done & pushed** (completed in the Claude Code on-the-web
container) vs. what **must be done locally** — steps that need a device,
emulator, or network access the remote container doesn't have — before they
can be verified and pushed.

## Done (pushed to origin)

- [x] Jest harness: `jest-expo` preset + React Native Testing Library
      (`jest.config.js`, `jest-setup.ts`).
- [x] Self-contained `react-native-reanimated` mock + `expo-haptics` stub in
      `jest-setup.ts` (the bundled reanimated v4 mock boots native worklets and
      crashes under Jest).
- [x] Added `babel-preset-expo` devDependency (was missing; required by Jest's
      babel transform and by app bundling).
- [x] npm scripts: `test`, `test:watch`, `test:ci`, `typecheck`.
- [x] Unit tests — `src/lib/log-utils`, `src/data/seed` (`pickArchetype` +
      seed integrity), `src/lib/store` (reducer actions).
- [x] Component tests — `Pill`, `LogFeed`, `WaterButton`.
- [x] Maestro E2E flow files authored — `.maestro/{onboarding,water-plant,navigate-tabs}.yaml`.
- [x] CI workflow `.github/workflows/ci.yml` — typecheck + tests on push/PR.
- [x] Manual E2E workflow `.github/workflows/e2e.yml` (Android emulator, `workflow_dispatch`).
- [x] `.gitignore` — ignore `/coverage`.

Current state: 44 tests / 6 suites green, `tsc --noEmit` clean, logic modules
at 100% coverage (~42% overall; the gap is screen UI, covered by E2E).

## Needs local implementation, then push

These can't be completed in the remote container — they need a simulator/
emulator, a native build, or network access that's blocked here.

- [ ] **Set native app identifiers** in `app.json`: add `expo.android.package`
      (e.g. `com.jungle.app`) and `ios.bundleIdentifier`. Required before
      `expo prebuild` / `expo run:*` can produce a build for E2E.
- [ ] **Update Maestro `appId`** in all `.maestro/*.yaml` to match the built
      app's id (currently the placeholder `com.jungle.app`). For Expo Go
      testing instead, use `host.exp.Exponent`.
- [ ] **Run the Maestro flows against a real build** and fix any drift —
      `npx expo run:ios` (or `run:android`) then `maestro test .maestro/`.
      The flows are written from on-screen text but have never been executed.
- [ ] **Verify `e2e.yml` end-to-end** on GitHub Actions once the two items
      above are done (it's `workflow_dispatch`-only so it never blocks PRs).
- [ ] **ESLint config** — `npx expo lint` here failed to auto-create a config
      (the Expo API host is outside the container's network allowlist). Run it
      locally to generate `eslint.config.js`, then add a `lint` step to
      `ci.yml`.

## Notes / open questions (not testing, surfaced during the status check)

- [ ] **Expo version mismatch**: `AGENTS.md` says "read the v56.0.0 docs" but
      `package.json` pins Expo `~54.0.0`. Reconcile the instruction or the SDK.
- [ ] `package-lock.json` reports 16 moderate-severity audit warnings; decide
      whether to `npm audit fix`.
- [ ] The Phase 1 commit referenced `status/STATUS.md`, which was never
      committed — confirm whether that doc should live in the repo.
