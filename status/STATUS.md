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
(D1–D12) and wins over anything written here.

## 📌 Current phase

**Phase 1 — Useful. The app is built; it has never been lived with.** Every feature Phase 1
asked for exists and is tested: the watering loop, reminders, the You tab, backup export and
import, real photographs, plant deletion. 22 suites / 261 tests, tsc clean, the iOS bundle
builds.

**And it sat untouched for two months.** Nothing was committed between 2026-09-09 and
2026-11-07; the preview build expired unused on 2026-09-23 and the watering reminder still
has never fired on real hardware. The app had solved the problem on paper and did not pull
anyone back — which is the finding that produced **D12**: the Garden is now a grid of squares
that drift from watered to dry, replacing both Today and the Garden list. A list has to be
read; a grid is just *seen*.

What is left is not code. There is no installable copy of Juniper right now, and the grid is
entirely unvalidated by use.

Progress against the (much smaller) Phase 1: ~94%.

## ✅ Recently done

### 2026-09-07 — A flaky test and the dependency backlog

Housekeeping, but both items turned on the same lesson: **a green test suite was not evidence
of what it looked like evidence of.**

**The You-reminders test was racy and is now fixed** (`4f1cb49`, PR #2). It failed roughly one
run in six under a full parallel `npx jest` and passed alone. The reported cause — that the
`scheduleNotificationAsync` assertion ran a tick before the scheduling settled — was wrong, and
worth recording as wrong: moving that assertion inside the `waitFor` made the flake *worse*
(4 failures in 10), because `waitFor` polls for a second and still saw zero calls. In the failing
runs the call genuinely never happened. The real cause sits upstream of the toggle: `syncReminders`
returns early without scheduling when the garden is empty, and `mount()` only waited for the static
`YOUR GARDEN` overline, which renders whether or not a plant exists. The seed adds Marcel in an
effect, so under load the toggle was flipped against an empty store. One added line — wait for the
`1 plant` stat, as the neighbouring tests already do — fixes it, and also restores what the test is
*for*: as written it could have passed against an empty garden, which is exactly the case where
scheduling nothing is correct.

**The audit backlog is down from 30 findings to 17, both criticals gone** (`2e8685e`, PR #3), via
targeted `overrides`. GitHub was reporting 48 alerts; that number overstates the exposure badly,
because it reads the lockfile without knowing that this app's runtime is a bundled JS blob rather
than a Node process. Nearly every finding is build tooling — `@expo/cli`, `metro`, `babel`, `jest`,
`react-devtools-core` — that runs here and in CI and never reaches a phone. Both criticals were of
that kind (`shell-quote` under `react-devtools-core`, `tar` under `@expo/cli`).

**`npm audit fix` was tried first and had to be backed out**, which is the part worth remembering.
It looked strictly better — 30 → 16 with `package.json` untouched — but it re-resolved whole
subtrees and pulled **26 Expo 56/57 packages into this Expo 54 app**, including a second `expo`
nested inside `expo` carrying `@expo/cli@57.0.22`. `tsc`, all 239 tests, and `expo export` for both
platforms passed on that contaminated tree, because the hoisted 54 paths still won when Metro built
the bundle. **Only `npm ci` caught it**, refusing the lockfile as out of sync — which is what CI
runs and what local `npm install` had papered over. Overrides are surgical by comparison: npm can't
re-resolve around them, and the result was a 286-line lockfile diff instead of 5,208, with zero
56/57 `@expo` packages left in the tree. Where several major lines are live, each is pinned
separately — `ws` 6/7/8, `js-yaml` 3/4, `brace-expansion` 1/2/5, `@xmldom/xmldom` 0.8/0.9.

**Which findings reach the phone is now measured rather than inferred.** "It's build tooling" was
the right instinct and the wrong evidence — it reads package names, and package names are not a
module graph. The check that settles it is `npx expo export --platform ios --source-maps`, then
reading the `sources` array of the emitted `.hbc.map`: that is the shipped module list, 1,722
entries, and a package is either in it or it is not. Against the current tree:

| | Packages |
|---|---|
| **In the bundle** | `expo-router` · `@react-navigation/{core,elements,native,bottom-tabs,native-stack}` · `query-string` · `decode-uri-component` · `nanoid` |
| **Not in the bundle** | `tar` · `shell-quote` · `undici` · `ws` · `metro` · `metro-config` · `metro-transform-worker` · `@expo/metro` · `@expo/metro-config` · `@react-native/metro-config` · `image-size` · `browserslist` · `js-yaml` · `fast-uri` · `form-data` · `brace-expansion` · `postcss` · `@xmldom/xmldom` · `@babel/core` |

Two entries need their fine print. `@expo/cli` appears in the bundle as exactly one file —
`build/metro-require/require.js`, the Metro require shim — which is not where any of its advisories
live; the CVE surface of `@expo/cli` is build-time as assumed. And **`nanoid` shipped**: it is
reached from `@react-navigation/routers` and `expo-router`, which mint route keys with it, and the
file in the bundle is `non-secure/index.js` — the exact file its HIGH is about. Neither call site
passes an attacker-controlled size, so it was never exploitable, and the `^3.3.18` override closes
it regardless. It is recorded because *not exploitable* and *not shipped* are different claims, and
the second one would have been wrong.

The reusable part is the method, not the table: on the SDK 55 bump, re-run the export and re-read
the list rather than re-reasoning about which packages look like tooling.

Two roots remain and are deliberately left: `image-size` (9 high) is pinned by `metro`, and
`decode-uri-component` (8 moderate) **has no patched release in existence**. The latter is the only
finding that reaches the app — `expo-router` parses deep links through `query-string@7` — and its
worst case is the app hanging on a hostile `juniper://` link until it is force-quit, with nothing
leaving the device (D2 holds). Both clear with Expo 57. Neither justifies a major SDK migration
with a preview build on a 14-day clock; take them when SDK 57 is wanted for its own sake.

**CI is alive, and the billing blocker is closed.** It had been unverifiable since 2026-08-30 —
last seen failing in one second with no steps, annotated with failed payments. It has now run
four times with real steps: passing at 1m32s and 1m48s, and *failing correctly* on the `npm ci`
error above. That is the evidence the blocker was waiting for, from both directions.

### 2026-11-07 — The garden becomes a grid

**Why this happened at all.** Two months of silence in the git log. The user's read of it:
*"at the end of the day people stay in the webapps because is fun and resolved a problem,
otherwise people would use pen and paper for it."* Correct, and the gap is the evidence.

**The Garden is now a grid** (**D12**). Every plant is one square — its photograph matted on
a coloured mount that drifts `mossSoft → dried` across the plant's own cadence. One glance
reports every plant with nothing to read. The drop in a square's corner waters it without
leaving the screen; tapping a square expands it in place, and the full record (photo
timeline, per-plant log, editing) stays one tap further in. **Today and the filtered Garden
list are deleted**; three tabs now, not four.

**The ramp holds at 1.** A plant three days late looks identical to one due today — the
colour saturates at `dried` and stops. No streaks, no badges, no counting how late you are;
a streak would punish a weekend away, and the plant does not care. Enforced by
`dryness.test.ts`, not just intended. **This is not a reversal of D11:** D11 cut decoration
that configured nothing, this adds reward for the thing you actually do.

**Colour is never the only signal.** Every square speaks its state — "Marcel, 3 days to go" —
because a grid encoding its only information as hue is no interface at all to a colourblind
or screen-reader user.

New pure modules: `src/lib/dryness.ts` (15 tests) and `src/lib/haptics.ts`, which takes the
Android-native `performAndroidHapticsAsync` path the SDK 54 docs recommend over the simulated
Vibrator one.

**Separate finding: every Maestro flow was dead, and had been since August.**
`onboarding.yaml` still drove the five personality questions and the archetype reveal deleted
in `afe7898` — and since every other flow begins `runFlow: onboarding.yaml`, the whole suite
had been failing at its second step for about three months. `you-tab.yaml` asserted "YOU ARE",
"The Plant Whisperer", "PLANT-DAYS" and "6 plants", none of which exist. **Nobody learned any
of this because the flows have still never been executed** — which is precisely the cost of
an unrun test suite: it rots into fiction and still looks like coverage. All five rewritten
against strings read out of the current source. A rewrite is not a run; they remain unverified.

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

**Three iOS preview builds cut.** The last, `55b80f8a`, carried all of the above. It expired
2026-09-13 and is superseded by `4bc720fe` (2026-09-09), which is product-identical.

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

Nothing is blocked on code. Everything is blocked on a phone.

- **There is no installable copy of Juniper.** The last preview build expired 2026-09-23 and
  nothing has been cut since, so the grid exists only in this repository. This is the gate on
  every item below: `eas build --platform ios --profile preview` from `juniper-app`.
- **The grid is unvalidated by use.** Whether the drift reads at a glance, whether the mat is
  the right weight, and whether watering from a square is satisfying enough to do daily are
  questions only a real garden on a real phone can answer. They cannot be reasoned out.
- **The watering reminder has never fired on real hardware.** Everything around it is tested;
  delivery itself is not.
- **The Maestro suite has still never executed a single assertion.** All five flows were found
  dead and rewritten on 2026-11-07, which fixes the fiction but proves nothing:
  `brew install maestro && maestro test juniper-app/.maestro/`. Expect failures.
- **Export the data once real plants are in.** Storage is on-device and nowhere else (D2).
- **GitHub Actions was last seen failing on billing, not code** — not re-verified since
  2026-08-30, so CI cannot be trusted green *or* red. Settings → Billing & plans.
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
│       ├── lib/                ← pure, RN-free, node-testable: watering · dryness ·
│       │                          notifications · stats · backup · photos · cover
│       ├── components/         ← icons, Pressing, WaterButton, Pill, LogFeed
│       └── app/                ← splash → (onboarding) → (tabs) + plant/[id] + add/
├── juniper-website/            ← four static files
├── juniper-design/
│   ├── DECISIONS.md            ← D1–D9. Read this first.
│   └── README.md               ← the fidelity handoff
└── status/                     ← PLAN.md · TASKS.md · STATUS.md · status.json
```

---
*Last updated: 2026-11-07 — the Garden became a grid (D12), and every Maestro flow was
found dead and rewritten.*
