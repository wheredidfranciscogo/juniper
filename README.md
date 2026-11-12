# Rayen

A quiet record of the plants in your care.

**[juniper-navy.vercel.app](https://juniper-navy.vercel.app)** — no account, no server,
nothing to install unless you want to.

*Rayen* is Mapudungun for **flower**. The project was called Juniper until 2026-11-12,
which is why the directories, the storage keys and the backup file format still carry
that name — those are addresses, not labels, and renaming them would orphan a garden
rather than move it.

Your garden is a deck of cards. The card in front is the plant that needs you most;
scroll or swipe through the rest, turn one over for its record, water it from its back.
Switch to the grid and the same cards lay out as tiles, each one's colour drifting from
moss to dried as it goes from watered to due.

Everything lives in your browser. There is no account to make and no server to send your
plants to — which also means the backup file is the only copy, and the app says so.

## A few things that are more interesting than they look

**The dryness colour is TypeScript, not CSS.** Two CSS versions were written first — a
`color-mix()` driven by a custom property, and a gradient slid by `background-position`
— and both were silently broken: each resolved once at first paint and then never again,
firing no transition events. Every test passed through both, because no test could see a
colour. It interpolates in OKLab in `lib/ramp.ts` now, with tests that assert the colour
itself.

**React and CSS own state; GSAP owns flourish.** The deck↔grid transition is a GSAP Flip,
but every card's resting position is a concrete inline style written by React, correct
whether or not anything animates. The animation layer is a separate element that always
returns to identity. Four separate "jumps" in that transition turned out to be four
different causes, and this split is what made each one findable.

**A card is one design that scales.** Its type and spacing are sized in `cqw` — percent
of the card's own width — so a grid tile is a true miniature rather than a second set of
hand-picked sizes. That is also what makes the flip exact: scaling a card no longer makes
its title step on the first frame.

**Installing it to the home screen is a data-durability measure.** WebKit clears a site's
localStorage and IndexedDB after seven days without a visit, and a watering app is
exactly the thing you might not open for ten. Home-screen web apps are exempt, so the
manifest is what stops a garden quietly emptying itself.

## Layout

```
rayen-web/      the app — Vite · React 19 · TypeScript · plain CSS · GSAP Flip
juniper-design/   the design handoff, and DECISIONS.md
status/           the project's own running record
```

[`juniper-design/DECISIONS.md`](juniper-design/DECISIONS.md) holds the load-bearing calls
and wins over anything written elsewhere. It is also the most honest account of how this
went — including **D13**, the decision to throw away a finished native app because the
one feature that justified being native had never once fired on real hardware.

## Running it

```bash
cd rayen-web
npm install
npm run dev        # http://localhost:5173
npm test           # 116 tests
npm run build      # tsc --noEmit && vite build
```

The deck page is about 112 kB gzipped. The native app it replaced was 4.43 MB.

## Licence

MIT — see [LICENSE](LICENSE).
