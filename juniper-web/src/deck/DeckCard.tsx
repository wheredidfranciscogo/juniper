/**
 * One plant, one card — two faces.
 *
 * WHERE THE CARD IS, AND WHICH WAY IT FACES, IS STATE — NOT ANIMATION.
 *
 * Both are written declaratively: the stack position as a concrete inline transform,
 * the turn as a class that CSS resolves. A transition between those values is pure
 * decoration, and if it never plays the card still ends up correct — it just jumps.
 *
 * The earlier cut drove both imperatively with GSAP, and every bug in this prototype
 * came from that one decision. GSAP advances on requestAnimationFrame, which a browser
 * stops delivering whenever the page is not being composited. An imperative animation
 * interrupted that way does not land late; it stops where it was. Cards ended up
 * stranded half on top of each other, and worse, a card could register as TURNED while
 * its transform was still `none` — front face inert because the class said the back was
 * showing, back face rotated away and invisible. The card went dead while looking
 * untouched, and no amount of watchdog timers fixes that, because the wrong thing was
 * load-bearing.
 *
 * The transform is written as a concrete string rather than through a CSS custom
 * property on purpose: a transitioned property whose value derives from a `var()` does
 * not re-resolve in Chrome (see the header of src/lib/ramp.ts, where that cost two
 * silently broken implementations of the dryness ramp).
 *
 * GSAP still owns `.card__tilt`, an inner layer that holds only transient flourishes —
 * the pointer tilt, the pour, the flight off the deck. Nothing there carries meaning,
 * and it always returns to identity, so a stalled ticker costs a flourish and never a
 * broken card.
 */

import * as React from 'react';

import { IconDrop, PlantIcon } from '../components/icons';
import type { Plant } from '../data/types';
import { usePhotoURL } from '../lib/use-photo';
import { DRY_SHADES, WET_SHADES, kindColor, kindGround, markColor } from './palette';
import { archRing, dried, shade } from './border';

/**
 * The arch outline's grid. Square, because the window is.
 *
 * TWO DENSITIES, ONE APPARENT SIZE. A single grid would give 5px cells on a full card
 * and under 2px on a grid tile, which stops being pixels and becomes a blurred line.
 * Scaling the grid with the card keeps every cell about 5px wherever it is drawn.
 */
const ARCH = { deck: 56, tile: 20 } as const;
const RINGS = {
  deck: archRing(ARCH.deck),
  tile: archRing(ARCH.tile),
};
import { daysUntilWater, nextWateringDate } from '../lib/watering';

/** Cards deeper than this are transparent; the deck reads as about five thick. */
export const DEPTH_VISIBLE = 4;

export interface DeckCardProps {
  plant: Plant;
  dryness: number;
  now: Date;
  depth: number;
  count: number;
  /** In 'grid' the card is a normal grid child and carries no transform of its own. */
  view: 'deck' | 'grid';
  turned: boolean;
  busy: boolean;
  onTurn: () => void;
  onWater: () => void;
  onEdit: () => void;
  register: (id: string, el: HTMLElement | null) => void;
}

/** "thirsty" / "tomorrow" / "4 days" — unalarmed even when overdue (D12). */
function thirstLine(plant: Plant, now: Date): string {
  const left = daysUntilWater(plant, now);
  if (left <= 0) return 'thirsty';
  if (left === 1) return 'tomorrow';
  return `${left} days`;
}

const day = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** How far each card behind the front is offset, in px. */
const FAN_X = 11;
const FAN_Y = 15;

/**
 * The resting transform for a card at `depth`. Concrete values, never a var().
 *
 * THE FAN IS CENTRED, not the front card. Offsetting every card from the front one
 * means a deep stack grows to the right and upward only, and on a phone the back of
 * the deck ran off the edge of the screen — the card is 84vw and eight cards add
 * another 44px to that. Shifting everything by half the visible spread puts the
 * middle of the fan in the middle of the stage, where it belongs.
 */
export function restingStyle(depth: number, count: number, turned: boolean): React.CSSProperties {
  const spread = Math.min(Math.max(count - 1, 0), DEPTH_VISIBLE);
  // depth < 0 — in the garden, not in this pass. It keeps its element so the grid can
  // place it and so deck<->grid never has to animate a card in or out, but in the deck
  // it is not there.
  if (depth < 0) {
    return {
      transform: `translate3d(${(spread * FAN_X) / 2}px, ${-(spread * FAN_Y) / 2}px, 0px) scale(0.9)`,
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none',
      transitionDelay: '0ms',
    };
  }
  if (turned) {
    return {
      transform: 'translate3d(0px, 0px, 0px) rotate(0deg) scale(1.05)',
      opacity: 1,
      zIndex: count + 1,
      transitionDelay: '0ms',
    };
  }
  const x = depth * FAN_X - (spread * FAN_X) / 2;
  const y = (spread * FAN_Y) / 2 - depth * FAN_Y;
  return {
    transform: `translate3d(${x}px, ${y}px, 0px) rotate(${
      (depth - spread / 2) * 1.4
    }deg) scale(${(1 - depth * 0.042).toFixed(4)})`,
    opacity: depth > DEPTH_VISIBLE ? 0 : 1 - depth * 0.1,
    zIndex: count - depth,
    transitionDelay: `${depth * 35}ms`,
  };
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="back__row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

export const DeckCard = React.memo(function DeckCard({
  plant,
  dryness,
  now,
  depth,
  count,
  view,
  turned,
  busy,
  onTurn,
  onWater,
  onEdit,
  register,
}: DeckCardProps) {
  const front = depth === 0 && view === 'deck';
  const inPass = depth >= 0;
  const grid = view === 'grid';
  const field = kindColor(plant.icon);
  const photo = usePhotoURL(plant.photos[0]?.uri);
  const ground = kindGround(plant.icon);
  const rank = Math.max(0, daysUntilWater(plant, now));
  /**
   * The ring, as one path per shade.
   *
   * A span per square would be ~316 absolutely positioned elements per card, and eight
   * of those animating through a Flip is a lot of layout for a decoration. Bucketing
   * the squares by colour and emitting one <path> each brings it to ten nodes a card.
   * The viewBox is in grid units and the aspect ratio matches the card, so nothing is
   * distorted and `crispEdges` keeps the squares sharp.
   */
  const ringPaths = React.useMemo(() => {
    const cells = grid ? RINGS.tile : RINGS.deck;
    const burnt = dried(plant.id, dryness, cells.length);
    const buckets = new Map<string, string[]>();
    cells.forEach((cell, i) => {
      const family = burnt[i] ? DRY_SHADES : WET_SHADES;
      const colour = family[shade(plant.id, i, family.length)];
      const box = buckets.get(colour);
      const d = `M${cell.x} ${cell.y}h1v1h-1z`;
      if (box) box.push(d);
      else buckets.set(colour, [d]);
    });
    return [...buckets].map(([colour, ds]) => ({ colour, d: ds.join('') }));
  }, [dryness, grid, plant.id]);

  return (
    <article
      ref={(el) => register(plant.id, el)}
      className={`card${front ? ' card--front' : ''}${turned ? ' card--turned' : ''}${
        grid ? ' card--tile' : ''
      }`}
      data-id={plant.id}
      data-depth={depth}
      // In the grid the CSS grid places the card; writing a stack transform here
      // would fight it, and Flip would measure the wrong resting position.
      style={grid ? undefined : restingStyle(depth, count, turned)}
      aria-hidden={view === 'deck' && !front}
      data-off={view === 'deck' && !inPass ? '' : undefined}
    >
      {/* GSAP's layer. Always returns to identity; never holds meaning. */}
      <div className="card__tilt" style={{ animationDelay: `${depth * 55}ms` }}>
        {/* Written inline for the same reason the stack position is: every piece of
            STATE in this component is a concrete value React owns, so there is one
            place to look and nothing can half-apply. (A detour blamed class-driven
            transitions for freezing; that was a preview pane with a stalled animation
            clock, which freezes inline transitions and GSAP alike. Verified working
            in Chrome.) */}
        <div
          className="card__flip"
          style={{ transform: turned ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* ---- face up ---- */}
          <div className="card__face card__face--front">
            {/* Its own layer because GSAP floods this colour on a watering. */}
            <div className="card__field" style={{ backgroundColor: field }} />
            <div className="card__sheen" />

            {/*
            THE FACE IS A PLAYING CARD.
              - the title block sits at the TOP, set the same way as the card's back,
                so both sides introduce the plant identically
              - the rank takes one corner and the suit another, rather than stacking
                them into a single mark too small to read across a table
              - the artwork hangs in a window whose sides curve INWARD, which pulls it
                clear of the corners and gives the marks room to be large

            The window is the fixed part of the arrangement. A silhouette and a
            photograph are very different shapes; giving them one window means a photo
            drops into exactly the hole the silhouette was in and nothing else moves.
            Its ground is a deep relative of the card's own colour (see palette.ts) —
            the artwork sits ON something rather than in a hole punched out of the card.

            RANK = DAYS UNTIL WATER. It reads zero when due and goes no lower, because
            a plant three days late is just thirsty (D12).
          */}
          {/*
            THE WATER STATE LIVES HERE, and only here. The card's colour is the kind of
            plant; this ring is the clock. Green squares turn red a few at a time, in a
            scattered order fixed per plant, until a plant that is due is ringed in red.
          */}

          <div className="face">
            <header className="face__title">
              <h2 className="face__name">{plant.name}</h2>
              <p className="face__species">{plant.species}</p>
            </header>

            <span className="face__rank" style={{ color: markColor(dryness) }} aria-hidden="true">
              {rank}
            </span>

            <div
              className={`face__panel${photo ? ' face__panel--photo' : ''}`}
              style={{ backgroundColor: ground }}
            >
              {photo ? (
                <img className="face__photo" src={photo} alt="" />
              ) : (
                <PlantIcon name={plant.icon} size={grid ? 52 : 150} stroke={grid ? 2 : 1.6} />
              )}

              {/*
                The water state, traced around the window's own edge rather than
                framing the whole card in a rectangle of pixels. One shape instead of
                two fighting each other.
              */}
              <svg
                className="face__ring"
                viewBox={`0 0 ${grid ? ARCH.tile : ARCH.deck} ${grid ? ARCH.tile : ARCH.deck}`}
                preserveAspectRatio="none"
                shapeRendering="crispEdges"
                aria-hidden="true"
                focusable="false"
              >
                {ringPaths.map((p) => (
                  <path key={p.colour} d={p.d} fill={p.colour} />
                ))}
              </svg>
            </div>

            <span className="face__suit" aria-hidden="true">
              <PlantIcon name={plant.icon} size={grid ? 18 : 34} stroke={grid ? 2.1 : 2} />
            </span>
          </div>

            {/* The whole face is the target — a card you tap, not a button on a card. */}
            <button
              className="card__turn"
              onClick={onTurn}
              disabled={!grid && (!front || busy)}
              aria-label={
                grid
                  ? `${plant.name}, ${thirstLine(plant, now)}. Bring to the front of the deck.`
                  : `${plant.name}, ${thirstLine(plant, now)}. Open the details.`
              }
            />
          </div>

          {/* ---- face down ---- */}
          <div className="card__face card__face--back">
            <div className="card__sheen" />
            <button
              className="card__turn card__turn--back"
              onClick={onTurn}
              disabled={!front || busy}
              aria-label={`Close the details for ${plant.name}`}
            />

            <div className="back">
              {/* Out of the grid flow: on a short card it would push the action off
                  the bottom edge. It is wallpaper, not content. */}
              <div className="back__mark" aria-hidden="true">
                <PlantIcon name={plant.icon} size={150} stroke={1.1} />
              </div>

              <header className="back__head">
                <div className="back__title">
                  <h2 className="back__name">{plant.name}</h2>
                  <button
                    type="button"
                    className="back__edit"
                    onClick={onEdit}
                    disabled={!front || busy}
                  >
                    edit
                  </button>
                </div>
                <p className="back__species">{plant.species}</p>
              </header>

              <dl className="back__rows">
                <Row k="light" v={plant.light.toLowerCase()} />
                <Row k="water" v={`every ${plant.waterEvery} days`} />
                <Row k="last" v={day(new Date(plant.lastWateredISO))} />
                <Row k="next" v={day(nextWateringDate(plant, now))} />
                <Row
                  k="kept"
                  v={`since ${new Date(plant.addedISO).toLocaleDateString(undefined, {
                    month: 'short',
                    year: 'numeric',
                  })}`}
                />
              </dl>

              <div className="back__meter" aria-hidden="true">
                <div
                  className="back__meter-fill"
                  style={{ width: `${Math.round(dryness * 100)}%`, backgroundColor: field }}
                />
              </div>

              <button className="back__water" onClick={onWater} disabled={!front || busy}>
                <IconDrop size={17} stroke={1.75} />
                water {plant.name}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});
