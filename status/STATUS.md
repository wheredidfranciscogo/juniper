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
(D1–D11) and wins over anything written here.

## 📌 Current phase

**Phase 1 — Useful. Code-complete; what remains needs a phone, not a keyboard.** Every feature
Phase 1 asked for is built and tested — the watering loop, reminders, the You tab, backup export
and import, real photographs, and as of 2026-08-30 the two things that were still blocking a real
garden from moving in: a plant's photograph becoming its picture, and being able to remove a plant.
21 suites / 239 tests, tsc clean, the iOS bundle builds.

What is left is not code. **The watering reminder — the reason the app exists — has still never
fired on real hardware.** Until it does, and until the app has carried a real garden for a fortnight,
Phase 1 is not done. Everything downstream (Maestro on the device, TestFlight, Play internal) waits
on that.

Progress against the (much smaller) Phase 1: ~92%.

## ✅ Recently done

### 2026-09-07 — The dependency audit, told accurately

`npm audit` reported **30 vulnerabilities (2 critical, 18 high, 9 moderate, 1 low)**; GitHub
reported 48 Dependabot alerts. Targeted `overrides` took that to **17 (0 critical, 9 high,
8 moderate)**. Both criticals — `shell-quote` and `tar` — are gone.

**The important correction is not the count.** The working assumption was that every one of these
was build-time tooling that never reaches the IPA. That was checked rather than believed, by
exporting the iOS bundle with source maps and reading the module list, and **it is not quite
true**. Of 1,722 modules in the shipped bundle, these vulnerable packages are among them:

| Ships | Advisory | Now |
|---|---|---|
| `nanoid/non-secure` | **HIGH** — generators can loop indefinitely on zero/negative size | **fixed**, 3.3.12 → 3.3.18 |
| `decode-uri-component` | MODERATE — DoS on malformed percent-encoded input | **not fixable**, see below |
| `query-string`, `@react-navigation/{core,native,elements,bottom-tabs,native-stack}`, `expo-router` | MODERATE, all derived from `decode-uri-component` | not fixable |

`nanoid` is reached from `@react-navigation/routers` and `expo-router`, which use it to mint route
keys; the exact file the advisory is about, `non-secure/index.js`, was in the bundle. Neither call
site passes an attacker-controlled size, so this was not exploitable — but "not exploitable" and
"not shipped" are different claims, and only the second one was being made.

Everything else — `tar`, `shell-quote`, `undici`, `ws`, `metro*`, `image-size`, `browserslist`,
`js-yaml`, `fast-uri`, `form-data`, `brace-expansion`, `postcss`, `@xmldom/xmldom`, `@babel/core`,
`@react-native/metro-config` — was confirmed **absent from the bundle**. The original framing holds
for those, and it holds because it was measured.

**What the remaining 17 are, and why they stay.** Two upstream dead ends, nothing else:

- **`image-size` (9 highs).** Its two advisories cover `<=2.0.2`, and 2.0.2 is the latest version
  published — there is no fixed release to move to. `metro` pins it, so `metro`, `metro-config`,
  `metro-transform-worker`, `@expo/metro`, `@expo/metro-config`, `@expo/cli`, `expo` and
  `@react-native/metro-config` all stay flagged as consequences of that one package. npm offers
  `expo@57` as the fix; that is a two-major SDK jump against D6, and it would still resolve a
  vulnerable `image-size`.
- **`decode-uri-component` (8 moderates).** 0.5.0 *is* outside the advisory range, but it is
  ESM-only with no `require` condition, and `query-string@7` is CommonJS and calls `require()` on
  it. Forcing it would break deep-link parsing in the shipped app to close a local DoS. Every
  `@react-navigation/core` release to date, up to 7.21.13, still pins `query-string@^7`.

Both are recorded in `package.json` next to the overrides so the next reader does not re-derive
them. Recheck on the SDK 55 bump.

**How the overrides are written.** Several of these packages are installed at three majors at once,
and only an in-major bump is API-safe — `brace-expansion@5` exports `{expand}` where `@1` exports
the function itself, so a blanket `^5` would have broken `minimatch@3` across the whole build
toolchain. The fix is npm's `"pkg@range": "version"` key form, pinning one line at a time:
`brace-expansion` at 1.1.18 / 2.1.4 / 5.0.9, `ws` at 6.2.6 / 7.5.13 / 8.21.3, `js-yaml` at
3.15.2 / 4.3.2.

Verified after: tsc clean, 21 suites / 239 tests, `expo export --platform ios` builds, and — because
`ws` sits under both Metro and the dev-client inspector — `expo start` was smoke-tested too: both
websocket endpoints complete a 101 handshake and the dev server serves a 1,073-module bundle.

### 2026-08-30 — The app stops performing and starts being usable

**The personality layer is gone** (`afe7898`), on the first feedback from a real phone: it
performed rather than being useful. Onboarding went from seven screens to two — your name, for the
greeting, and reminders, so watering nudges work from day one. The archetype ("The Plant Whisperer")
is deleted everywhere including the backup format, which now *ignores* rather than rejects an
archetype in an older file. The same pass retired "plant-days" (a number with no interpretation),
"temp: warm / any / cool" (configured nothing — replaced by `location`, which makes the Garden
indoor/outdoor filters work for the first time; nothing had ever set that value), and the pressing
picker (asked the user to name an illustration style; now derived from the plant's name). Filters
that match nothing are no longer rendered. Developer text — "Add EXPO_PUBLIC_PERENUAL_KEY to .env" —
removed from the species search, with a test asserting no screen names an env var. Recorded as
**DECISIONS.md D11: ask nothing that doesn't configure something.**

**A plant's photograph is now its picture** (`74a473d`). Photos were read *only* by the
detail-screen timeline — nowhere the plant itself appeared ever touched `photo.uri` — so the image
captured while adding a plant became visible nowhere. `src/lib/cover.ts` derives the cover, and
`Pressing` takes an optional `uri` and falls back to the herbarium illustration. The photo block
now also shows while *editing*, so a picture can be changed. This is the fourth instance of one
recurring shape in this codebase — `daysSinceWater`, `tendedDays`, the photo timeline, and now the
cover: **a field written and never consumed, invisible because the seed data was hand-tuned to look
right.** Worth watching for a fifth.

**Plants can be removed** (`1c45840`). There was no delete anywhere — no store action, no UI —
which blocked the whole point of the preview build. `removePlant` drops the plant *and its log
entries*, because an orphan entry renders as a row about nothing and `parseBackup` already treats
orphans as corrupt, so leaving them would break export round-tripping. Photo files are deleted by
the screen; the store never touches the filesystem.

**Three iOS preview builds cut.** The last, `55b80f8a`, carries all of the above and is the one to
install — **and it expires 2026-09-13.**

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
- The 16 npm audit warnings **as they stood in 2026-06** cleared via targeted overrides
  (`postcss`, `uuid`). This was true on the day and stopped being true immediately: advisories
  are published against versions you already have, so a clean audit is a reading, never a
  state. By 2026-09-07 the same tree reported 30. See that date below.

### Phase 1 foundations (2026-05)
- Expo SDK 54 scaffold; design tokens ported from the handoff; 28 line-art botanical icons
- `Pressing` herbarium placeholder; 7-step onboarding with archetype reveal
- Today / Garden / Log / Plant Detail at design fidelity; custom tab bar with clay FAB
- Signature `WaterButton` — Reanimated v4 ripple, clay→moss crossfade, selection haptic

## 🚧 Blocked / needs attention

Nothing is blocked on code. Three things are blocked on you.

- **⏳ The preview build expires 2026-09-13.** `55b80f8a` is the only installable copy carrying
  photo-covers and plant deletion. Ad-hoc internal builds die on a 14-day clock; after that a new
  one must be cut before Juniper can run on the phone at all. Open the build page **on the phone**,
  not the `.ipa`.
- **The watering reminder has never fired on real hardware.** Everything around it is tested;
  delivery itself is not. Turn reminders on, pick the next slot ahead of the current hour, and
  leave the phone alone.
- **Export the data once real plants are in.** Storage is on-device and nowhere else (D2), so an
  afternoon of typing has exactly one copy until you make a second.
- **GitHub Actions was last seen failing on billing, not on code** — a job ran one second with no
  steps, annotated with failed payments or a spending limit. Not re-verified since 2026-08-30, so
  CI cannot currently be trusted green *or* red. Settings → Billing & plans.
- **The Maestro flows have still never executed a single assertion.** Authored from on-screen text
  and unverified against a real build. Decision (2026-08-16): run them against the phone rather
  than fighting GitHub's emulator — `maestro test juniper-app/.maestro/`.
- **Two feedback items need eyes rather than code**: whether "Water Marcel" still reads off-centre
  (nothing found wrong in the code; may have been the card, since fixed), and whether the Today
  footer should report state — "you're caught up" — rather than count plants.
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
│       ├── data/seed.ts        ← ONE lived-in example plant for a fresh install
│       ├── lib/store.tsx       ← React Context + AsyncStorage. Permanent, not a stopgap.
│       ├── lib/                ← pure, RN-free, node-testable: watering · notifications ·
│       │                          stats · backup · photos · cover
│       ├── components/         ← icons, Pressing, WaterButton, Pill, LogFeed
│       └── app/                ← splash → (onboarding) → (tabs) + plant/[id] + add/
├── juniper-website/            ← four static files
├── juniper-design/
│   ├── DECISIONS.md            ← D1–D9. Read this first.
│   └── README.md               ← the fidelity handoff
└── status/                     ← PLAN.md · TASKS.md · STATUS.md · status.json
```

---
*Last updated: 2026-09-07 — caught the status files up to the 2026-08-30 work (photo-covers,
plant deletion, the personality strip) and flagged the build expiry.*
