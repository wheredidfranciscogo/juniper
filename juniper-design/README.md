# Handoff: Juniper — plant care app

## Overview
**Juniper** is a plant-care app with a deliberately calm, warm, herbarium-notebook aesthetic. It tracks watering, supports an activity log, and personalises the experience around a "tending archetype" assigned during onboarding.

The product opposite of the typical green-saturated, gamified plant app: paper cream and terracotta clay, literary serif typography, custom line-art botanical icons, slow eases, no confetti.

## About the design files
The HTML/JSX files in this bundle are **design references**, not production code. They are a prototype built with React (via in-browser Babel) on top of a vanilla iOS device frame, used to demonstrate the intended look, behaviour, and copy.

**Your job is to recreate these designs in the target codebase's environment** (likely SwiftUI for iOS, or React Native if cross-platform) using its established patterns, libraries, and design tokens. Treat the HTML files as the source of truth for visuals and behaviour; do not ship them.

If no app environment exists yet, **SwiftUI is recommended** for native iOS — the design is heavily typographic and motion-sensitive, and SwiftUI handles both well.

## Fidelity
**High-fidelity.** All colours, spacing, typography, copy, icons, easing curves, and interactions are final and should be matched as closely as the target environment allows.

## Design system — tokens

### Colours
| Token | Hex | Use |
|---|---|---|
| `paper` | `#FAF9F5` | App background, the herbarium page |
| `surface` | `#F5F2EA` | Card backgrounds, slightly recessed |
| `surface-2` | `#EFEBDF` | Deeper card / pressed state |
| `ink` | `#2D2A26` | Body text, headings — warm near-black, never `#000` |
| `ink-muted` | `#7A716A` | Secondary text |
| `ink-faint` | `#A89F95` | Tertiary text, overlines, metadata |
| `clay` | `#CC785C` | Primary CTA, Water button, "+" FAB |
| `clay-deep` | `#B5654A` | Clay hover/pressed |
| `clay-soft` | `#E8B8A6` | Clay subtle background |
| `moss` | `#3F5D3E` | "Living" indicator, watered state, success |
| `moss-soft` | `#6B8A6A` | Moss secondary |
| `dried` | `#B8826C` | "Needs water" — desaturated, never red/alarming |
| `hairline` | `#E8E2D5` | Subtle dividers, card borders |
| `hairline-strong` | `#D9D2C2` | Stronger borders, segmented controls |

### Alternative palettes (Tweakable)
- **Dusk** — paper `#F1ECE0`, surface `#E8E1D1`, clay `#B86C50`
- **Morning** — paper `#FCFBF7`, surface `#F8F5EC`, clay `#D88060`

### Typography
- **Display / plant names / headlines** — **Source Serif 4** (Google Fonts). Variable weight 300–700, italic available. Used at 17px (notes) through 44px (splash).
  - Scientific names are always rendered in italic (e.g., *Monstera deliciosa*).
- **UI / body / buttons** — **Public Sans** (Google Fonts). Humanist sans, 300–700, italic. Used at 11px (tab labels) through 16px (body).
- **Numerals / dates / overlines** — **JetBrains Mono** (Google Fonts), 300–600. Used at 9–11px with `letter-spacing: 0.16–0.22em`, uppercase. Always tabular figures (`font-variant-numeric: tabular-nums`).

**Avoid** Inter, Roboto, Fraunces, Space Grotesk, system fonts. The serif/humanist-sans pairing is the brand.

### Spacing
- Page horizontal padding: **24px** minimum
- Section vertical rhythm: **32px** between major sections, **20–24px** inside cards
- Card internal padding: **16–22px**
- Inline gap (icon + text): **6–10px**

### Border radius
- **8px** — small (chips small bits)
- **12px** — buttons
- **14px** — cards (notes, inline editor)
- **18px** — large cards, plant photo frames
- **24px** — extra large, modal sheets
- **9999px** — pills, circular thumbnails, FAB

### Shadows
- **Cards have warmth, not depth.** Avoid harsh box-shadows.
- Default card: `1px` `hairline` border + `inset 0 1px 0 rgba(255,255,255,0.5)` for a subtle inner highlight.
- Clay FAB: `0 4px 12px rgba(204, 120, 92, 0.25)` — single soft drop.

### Easing & motion
- Base ease: `cubic-bezier(0.32, 0.72, 0.32, 1)` — closer to iOS than Material
- Long ease: `cubic-bezier(0.4, 0, 0.2, 1)`
- Default transition: **240–360ms**. No 150ms snaps. **No springs, no bounces**.
- No staggered list entries — lists appear at once.

## Information architecture
Bottom tab bar, 5 items:
1. **Today** — home screen, what needs attention now
2. **Garden** — list of all plants
3. **+ (Add)** — central clay FAB, opens add-plant flow
4. **Log** — chronological activity feed across all plants
5. **You** — archetype + stats + settings

## Screens

### 1. Splash
- Full-bleed paper background.
- Centred: line-art seedling icon (moss, 56px), gap, "*Juniper*" wordmark in serif 44px (fully italic — the prototype's two-word "Jungle *Jungle*" mark predates the rename, see DECISIONS.md D9), small subtitle in sans 14px muted: "A quiet place for your plants."
- Top: tiny mono caption "EST. MMXXVI" (date stamp feel) in 10px ink-faint, 0.22em letter-spacing.
- Bottom: faint "tap anywhere to begin" 12px ink-faint.
- **No "Get Started" button** — the entire screen is the tap target.

### 2. Onboarding (5 questions + archetype reveal)
- **Progress hairline** at top: 1px paper-cream line spanning page width minus 48px padding, animated fill in ink. **No percentages, no step counter.**
- **Back chevron** in top-left from step 2 onwards.
- Each step: serif 30px question, then a vertical stack of cards (one option each):
  - Card layout: 44×44 paper-coloured rounded square with line-art icon (moss), then sans 16px medium label, then sans 13px muted hint.
  - Card hover: border darkens from `hairline` to `ink`.
  - Tap → 220ms fade, advance.
- **Reveal step**: full-bleed paper, centred. Tiny mono "we'd call you" overline, line-art fern icon (moss, 44px), the archetype name in **serif italic 38px** ("The Plant Whisperer"), serif 17px blurb (`ARCHETYPES[key].blurb`), sans 14px body (`ARCHETYPES[key].body`). At the bottom: full-width clay "Begin" button.
- Reveal content animates in over 700ms ease-long with `translateY(8px)→0`.

#### Onboarding questions
See `data.jsx`. 5 questions: *kind of plants* / *light* / *time available* / *what draws you* / *history with plants*. Each has 3-4 options with line-art icons.

#### Archetypes (4)
- **The Plant Whisperer** — default; intuitive caretaker
- **The Quiet Collector** — likes variety/rarity
- **The Forager** — herbs + edibles
- **The Steady Hand** — routine-driven

Mapping is in `pickArchetype()` in `data.jsx`. Simple priority logic; can be replaced with a richer algorithm later.

### 3. Today (home)
- **Greeting**: "Good morning, June." (serif 28px). Greeting word is time-of-day (morning/afternoon/evening/late night). Name is the user's first name (from onboarding).
- **Overline** above: today's date as `"thursday 22 may"` (mono 10px, uppercase, 0.22em letter-spacing).
- **Thirsty cards** (if any) — horizontal scroll, ~85% screen width per card, scroll-snap. Each card:
  - Top: square plant photo placeholder (4:3 "pressing" — see below).
  - Padding 16–18px.
  - Serif 22px plant name + italic 14px species below.
  - Top-right corner of card body: tiny mono pill, dried-clay colour "THIRSTY". Crossfades to moss "WATERED" after watering.
  - Full-width clay "Water" button with line-art drop icon.
  - Last-watered line in sans 12px muted: "Last watered Tuesday."
- **No thirsty plants** state: a single card, mono check icon (moss), serif italic "Nothing to water today.", muted sans subtitle "Maybe take a slow walk past them."
- **Upcoming list** below thirsty section, ~36px above:
  - Mono overline "ALL CAUGHT UP LATER THIS WEEK"
  - Each row: serif 17px plant name + italic 14px species + mono tabular "in 3 days" right-aligned. 1px hairline divider between rows.
- **Footer**: serif italic 13px ink-faint, centred: `— The Plant Whisperer, tending 6 plants —`

### 4. Garden
- Overline: "6 plants in your care"
- Heading: serif 28px "The Garden"
- **Filter chips** below — hairline-border pills, NOT solid pills. Active state: ink border + paper background.
  - Options: All / Thirsty / Indoor / Outdoor (only Thirsty actually filters in the prototype; rest are placeholders)
- **List rows** — generous, 60px circular plant pressing thumbnail, serif 19px name, italic 13px species, right-aligned mono "in 4d" or "thirsty" (clay if thirsty).
- 1px hairline divider between rows.

### 5. Plant Detail
- **Hero**: full-width plant pressing at 4:5 ratio (the "pressing" placeholder — see below). Floating round 40px glass back-button top-left, edit pencil top-right.
- **Header below hero**: mono overline "TENDED FOR 247 DAYS", then serif 38px plant name, italic 18px species, faint sans 13px italic nickname/location.
- **Stat row** — inline horizontal line: line-art drop icon (moss, 15px) + serif "every 7 days", line-art sun icon + "bright indirect", line-art thermometer + "warm". Comma-separated by visual gap (column-gap: 18px), no boxes.
- **Water button**: full-width clay. Tapping triggers the signature animation (see below). After watering: button background crossfades clay → moss over 600ms; label "💧 Water [Name]" crossfades to "✓ Watered, Tuesday."
- **Action row**: 4-column grid of bordered ghost buttons: Repot / Fertilise / Move / Note. Each is line-art icon + sans 12px label. Tapping any logs an entry (Note opens the editor).
- **Photo timeline** ("a slow record"): horizontal scroll of 120×150 pressing tiles, mono date below, optional italic caption.
- **Per-plant Log** ("their log"): the same activity log feed, filtered to this plant.

### 6. Add Plant
- Small close button top-left (40px round, hairline border).
- Overline "WELCOME THE NEW ONE", serif 30px "How would you like to *add* them?"
- Three large cards stacked vertically:
  - Icon (56×56 paper-coloured rounded), serif 19px label, sans 13px muted hint.
  - Identify by photo / Search by name / Add manually.
- Bottom helper text in serif italic.

### 7. Add Plant — combined edit page
**Single-page form, never multi-step.** Pre-fills different fields based on path:
- **Photo path**: pre-fills species ("Monstera deliciosa" as example) + bright-indirect light + moss pressing. Subtitle "From your photo, this looks like *Monstera deliciosa*. Change it if I'm wrong."
- **Search path**: full species data from a hypothetical database.
- **Manual path**: blank.

**Top bar**: sticky, paper bg, "Cancel" left, mono overline path label centre ("FROM A PHOTO"), "Save" right (clay when enabled).

**Body**:
- Hero pressing preview (3:2) at top, reflecting selections live.
- Form fields, separated by 22px gap:
  - **Their name** (sans 13px label + serif italic 13px hint "Personal, not Latin." + underline-style text input)
  - **Species** (italic serif input)
  - **Where they live** (text input)
  - **Water every N days** (range slider 2–30, clay accent + serif "7 days" readout)
  - **Light** (4-option segmented control with rounded pills)
  - **Pressing colour** (3 swatch buttons showing the pressing styles)
  - **A note for the day they joined** (optional multi-line)

### 8. Log
- Overline "A SLOW RECORD", serif 28px "The Log"
- **Day-grouped feed**: Today / Yesterday / weekday name (within last 7 days) / "N days ago" (within last 30) / "May 2026" (older).
- Each row: 22px column for icon (line-art, kind-coloured), text body in serif 16px, italic species below, mono timestamp ("just now", "3h ago", "10:42").
- Event kinds and verbs:
  - `water` (drop, moss) — "Watered Marcel."
  - `repot` (cactus icon, clay) — "Repotted Marcel."
  - `fertilize` (sparkle, moss) — "Fed Marcel a measured dose."
  - `move` (window, muted) — "Moved Marcel to a new spot."
  - `note` (pencil, muted) — user-written
  - `joined` (seedling, moss) — "Marcel joined you."
  - `observed` (leaf, moss) — pre-existing journal-style observations

### 9. You
- Overline "YOU ARE", serif italic 36px archetype name, serif 17px archetype body.
- Stats card: plants in your care / longest tended / time spent tending (in "plant-days").
- Settings list: Watering schedule / Notification preferences / Export your journal / About Juniper. Serif 16px label, faint "→" right.

## Interactions & behaviour

### Signature animation — watering
On tap of a clay "Water" button:
1. 60×60 moss-coloured circle appears centred behind the button label.
2. Scales 0 → 3.2× over 900ms `cubic-bezier(0.4,0,0.2,1)`, fading 55% → 0 opacity.
3. Concurrently: button background colour transitions clay → moss over 600ms.
4. The "Water" / "Thirsty" labels crossfade out over 320ms; "Watered" / "Watered" labels crossfade in with a 220ms delay.
5. **A subtle haptic** should fire on tap (use UISelectionFeedbackGenerator / equivalent in target). This is the moment of delight.

CSS keyframes for reference:
```css
@keyframes jj-ripple {
  0%   { transform: translate(-50%,-50%) scale(0);   opacity: 0.55; }
  60%  { opacity: 0.35; }
  100% { transform: translate(-50%,-50%) scale(3.2); opacity: 0; }
}
```

### Other transitions
- Screen fade-in: 360ms ease, `translateY(4px → 0)` + opacity 0 → 1.
- Onboarding progress fill: 500ms ease-long width transition.
- Card hover (touch devices ignore): border darkens hairline → ink over 240ms.
- Crossfade labels: 320ms opacity, exit immediate / enter delayed 220ms.

### State management
The prototype keeps everything in React state in `app.jsx`:
- `route` — `{name: 'splash'|'onboarding'|'main'|'plant'|'add'|'addEdit', id?, path?}`
- `tab` — `'today'|'garden'|'log'|'you'`
- `plants` — array of plant objects (see `data.jsx`)
- `archetypeKey` — one of `whisperer|collector|forager|steady`
- `log` — chronological log entries `{id, plantId, kind, text, when}`

In production this should map to:
- **Persistent local store** (SwiftData / CoreData / Room / SQLite) for plants + log
- **iCloud / cloud sync** if cross-device
- **Notifications** scheduled per plant per watering cadence
- The log is **append-only** — every action that mutates a plant writes a log entry.

### Mutators
- `handleWater(plantId)` — sets `daysSinceWater: 0`, appends water log entry
- `handleLogAction(plantId, kind)` — appends `repot|fertilize|move` log entry; in production these should also update relevant plant attributes (e.g. pot size, last fertilised date).
- `handleAddNote(plantId, text)` — appends note log entry
- `addPlant(plantData)` — adds new plant, pushes `joined` log entry on its `addedISO`

## Plant photo placeholders
The prototype uses **stylised "pressings"** instead of real photos: a coloured tile (moss / clay / deep / default cream) with a low-opacity line-art silhouette of the species, italic Latin name, and a "№ MAR" museum-tag label in mono.

**For production**: replace with real user photos. The frame around photos should preserve the warmth — a 1px hairline border, soft inner highlight, no shadows. When users haven't added a photo yet, the pressing placeholder is a great fallback (do not show "Add photo +" prompts in the photo slot; the empty state is the design).

## Iconography
**All icons are custom line-art**, single weight (`stroke-width: 1.3–1.5px`), no fills, rounded line-caps, hand-drawn feel — the visual language of botanical field guides. **No emoji as content. No Material/SF Symbols.** A complete set is in `icons.jsx`:

- `IconSeedling`, `IconLeaf`, `IconMonstera`, `IconFern`, `IconCactus`, `IconFlower`, `IconHerb`
- `IconWatering`, `IconDrop`, `IconHandWater`
- `IconSun`, `IconSunPartial`, `IconThermometer`, `IconWindow`, `IconClock`
- `IconCamera`, `IconSearch`, `IconPencil`, `IconJournal`
- `IconHome`, `IconGarden`, `IconPlus`, `IconBack`, `IconClose`, `IconCheck`, `IconBell`, `IconMore`, `IconSparkle`

Production should redraw these as SF Symbols **only if** matching weight (`thin`) and using `SymbolEffect`s that match the calm motion. Otherwise recreate as bundled SVG.

## Voice & copy
This is half the design. Anchor everything in warmth + sentences:

- "Two of your plants are thirsty." (not "2 plants need water")
- "All caught up." (not "0 tasks remaining")
- "Last watered Tuesday." (not "3 days ago")
- "You've been tending Marcel for 247 days." (not "Plant added: 247 days ago")
- "Marcel joined you." (not "New plant added: Marcel")
- "Fed Juniper a measured dose." (not "Fertilized Juniper")
- "No notes yet. Plants don't mind waiting." (empty state)
- "From your photo, this looks like *Monstera deliciosa*. Change it if I'm wrong." (humble, conversational)

Plant names are personified. Sentences end with periods. Warm without being twee.

## Files in this bundle
- `Jungle Jungle.html` — entry point, loads everything
- `styles.css` — design tokens, base styles, animations
- `icons.jsx` — full line-art icon set
- `data.jsx` — plant seed data, archetypes, onboarding questions
- `pressing.jsx` — plant photo placeholder component
- `screens-onboarding.jsx` — splash + onboarding flow
- `screens-main.jsx` — Today / Garden / Plant detail / Add / You / Log screens
- `screens-edit.jsx` — combined add-plant edit page + note editor
- `logs.jsx` — log model, seeder, log feed, action row
- `app.jsx` — root, routing, state, tweaks panel wiring
- `ios-frame.jsx` — iOS device frame for preview (not part of the app itself)
- `tweaks-panel.jsx` — design-review tweak controls (not part of the app itself)

## What is NOT covered in the prototype
These need to be designed/built in production:
- **Onboarding name capture** — currently hard-coded "June". Add a final onboarding step asking for the user's name before archetype reveal.
- **Plant Detail edit mode** — the pencil icon is decorative. Wire it to open `AddPlantEditScreen` pre-filled with the current plant's data.
- **Garden filter chips beyond "Thirsty"** — Indoor / Outdoor / Other categorisations need real plant metadata to filter on.
- **Photo capture / identification** — the "Identify by photo" path is currently stubbed. In production, integrate a plant-ID service (PlantNet API, Pl@ntNet, or similar) and a camera capture step.
- **Notifications** — schedule local notifications for upcoming waterings.
- **Settings screens** — the "You" tab's links are decorative.
- **Export** — `Export your journal` should generate a PDF/CSV of the log.
- **Search by name** path needs a species database lookup.
- **Real photo handling** — uploading, cropping, the photo timeline display.

## Open questions for the developer
1. **iOS only or cross-platform?** The design is iOS-flavoured (device frame, glass back buttons) but works equally well on Android. Confirm before choosing SwiftUI vs React Native vs Flutter.
2. **Backend?** Plants + log can live entirely on-device. If multi-device sync is needed, plan for iCloud (native) or a small Postgres-backed API.
3. **Plant identification provider?** PlantNet is free, paid options include Plant.id and Pl@ntNet.
4. **Push notifications** — opt-in flow timing? Worth a dedicated post-onboarding moment, or fold it into the first watering reminder?

Good luck. Slow eases. Warm cream.
