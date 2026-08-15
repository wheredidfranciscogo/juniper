# Juniper — Status

Juniper is a calm plant-care app for iOS and Android that tells you when to water your plants
and gets out of the way. On-device, no account, no server.

One repo, three folders:

| Folder | Purpose | Stack |
|---|---|---|
| [`juniper-app/`](../juniper-app) | The product | Expo SDK 54 · TypeScript · expo-router v6 · Reanimated v4 · react-native-svg |
| [`juniper-website/`](../juniper-website) | Marketing site + privacy/terms | Static HTML on Vercel |
| [`juniper-design/`](../juniper-design) | Frozen design handoff + [`DECISIONS.md`](../juniper-design/DECISIONS.md) | Standalone React-in-browser prototype |

**Read [`DECISIONS.md`](../juniper-design/DECISIONS.md) first.** It holds the load-bearing calls
(D1–D9) and wins over anything written here.

## 📌 Current phase

**Phase 1 — Useful.** The app is further along than it looks: all the screens exist, the store
persists, 105 tests pass, and the bundle builds. What's missing is the thing the app is *for* —
the watering reminder. That's next, and it's the only item that stands between here and an app
worth keeping on a home screen.

Progress against the (much smaller) Phase 1: ~70%.

## ✅ Recently done

### 2026-08-15 — Replan + Phase 0 restructure

Juniper had reported `state: blocked` since 2026-05-25 on two `[!]` markers that git had
already resolved months earlier — the Phase 1 checkpoint was committed as `4bdb8f4` on 05-25,
and the post-onboarding red overlay was properly fixed in `c6b9419` by moving the onboarding
gate to `Stack.Protected`. Nobody flipped the markers, so the autonomous loop refused to
advance for eleven weeks while ~20 commits of real June work went unrecorded.

**Decision record written.** [`juniper-design/DECISIONS.md`](../juniper-design/DECISIONS.md),
D1–D9, modelled on Alchemilla's — which is the one mechanism Alchemilla had and Juniper didn't.
Headlines: native-only, no web app; on-device AsyncStorage with Supabase deleted from the plan;
no sync in v1 *and* no sync decision yet, because CloudKit doesn't transfer to Android; the
watering reminder is the product; Phase 3 social deleted entirely.

**Phase 0 restructure shipped** in three commits:
- `570d211` **One repo.** Three repos collapsed into one rooted at the wrapper folder, with
  `juniper-app`'s history preserved (87 renames detected, so `log --follow` still works).
  `juniper-design/` and `status/` are under version control for the first time. Folded in the
  stranded `app.json` / `package.json` edits that had sat uncommitted since June, and removed
  the stray `hyperlocal/` spillover.
- `bf0f3ff` **Static website.** The Next.js tracker in `juniper-website/` replaced with four
  static files — landing, privacy, terms, stylesheet — deployed from the repo root via
  `vercel.json`. Palette copied verbatim from `src/theme/tokens.ts` so the two can't drift.
  The privacy policy is written to be true rather than boilerplate, including an honest
  disclosure of the one outbound call the app can make (optional Perenual species search).
- `2e230f0` **Rename + web target dropped.** Bundle IDs to `com.wheredidfranciscogo.juniper`
  before the first EAS build, since identifiers are effectively permanent afterwards. The
  splash screen was still rendering "Jungle Jungle" — this doc claimed for months that it said
  Juniper. Web target removed from `app.json`, `package.json` and CI.

**CI was silently dead and is now fixed.** `.github/` lived inside `juniper-app/`; GitHub only
reads workflows from the repository root, so the collapse disabled it. Moved to the root with
`working-directory: juniper-app`, and the bundle check swapped from `--platform web` to
`--platform ios`.

### Earlier (2026-06, unrecorded until now)
- Add Plant flow, all three paths (photo / Perenual search / manual) — PR #3
- Routing fixed for real via `Stack.Protected`; route-gate test added
- AsyncStorage persistence — the app survives a reload
- Log tab wired, Plant Detail edit affordance
- Test pyramid: 12 suites / 105 tests, Maestro flows authored, CI on push and PR
- All 16 npm audit warnings cleared via targeted overrides

### Phase 1 foundations (2026-05)
- Expo SDK 54 scaffold; design tokens ported from the handoff; 28 line-art botanical icons
- `Pressing` herbarium placeholder; 7-step onboarding with archetype reveal
- Today / Garden / Log / Plant Detail at design fidelity; custom tab bar with clay FAB
- Signature `WaterButton` — Reanimated v4 ripple, clay→moss crossfade, selection haptic

## 🚧 Blocked / needs attention

- **Nothing is blocked.** Both stale `[!]` markers were cleared on 2026-08-15.
- **The Maestro flows have never been executed.** They were authored from on-screen text and
  are unverified against a real build. Their `appId` is now correct, so they're runnable.
- **Notifications can't be trusted in Expo Go.** An EAS development build is a prerequisite for
  the next task, not an afterthought — see D6.
- **Website placeholders**: support address, legal entity and jurisdiction are flagged in-page
  and must be resolved before public release.

## 💬 Notes

- **Stack**: Expo SDK 54 managed, TypeScript, expo-router v6, Reanimated v4, react-native-svg.
  React Context + AsyncStorage for state. Bundle id `com.wheredidfranciscogo.juniper`.
- **No custom native modules.** Every dependency is Expo SDK, so Expo Go stays viable for
  screen work far longer than it did for Alchemilla — which had to leave the day RevenueCat
  landed. The dev build is needed for notifications, not for the app in general.
- **Dev-server port**: `juniper-app` runs on `--port 8082`; 8081 is held by `hyperlocal-app`.
- **The design handoff is the fidelity source of truth.** Divergence in the Expo build is a bug,
  not a creative choice. The prototype files themselves still carry the pre-rename wordmark;
  that's a frozen artefact, not a live contradiction.

### Key files

```
juniper-project/
├── .github/workflows/          ← CI (must live here, not in juniper-app/)
├── juniper-app/
│   └── src/
│       ├── theme/tokens.ts     ← design tokens; the website copies these
│       ├── data/seed.ts        ← demo garden for a fresh install
│       ├── lib/store.tsx       ← React Context + AsyncStorage. Permanent, not a stopgap.
│       ├── components/         ← icons, Pressing, WaterButton, Pill, LogFeed
│       └── app/                ← splash → (onboarding) → (tabs) + plant/[id] + add/
├── juniper-website/            ← four static files
├── juniper-design/
│   ├── DECISIONS.md            ← D1–D9. Read this first.
│   └── README.md               ← the fidelity handoff
└── status/                     ← PLAN.md · TASKS.md · STATUS.md · status.json
```

---
*Last updated: 2026-08-15 — replan + Phase 0 restructure.*
