# Project Plan — Juniper

> Rewritten 2026-08-15. The previous version was titled "Jungle Jungle", planned a
> Supabase backend, and carried a three-phase roadmap ending in a neighbourhood
> plant-sitting marketplace. It described a company. This describes a tool.
> Load-bearing calls live in [`juniper-design/DECISIONS.md`](../juniper-design/DECISIONS.md).

## 🎯 Goal

A calm native app for iOS and Android that **tells you when to water your plants**, lets you
mark it done in one tap, and keeps a quiet record of it. On-device, no account, no server.

That is the whole product. Everything below is in service of that sentence.

## 🧭 The loop that matters

> A reminder fires on the right day → you tap it → the plant opens → you tap Water →
> it reschedules itself.

When that works end to end on a real phone, Juniper is useful. It is not useful before then,
no matter how many screens exist.

## 🧱 Architecture (locked — see DECISIONS.md)

| | |
|---|---|
| **Stack** | Expo SDK 54 · TypeScript · expo-router v6 · Reanimated v4 · react-native-svg |
| **Data** | On-device AsyncStorage, versioned. **No backend.** (D2) |
| **Sync** | None in v1. Not decided. Not needed. (D3) |
| **Reminders** | `expo-notifications`, local one-shot rolling queue, per plant per cadence (D7) |
| **Styling** | Typed theme tokens + `StyleSheet`. No NativeWind, no Tamagui. |
| **Platforms** | iOS + Android. **No web.** (D1) |
| **Repo** | One, at the wrapper folder (D4) |
| **Website** | Static HTML on Vercel — marketing + privacy + terms only (D5) |

## 📋 Phase 1 — Useful

The app you'd actually keep on your home screen. **Most of this is already built.**

**Done and on `master`:**
- [x] Expo SDK 54 scaffold, design tokens, 28 line-art botanical icons, `Pressing` placeholder
- [x] expo-router structure: splash → onboarding → tabs + plant detail + add
- [x] 7-step onboarding with archetype reveal, `Stack.Protected` route gate
- [x] Today, Garden, Log, Plant Detail screens at design fidelity
- [x] Signature `WaterButton` — ripple, clay→moss crossfade, haptic
- [x] Add Plant flow, all three paths
- [x] AsyncStorage persistence, versioned — **the app already survives a reload**
- [x] 12 test suites / 91 tests, CI on push and PR

**Remaining — in priority order:**
- [ ] **Watering reminders.** Per-plant local notifications on each plant's cadence. Tapping
      one deep-links to that plant. Watering reschedules it. (D7)
- [ ] **You tab** — reminder time, notification toggle, stats, and the settings that make the
      reminders controllable. Currently a stub.
- [ ] **Finish the rename** — bundle ID, scheme, Maestro `appId`, all copy. Before any build. (D9)
- [ ] **EAS setup** — `eas.json`, bundle identifiers, a development build to test notifications
      on a real phone. (D6)
- [ ] **Real photos** — capture to the document directory, store the URI, render on the plant
      timeline. The seeded pressings are beautiful but they aren't *your* plants.
- [ ] **Backup export** — one button that writes the garden to JSON and hands it to the share
      sheet. Cheap insurance against D2's one real downside.

## 🏁 Definition of Done

Phase 1 is done when:
- A reminder fires on the right day on a real phone, on both iOS and Android.
- Tapping it opens the plant; tapping Water marks it and reschedules the next one.
- Data survives app restart, device reboot, and app update.
- You have used it for **two weeks on your own plants** without reaching for anything else.
- Builds are on TestFlight and the Google Play internal track.

That last one is deliberate: the test of this app is whether it survives contact with your
own windowsill, not whether the checklist is complete.

## ⏭️ After that

Nothing is planned. When Phase 1 has been in daily use for a month, the next thing will be
obvious from having lived with it — and that beats anything guessable from here.

Deleted from this plan on 2026-08-15 (see D8): plant-sitting map, cuttings marketplace,
"plants around me", community plant ID, following plant parents, home-screen widgets, Live
Activities, dark mode, PlantNet identification, species search, iCloud sync, onboarding A/B.
