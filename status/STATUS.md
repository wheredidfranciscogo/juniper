# Juniper — Project Status

Juniper is the calm, herbarium-aesthetic plant-care app being built native-first in Expo, with a Next.js marketing site alongside it. The project lives at `/Volumes/PRIMO/Projects/juniper-project/` and follows the standard wrapper-folder pattern — three sub-folders, one shared status doc. See [PLAN.md](PLAN.md) for the phase map.

| Sub-folder | Purpose | Stack |
|---|---|---|
| [`juniper-app/`](../juniper-app) | The product app | Expo SDK 54 + TypeScript + expo-router v6 + Reanimated v4 + react-native-svg |
| [`juniper-website/`](../juniper-website) | Marketing / public site (being repurposed from the old Next.js plant tracker) | Next.js + Tailwind + shadcn/ui + Supabase |
| [`juniper-design/`](../juniper-design) | Design handoff — prototype, tokens, icon set, copy | Standalone React-in-browser JSX |

## 📌 Current Phase

- **App**: **Phase 1 — Utility**, mid-implementation. Foundation, navigation, three main screens, and the signature watering animation are in place and `tsc --noEmit` is clean. As of 2026-05-25 the Phase 1 work is now also **committed and pushed to `origin/master` at `github.com/wheredidfranciscogo/juniper-app`** (commit `4bdb8f4`), so the working tree is no longer a single point of failure. Three screens remain (Add edit form, Log feed, You tab) before the in-memory phase is feature-complete; Supabase persistence + Expo Notifications close out the phase.
- **Website**: pre-repurpose. The folder is the old `jungle-jungle` Next.js plant tracker (auth, plants, today/garden/log against Supabase). It needs a deliberate pass to become the *marketing* site for the mobile app — copy, routes, redirects, wordmark — once the app is established as the source of truth. Note that this repo is still being actively developed on `origin/main` (matrix garden view, list-view restore, dependabot bumps) — local `main` is now **8 commits behind**.
- **Design**: handoff frozen at high fidelity. No active work; the Expo build references it as source of truth.

## ✅ Recently Done

### Phase 1 checkpoint persisted (2026-05-25)
- **Phase 1 — Utility checkpoint committed and pushed.** Commit [`4bdb8f4`](https://github.com/wheredidfranciscogo/juniper-app/commit/4bdb8f4) lands the entire in-progress Phase 1 implementation on `juniper-app/master` and pushes to a fresh GitHub remote at `github.com/wheredidfranciscogo/juniper-app`. Working tree is now clean and up-to-date with `origin/master`. The commit message catalogues exactly what's included (tokens, 28 line-art icons, `Pressing` herbarium placeholder, 7-step onboarding, Today/Garden/Plant Detail screens, custom tab bar with FAB, React Context store with seed data, signature `WaterButton` with Reanimated v4 ripple + crossfade, `LogFeed` + `Pill` primitives, `babel.config.js` with `react-native-worklets/plugin`) and notes the `create-expo-app` scaffold files removed in the process (themed-text/view, app-tabs, animated-icon, external-link, hint-row, explore, theme.ts, global.css, use-color-scheme/use-theme hooks). This closes the first of the two `[!]` hard blockers in TASKS.md — the marker itself still needs flipping by hand (see Blocked).

### Dev-loop fixes (2026-05-24, evening)
- **Reanimated v4 babel plugin wired up.** Added [`juniper-app/babel.config.js`](../juniper-app/babel.config.js) with `babel-preset-expo` + `react-native-worklets/plugin` (must be **last**). Before this, every Reanimated import in [`WaterButton.tsx`](../juniper-app/src/components/WaterButton.tsx) threw `Exception in HostFunction: <unknown>` at app boot because the worklets runtime couldn't bind. Root cause: Reanimated v4 split worklets into a separate `react-native-worklets` package and moved the babel plugin from `react-native-reanimated/plugin` → `react-native-worklets/plugin`. Restarted Metro with `npx expo start --clear` so the cached bundle picked up the new transform.
- **Dev-server port convention while Hyperlocal is also running.** `juniper-app` runs on `--port 8082` because port 8081 is held by the `hyperlocal-app` dev server. Launch with `cd juniper-app && npx expo start --port 8082`; phone connects via `exp://192.168.1.105:8082` in App Store Expo Go.

### Project shape (2026-05-24)
- Sub-folder cleanup of `juniper-project/` per the Master decision log: old `juniper/` webapp scaffold → **`juniper-website/`** (now earmarked as the marketing site), and `design_handoff_juniper/` → **`juniper-design/`**. `juniper-app/` (the Expo app) kept as-is. See [Master/products/juniper.md:50-52](../../Master/products/juniper.md).
- This STATUS doc and the Master product page are now the two paired sources of truth — STATUS for operational/technical, Master for brand/business.

### Project foundation (juniper-app)
- Created `juniper-app/` at the project root with `npx create-expo-app` (HEAD = `a121792`, 2026-05-22, "Initial commit")
- Downgraded from Expo SDK 56 → **SDK 54** so the App Store Expo Go (which is still on the SDK-54-compatible build pending Apple's review of newer versions) can run it without TestFlight
- Verified `expo-doctor` reports no issues; `tsc --noEmit` is clean

### Design system (juniper-app)
- Ported every token from `juniper-design/styles.css` → `src/theme/tokens.ts` — colours (paper / surface / ink / clay / moss / dried / hairlines), spacing, radii, easing curves, duration constants, and a full typography preset map
- Loaded **Source Serif 4** (display/serif), **Public Sans** (sans/body), **JetBrains Mono** (overlines/timestamps) via `@expo-google-fonts/*` packages with proper splash-screen handoff (splash stays up until fonts are ready)
- Ported all 28 line-art botanical icons from `juniper-design/icons.jsx` → `src/components/icons/index.tsx` using `react-native-svg`, with `IconByName` for plant lookups and `AllIcons` for the broader onboarding icon set
- Built `Pressing.tsx` — the herbarium-photo placeholder with 4 tones (default / moss / clay / deep), `expo-linear-gradient`-backed background, museum `№ XXX` tag, rotated botanical silhouette, italic species name

### App structure & routing (juniper-app)
- File-based routing under `src/app/` using **expo-router v6**:
  - `index.tsx` — splash (tap-anywhere)
  - `(onboarding)/` — full 7-step flow group
  - `(tabs)/` — bottom tab group with custom tab bar
  - `plant/[id].tsx` — dynamic plant detail
  - `add/` — modal stack for the add-plant flow
- Custom tab bar at `(tabs)/_layout.tsx` — 4 nav tabs (Today / Garden / Log / You) with a central clay **FAB** that pushes `/add`. Hairline-top border, paper background, mono lowercase labels, active = ink colour, inactive = ink-faint
- Root `_layout.tsx` wraps the app in `StoreProvider` + `GestureHandlerRootView`, with shared `Stack` screenOptions for fade transitions and paper-coloured content backgrounds

### State / data (juniper-app)
- `src/data/seed.ts` — `PLANTS_SEED` (6 demo plants: Marcel, Juniper, Sage, Olive, Pip, Atlas), `ARCHETYPES` (4), `ONBOARDING` (5 questions), `pickArchetype()` mapping
- `src/data/types.ts` — Plant, LogEntry, LogKind, Archetype, OnboardingStep / OnboardingAnswers types
- `src/lib/store.tsx` — React Context store with `onboarded`, `userName`, `archetype`, `plants`, `log` + mutators (`completeOnboarding`, `waterPlant`, `logAction`, `addPlant`). Marcel + Juniper + Sage are intentionally past-due so Today renders thirsty cards out of the box.
- `src/lib/log-utils.ts` — `groupLogByDay()` (Today / Yesterday / weekday / "N days ago" / "Month YYYY"), `timestampLabel()` ("just now" / "3h ago" / "10:42"), `ICON_BY_KIND` + `COLOR_BY_KIND` maps for all 7 log kinds

### Screens — full fidelity (juniper-app)
- **Splash** — paper background, mono `EST. MMXXVI` overline, moss seedling icon, *Juniper* wordmark (italic serif), `A quiet place for your plants.` subtitle, faint `tap anywhere to begin` footer
- **Onboarding (7 steps)** — animated 1px progress hairline at top (fills `(step+1)/total`), back chevron from step 2 onwards, scrollable option cards with line-art icons, name capture step (autoFocus text input + Continue button), archetype reveal with 700ms fade+slide entry. `pickArchetype()` runs on completion; user is routed to `/(tabs)/today` and seed plants are populated.
- **Today** — time-of-day greeting (`Good morning, [name].`), mono date overline, horizontal scroll of thirsty cards at 85% screen width with scroll-snap, each card showing pressing hero + name/species + THIRSTY/WATERED pill + the `WaterButton` + "Last watered Tuesday" line. Empty state: single card with moss check, *"Nothing to water today."*, *"Maybe take a slow walk past them."* Upcoming list below with hairline dividers and right-aligned `in 3d`. Footer: *— The Plant Whisperer, tending 6 plants —*
- **Garden** — overline + "The Garden" heading, horizontal hairline-border filter chips (All / Thirsty / Indoor / Outdoor — only `thirsty` actually filters per the handoff), list rows with 60×60 circular Pressing thumbs, serif name, italic species, mono right-aligned `in 4d` or clay `thirsty`
- **Plant Detail** — full-bleed 4:5 hero pressing, floating glass back-button + edit pencil with safe-area insets, `TENDED FOR 247 DAYS` overline, serif name, italic species, faint nickname, stat row (drop+frequency / sun+light / thermometer+temp, comma-gap not boxes), `WaterButton`, 4-up action row (Repot / Fertilise / Move / Note — each writes a log entry), `A SLOW RECORD` horizontal photo timeline, `THEIR LOG` per-plant log via shared `LogFeed`
- Today, Garden, Log, You stubs work and read live store data

### Signature interaction (juniper-app)
- **`WaterButton.tsx`** — handles its own animation state with Reanimated v4 shared values. Tap fires `Haptics.selectionAsync()`, starts a 60px moss ripple that scales `0 → 3.2×` over 900ms with the handoff's `cubic-bezier(0.4, 0, 0.2, 1)` curve, concurrently crossfades background `clay → moss` over 600ms, fades the "Water [name]" label out over 320ms, then fades "Watered, [day]." in with a 220ms delay. External `watered` prop changes sync the visual state so navigation away and back is stable.

### Other shared components (juniper-app)
- `Pill.tsx` — hairline-border tag with `dried` / `moss` / `ink` / `muted` tones, used for THIRSTY/WATERED markers
- `LogFeed.tsx` — day-grouped activity feed, shared between Plant Detail (filtered) and the upcoming Log tab (full)

## 🚧 Blocked / Needs Attention

- **TASKS.md still marks the Phase 1 checkpoint `[!]` even though git is clean.** Commit `4bdb8f4` ("Phase 1 — Utility checkpoint", 2026-05-25 11:56 AEST) shipped the full Phase 1 implementation to `origin/master`; working tree is clean and up-to-date. The agent does **not** auto-flip `[!]` markers placed by a human — that's an explicit human signal of "don't proceed past this." **Action:** in [`status/TASKS.md`](TASKS.md), flip the "Commit Phase 1 working tree to a checkpoint + push to fresh GitHub remote" line from `[!]` to `[x]` (or move it to the Done section). Next cycle will then re-evaluate the remaining `[!]` and either pick up new work or stay blocked on the overlay.
- **Post-onboarding red overlay (unresolved).** After tapping "Begin" on the archetype reveal, Expo Go shows a fresh uncaught-error overlay before/while [`(tabs)/today.tsx`](../juniper-app/src/app/(tabs)/today.tsx) mounts. Metro itself logged no bundling error, so it's a runtime exception on first tab-screen mount, not a transform problem. Candidates worth checking, in order: (1) **stale Expo Go bundle** still holding the pre-babel-fix worklet error — fully quit Expo Go and re-enter the URL, since reload-from-overlay sometimes keeps the old bundle; (2) a real runtime issue in `today.tsx` or one of its imports — `WaterButton`, `Pressing`, theme tokens, or the store. Capturing the actual stack trace from the overlay is the next move; right now diagnosis is blocked on that. This is the second of the two `[!]` items in TASKS.md and remains uncleared.
- **Website is still the old `jungle-jungle` plant tracker, and is now 8 commits behind origin.** [juniper-website/app/page.tsx:23](../juniper-website/app/page.tsx) renders the old wordmark, and the routes (`/today`, `/garden`, `/plants`, `/onboarding`) still do utility work against Supabase. The "marketing site" repurposing decision is on the books but no work has started. Local `main` is **8 commits behind `origin/main`** (up from 3 at the last status): 5 dependabot bumps (postcss / brace-expansion / flatted / minimatch / picomatch) **plus 3 garden-view feature commits that landed on the old repo** (`4bc975e` Matrix garden view, `9faf9ff` Matrix-only + separate locations from tags, `a3119d5` Restore list view alongside matrix view — all merged PRs #3–#5). Fast-forward before any website work begins. Origin: `git@github.com:wheredidfranciscogo/jungle-jungle.git` (remote name still tracks the old repo name). Soft blocker — only affects website-related tasks, not app work.
- **Phase-1 tracks still pending and unblocked** (carry-overs from PLAN.md, all gated only by time):
  - **Task #11**: Add Plant flow (path selector → combined edit form with slider, segmented light control, pressing swatches), Log tab (full day-grouped feed), You tab (archetype + stats + settings list)
  - **Task #13**: Supabase wiring — needs the existing project credentials. Should mirror tables 1:1 from the web app, add `expo_push_tokens` to replace `push_subscriptions`
  - **Task #14**: Expo Notifications — token registration, local notification scheduling per plant per cadence. Permission prompt should fire **post-onboarding**, not at app launch, to avoid the dreaded cold-permission denial.
- **Card-highlight visual fidelity gap.** The prototype's `inset 0 1px 0 rgba(255,255,255,0.5)` highlight can't be replicated 1:1 in React Native; currently approximated with a hairline border. If the cards feel flat on a real device, add a tiny inner shadow via `react-native-shadow-2` or a second masked View.

## 💬 Notes

### This cycle (autonomous, 2026-05-25 evening)
No-op work cycle: the orchestrator was invoked with the project still in `state=blocked`. Both `[!]` items at the top of TASKS.md were re-checked. The first (Phase 1 checkpoint commit) turned out to have been **resolved in git** since the prior status was written — commit `4bdb8f4` had already been made and pushed at 11:56 AEST that morning, but the previous status writer was a manual wiring test and didn't pick it up. The runner does not autonomously flip a human-placed `[!]`; it surfaces the discrepancy as a one-line action in Blocked and exits. The second `[!]` (red overlay) remains untouched. No code changes this cycle.

### Verified on device
The app boots in App Store Expo Go on iOS after the SDK 54 downgrade. Splash + onboarding render the correct fonts and colours. The post-onboarding watering-loop screen (Today) is **not** verified — see the post-onboarding overlay item under Blocked.

### Key files quick-reference
```
juniper-project/
├── juniper-app/                                ← Expo SDK 54 app (the product)
│   └── src/
│       ├── theme/tokens.ts                     ← source of truth for design tokens
│       ├── data/{seed,types}.ts                ← plant + archetype + onboarding data
│       ├── lib/
│       │   ├── store.tsx                       ← React Context store (replace w/ Supabase in #13)
│       │   └── log-utils.ts                    ← day grouping, timestamps, kind → icon
│       ├── components/
│       │   ├── icons/index.tsx                 ← 28 line-art SVGs + IconByName / AllIcons
│       │   ├── Pressing.tsx                    ← herbarium photo placeholder
│       │   ├── WaterButton.tsx                 ← signature ripple + crossfade
│       │   ├── Pill.tsx                        ← THIRSTY / WATERED tag
│       │   └── LogFeed.tsx                     ← day-grouped activity feed
│       └── app/
│           ├── _layout.tsx                     ← root: fonts, splash handoff, StoreProvider
│           ├── index.tsx                       ← splash (tap-anywhere)
│           ├── (onboarding)/                   ← 7-step flow
│           ├── (tabs)/                         ← Today / Garden / Log / You + center FAB
│           ├── plant/[id].tsx                  ← plant detail
│           └── add/                            ← modal: path selector + edit
├── juniper-website/                            ← old web tracker, to be repurposed as marketing site
├── juniper-design/                             ← prototype + tokens + icons (high-fi handoff)
└── status/
    ├── PLAN.md                                 ← phase map (still references "Jungle Jungle"; OK to follow)
    └── STATUS.md                               ← this file
```

### Design source of truth
[`juniper-design/`](../juniper-design) contains the React-based prototype, design tokens, icon set, and detailed `README.md`. The handoff is high-fidelity — colours, spacing, type, copy, eases, and interactions are all final. Any divergence in the Expo build is a bug, not a creative choice. (The README inside still uses the old "Jungle Jungle" name; treat that as a stale label, not a different product.)

### Reusing the existing Supabase project
[`juniper-website/`](../juniper-website) already runs against a Supabase project (credentials in `.env.local`). The Expo app will share that backend. Schema additions for Phase 1: a single `expo_push_tokens` table. No destructive migrations required. (When the website is repurposed as marketing, the auth/plants schema usage moves to the app exclusively.)

### What's intentionally out
- Garden's `Indoor` / `Outdoor` filters are decorative until plant metadata supports them (Phase 2 — needs an `environment` column on `plants` and a UI surface to set it)
- Plant Detail's edit pencil is decorative — wiring it to the add-plant edit page lives in Task #11
- The 2D physics canvas garden from the web app is not being rebuilt; the list view replaces it.

### Voice / copy
Anchored in warmth + complete sentences per the handoff: *"Two of your plants are thirsty."* / *"All caught up."* / *"Last watered Tuesday."* / *"Marcel joined you."* — never "2 plants need water" or "0 tasks remaining."

### Naming-drift note
The product is **Juniper** (per [`Master/products/juniper.md`](../../Master/products/juniper.md)). The Expo splash already says "Juniper" but older artifacts — `juniper-design/README.md`, the website's `<nav>` wordmark, the website's GitHub remote (`wheredidfranciscogo/jungle-jungle`), and [PLAN.md](PLAN.md)'s title — still say "Jungle Jungle". These are stale labels, not a separate product. Resolve as the work in each area is touched; no urgent rename push needed.

---
*Last updated: 2026-05-25 (autonomous no-op cycle; discovered Phase 1 checkpoint commit already shipped — TASKS.md marker still needs flipping)*
