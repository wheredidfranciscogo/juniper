# rayen-web

Rayen, as a web app. A quiet record of the plants in your care.

**Two pages, one garden.** `/` is the deck — the plants as cards, the thirstiest in front,
turned over for their record and watered from the back. `/grid` is the same cards as
tiles, each one's colour drifting from moss to dried as it goes from watered to due.
They share a store, and the deck↔grid toggle is a GSAP Flip between them.

The deck is the front door because it is what goes on a phone's home screen. The grid is
the older of the two and still the better way to see a whole garden at once.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 116 tests
npm run build      # tsc --noEmit && vite build
```

## Why this exists and `juniper-app/` doesn't

See `rayen-design/DECISIONS.md` **D13**. In short: the one feature that justified being
native — the watering reminder — never fired on real hardware once, while the app sat
unopened for two months and its build expired.

The Expo app was frozen, and has now been removed: it never shipped again, and all that
was left of it in practice was a build toolchain generating dependency alerts for a
binary nobody cuts. Its git history is still this project's history — `git log` before
`9a5b078` reaches all of it, and `git show` will hand back any file from it.

## Layout

```
src/
  lib/          pure logic, no DOM — dryness, watering, stats, cover, today-utils, ramp
  data/         types and the one seeded example plant
  components/   PlantTile, PlantPeek, AddPlant, Pressing, icons
  deck/         the deck — Deck, DeckCard, PlantForm, BackupSheet, suits, palette
  styles/       tokens.css is the design system; the rest is per-component
  App.tsx       the grid, mounted by grid.html
  deck/main.tsx the deck, mounted by index.html
offline.plugin.ts   the service worker, and the build step that writes it
```

**Both pages are build inputs** (`vite.config.ts`). A build that takes only `index.html`
has happened, and it shipped a production deploy with no deck in it.

`lib/dryness.ts`, `lib/watering.ts`, `lib/stats.ts`, `lib/cover.ts`, `lib/today-utils.ts`
and `data/seed.ts` were **copied byte for byte from the native app**, along with 74 of
their tests. They have no DOM and no React in them. These are now the only copies —
there is no second one to keep in sync any more.

## Six things that will bite you

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
swallowed, why the deck's wordmark opens a Backup sheet, and why that sheet shares rather
than downloads — in an installed standalone app the `download` attribute is not
dependable, so a download-only button would do nothing on the one platform it is for.

**4. React and CSS own STATE; GSAP owns FLOURISH.** A card's resting position is a
concrete inline style written by React and correct with no animation running at all.
GSAP only touches `.card__tilt`, an inner element that always returns to identity. Four
different "jumps" in the deck↔grid transition had four different causes, and keeping
those layers apart is the only reason each was findable. Do not let GSAP write state.

**5. The card's type is sized in `cqw`, off `.card__face`.** That is what makes a tile a
true miniature and the Flip exact. Two traps: `container-type` implies `contain: layout`,
which forces `transform-style: flat` and would collapse the 3D turn if you put it on
`.card` or `.card__flip`; and the ratios are calibrated against the card's **layout**
width, because the fan's rotation inflates its bounding rect.

**6. The service worker is a string, and its fetches answer to `connect-src`.**
`offline.plugin.ts` writes `sw.js` at build time with the hashed bundle list baked in,
because a browser only reinstalls a worker whose bytes changed. Nothing type-checks that
string; `lib/__tests__/offline.test.ts` runs it against a fake browser instead. Pages are
network-first and are never written back to the cache, so the cache only ever holds a
page and bundles that belong together. And a worker's own `fetch()` is governed by
`connect-src` — not `style-src` or `font-src` — which is the only reason the two Google
font hosts appear there in `vercel.json`. Take them out and fonts break offline, quietly.

## Not done

- No reminders of any kind — a deliberate bet (D13), not an oversight.
- The log and the per-plant journal are readable but not writable; there is no way to add
  a note from the UI yet.
- Offline covers the app and the fonts it has already drawn with. `/grid` asks for a
  slightly different font stylesheet than the deck, so it falls back to system type
  offline until it has been opened once with a network.
- Judged against a demo garden over days, not real plants over weeks.
