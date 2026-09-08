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

Two roots remain and are deliberately left: `image-size` (9 high) is pinned by `metro`, and
`decode-uri-component` (8 moderate) **has no patched release in existence**. The latter is the only
finding that reaches the app — `expo-router` parses deep links through `query-string@7` — and its
worst case is the app hanging on a hostile `juniper://` link until it is force-quit, with nothing
leaving the device (D2 holds). Both clear with Expo 57. Neither justifies a major SDK migration
with the preview build expiring 2026-09-13; take them when SDK 57 is wanted for its own sake.

**CI is alive, and the billing blocker is closed.** It had been unverifiable since 2026-08-30 —
last seen failing in one second with no steps, annotated with failed payments. It has now run
four times with real steps: passing at 1m32s and 1m48s, and *failing correctly* on the `npm ci`
error above. That is the evidence the blocker was waiting for, from both directions.

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
- All 16 npm audit warnings cleared via targeted overrides

### Phase 1 foundations (2026-05)
- Expo SDK 54 scaffold; design tokens ported from the handoff; 28 line-art botanical icons
- `Pressing` herbarium placeholder; 7-step onboarding with archetype reveal
- Today / Garden / Log / Plant Detail at design fidelity; custom tab bar with clay FAB
- Signature `WaterButton` — Reanimated v4 ripple, clay→moss crossfade, selection haptic

## 🚧 Blocked / needs attention

Nothing is blocked on code. Six things wait on you — the seventh, CI billing, is now closed.
(This line said "three" while listing seven for the last fortnight; corrected 2026-09-08.)

- **⏳ The preview build expires 2026-09-13.** `55b80f8a` is the only installable copy carrying
  photo-covers and plant deletion. Ad-hoc internal builds die on a 14-day clock; after that a new
  one must be cut before Juniper can run on the phone at all. Open the build page **on the phone**,
  not the `.ipa`.
- **The watering reminder has never fired on real hardware.** Everything around it is tested;
  delivery itself is not. Turn reminders on, pick the next slot ahead of the current hour, and
  leave the phone alone.
- **Export the data once real plants are in.** Storage is on-device and nowhere else (D2), so an
  afternoon of typing has exactly one copy until you make a second.
- ~~**GitHub Actions was last seen failing on billing, not on code.**~~ **Resolved 2026-09-07.**
  CI has now run four times with real steps — green at 1m32s and 1m48s, and red for a genuine
  `npm ci` failure. It can be trusted in both directions again.
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
*Last updated: 2026-09-08 — recorded the 2026-09-07 housekeeping: the racy You-reminders test
(PR #2) and the dependency audit pass (PR #3), and closed the CI-billing blocker now that CI has
been observed both green and correctly red.*
