# juniper-web

Juniper, as a web app. A quiet record of the plants in your care.

One screen: your garden as a grid. Every plant is a square whose colour drifts from moss
to dried as it goes from watered to due. The drop in a square's corner waters it without
leaving the grid; tapping a square grows it into the plant's full record.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 98 tests
npm run build      # tsc --noEmit && vite build
```

## Why this exists and `juniper-app/` doesn't

See `juniper-design/DECISIONS.md` **D13**. In short: the one feature that justified being
native — the watering reminder — never fired on real hardware once, while the app sat
unopened for two months and its build expired. The Expo app is frozen, not deleted; its
git history is this project's history.

## Layout

```
src/
  lib/          pure logic, no DOM — dryness, watering, stats, cover, today-utils, ramp
  data/         types and the one seeded example plant
  components/   PlantTile, PlantPeek, AddPlant, Pressing, icons
  styles/       tokens.css is the design system; the rest is per-component
  App.tsx       the garden, the only screen
```

`lib/dryness.ts`, `lib/watering.ts`, `lib/stats.ts`, `lib/cover.ts`, `lib/today-utils.ts`
and `data/seed.ts` were **copied byte for byte from the native app**, along with 74 of
their tests. They have no DOM and no React in them. If you change one, consider whether
the change belongs in the frozen `juniper-app/` copy too — or whether that copy should
finally go.

## Three things that will bite you

**1. The ramp is TypeScript, not CSS, and that is deliberate.** `lib/ramp.ts` interpolates
in OKLab and the tile sets a concrete `background-color`. Two CSS versions were written
first and both were silently broken in Chrome 152 — a `color-mix()` driven by a custom
property, and a gradient slid by `background-position` — each resolving once at first
paint and then never again, with no transition events. Every test passed through both.
See **D14**. Do not "simplify" this back into CSS without checking it on a screen.

**2. The grid's order is frozen while the page is open.** Sorting by thirst on every
change sends a watered square flying to the far end of the grid — you tap a drop and the
thing you touched teleports. The order is recomputed only when the set of plants changes.
There is a test for it.

**3. The export is the only backup that exists.** The garden is localStorage plus
IndexedDB for photographs, in one browser on one machine. "Clear site data" destroys it.
That is why a failed write surfaces as `storageError` in the UI instead of being
swallowed, and why the footer says so out loud.

## Not done

- Never deployed. It runs on localhost and nowhere else.
- No reminders of any kind — a deliberate bet (D13), not an oversight.
- The log and the per-plant journal are readable but not writable; there is no way to add
  a note from the UI yet.
- No PWA manifest or service worker, so it cannot be installed to a home screen.
- The pour animation and the ramp's midtones have been looked at on a laptop in one
  browser. They have not been judged on a phone, in daylight, against real plants.
