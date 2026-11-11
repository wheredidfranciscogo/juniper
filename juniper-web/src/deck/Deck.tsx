/**
 * Juniper as a deck instead of a grid.
 *
 * The grid asks you to scan and decide. A deck hands you one plant and asks one
 * question, and when you have answered it for every card the deck is empty — which is
 * a thing the grid can never do. That ending is most of the reason this reads as a
 * game and the grid does not.
 *
 * THE CARD IS TAPPED, NEVER THROWN. An earlier cut had swipe-right to water and
 * swipe-left to defer. A swipe commits before you have read anything, and the
 * directions are arbitrary — nothing about "right" means water. So the only gesture is
 * a tap: the card turns over, and the watering sits on the back next to the facts you
 * would want before deciding.
 *
 * THE DIVISION OF LABOUR, which is the thing to preserve if this is ever rebuilt:
 *
 *   React + CSS own STATE — where each card sits in the stack, which way it faces.
 *     Written as concrete inline values and a class. Correct whether or not anything
 *     animates; a transition between them is decoration.
 *
 *   GSAP owns FLOURISH — the tilt, the pour, the splash, the flight off the deck.
 *     All of it on an inner `.card__tilt` layer that always returns to identity.
 *
 * Everything that went wrong in this prototype came from putting state on the GSAP
 * side of that line. See the header of DeckCard.tsx.
 */

import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import * as React from 'react';

import { byThirst, dryness as drynessOf } from '../lib/dryness';
import { cardColor } from './palette';
import { deletePhotos, savePhoto } from '../lib/photos';
import { useNow } from '../lib/use-now';
import { useStore } from '../lib/store';
import type { Plant, PlantIconName } from '../data/types';

import { DeckCard, restingStyle } from './DeckCard';
import { PlantForm } from './PlantForm';
import { demoPlants } from './demo';

gsap.registerPlugin(Flip);

type View = 'deck' | 'grid';

/**
 * Scrolling the deck.
 *
 * Three things make a wheel handler feel right, and the first cut had none of them:
 *
 * 1. DELTAS ARE NOT IN PIXELS. A trackpad reports pixels (deltaMode 0), but a classic
 *    mouse wheel reports LINES (deltaMode 1) — about 3 per notch. Measured against a
 *    90px threshold that needed thirty notches, so the deck was simply dead on a
 *    mouse. Everything is normalised to pixels before it is counted.
 *
 * 2. ONE FLICK IS ONE GESTURE. A trackpad flick keeps firing events for half a second
 *    after your fingers leave, with the delta decaying. Counting those as input sent
 *    the deck five cards deep on one flick. The decay is the tell: while the gesture
 *    is COASTING — deltas below the gesture's peak — nothing counts. Push again and
 *    the delta climbs back toward the peak, which is a real input and does.
 *
 * 3. A RATE CAP. Nothing may advance faster than the card can travel, or the deck
 *    turns into a blur with no sense of how far you have gone.
 */
const LINE_PX = 16;
const PAGE_PX = 400;
/** Normalised scroll distance that advances one card. */
const WHEEL_STEP = 46;
/** A quiet gap this long starts a fresh gesture. */
const WHEEL_IDLE_MS = 160;
/** Floor on the time between two advances. */
const WHEEL_MIN_GAP_MS = 170;
/** A delta below this fraction of the gesture's peak is momentum, not input. */
const COAST_RATIO = 0.85;
/** Vertical travel, in px, that commits a touch swipe. */
const SWIPE_PX = 58;

function wheelPx(e: React.WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * LINE_PX;
  if (e.deltaMode === 2) return e.deltaY * PAGE_PX;
  return e.deltaY;
}

type Verdict = 'watered' | 'later';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Deck() {
  const now = useNow();
  const reduce = React.useMemo(prefersReduced, []);

  /**
   * THE GARDEN COMES FROM THE STORE, NOT FROM THIS COMPONENT.
   *
   * It used to be local state seeded from eight demo plants, which meant every watering,
   * every edit and every plant added was forgotten on reload — the deck was a drawing of
   * an app. `plants` is now the same persisted garden the grid app reads, and every
   * change goes back through the store's actions so it is written to localStorage and
   * logged. Hydration is synchronous, so the first render already has the real garden
   * and there is no empty frame to design around.
   */
  const {
    plants,
    onboarded,
    completeOnboarding,
    waterPlant,
    addPlant,
    updatePlant,
    removePlant,
    storageError,
  } = useStore();
  const byId = React.useMemo(() => new Map(plants.map((p) => [p.id, p] as const)), [plants]);

  /**
   * The pass order. LOCAL, and deliberately not in the store.
   *
   * Which card you are looking at is not a fact about your garden — it should not be
   * saved, and it must not be the same on two open tabs. The garden is the set; this is
   * the order you are walking it in, seeded by thirst so the first card is the one that
   * needs you most.
   */
  const [queue, setQueue] = React.useState<string[]>(() => {
    const at = new Date();
    return [...plants].sort((a, b) => byThirst(a, b, at)).map((p) => p.id);
  });

  /**
   * Keep the pass in step with a garden that can change underneath it.
   *
   * Adding, editing and removing all go through the store now, so `plants` can change
   * for reasons this component did not initiate — another tab, an import, the grid app.
   * Membership is reconciled; ORDER IS NOT, because re-sorting mid-pass would shuffle the
   * deck in your hands. New plants join at the back unless whoever added them already
   * put them somewhere (the form deals them to the front in the same batch, so they are
   * already known by the time this runs).
   */
  React.useEffect(() => {
    setQueue((q) => {
      const live = new Set(plants.map((p) => p.id));
      const kept = q.filter((id) => live.has(id));
      const known = new Set(kept);
      const fresh = plants.filter((p) => !known.has(p.id)).map((p) => p.id);
      if (fresh.length === 0 && kept.length === q.length) return q;
      return [...kept, ...fresh];
    });
  }, [plants]);

  /** null = closed, 'new' = adding, otherwise the id being edited. */
  const [editing, setEditing] = React.useState<string | 'new' | null>(null);
  /** Set when a photograph could not be written to IndexedDB. */
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [turnedId, setTurnedId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>('deck');
  /** A deck<->grid transition is in flight. Starting a second one strands the first. */
  const [flipping, setFlipping] = React.useState(false);

  const els = React.useRef(new Map<string, HTMLElement>());
  const stage = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef<number[]>([]);
  const flipFrom = React.useRef<Flip.FlipState | null>(null);
  const wheel = React.useRef({ acc: 0, at: 0, peak: 0, firedAt: 0 });
  const swipe = React.useRef<{ y0: number; dy: number; active: boolean } | null>(null);

  const register = React.useCallback((id: string, el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  }, []);

  const later = React.useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);

  React.useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    },
    [],
  );

  const frontId = queue[0];
  const frontEl = () => (frontId ? els.current.get(frontId) : undefined);
  const tiltOf = (el: HTMLElement | undefined) =>
    (el?.querySelector('.card__tilt') as HTMLElement | null) ?? null;
  const isTurned = turnedId !== null && turnedId === frontId;

  /**
   * Run `after` when the timeline finishes, or when it plainly never will.
   *
   * A timeline the ticker abandoned sits at progress 0 indefinitely, and anything
   * waiting only on its `onComplete` waits with it. The watchdog forces the end state
   * rather than killing the timeline, so the card lands where the animation was taking
   * it instead of freezing mid-flight.
   */
  const finish = React.useCallback(
    (tl: gsap.core.Timeline, after: () => void) => {
      let fired = false;
      const once = () => {
        if (fired) return;
        fired = true;
        after();
      };
      tl.eventCallback('onComplete', once);
      later(() => {
        tl.totalProgress(1);
        once();
      }, tl.duration() * 1000 + 400);
    },
    [later],
  );

  /** Hand a card back to CSS: whatever GSAP did to it is over. */
  const clearFlourish = React.useCallback((id: string) => {
    const tilt = tiltOf(els.current.get(id));
    if (tilt) gsap.set(tilt, { clearProps: 'all' });
  }, []);

  /* ---- turning the card over ---------------------------------------------- */

  const turn = React.useCallback(
    (to: boolean) => {
      if (busy || !frontId) return;
      // One state change. CSS resolves the rest; nothing here can half-apply.
      setTurnedId(to ? frontId : null);
      const tilt = tiltOf(frontEl());
      if (tilt) gsap.to(tilt, { rotationX: 0, rotationY: 0, duration: 0.3 });
    },
    [busy, frontId],
  );

  /* ---- verdicts ------------------------------------------------------------ */

  /**
   * WATERING DOES NOT TAKE THE CARD AWAY.
   *
   * Two earlier cuts got this wrong in different ways. The first deleted the plant
   * outright, so tending your garden made it smaller. The second kept it in the garden
   * but dropped it out of the deck, which still looked like disappearing from the only
   * place you were looking. A deck you flip through is the garden, not a to-do list
   * that empties — so the card stays, its border turns green, and you move on to the
   * next one.
   */
  const settle = React.useCallback(
    (id: string, verdict: Verdict) => {
      clearFlourish(id);
      // The store stamps the time AND writes the log entry, so a watering done here
      // shows up in the grid app's history exactly like one done there.
      if (verdict === 'watered') waterPlant(id);
      setQueue((q) => (q.length < 2 ? q : [...q.slice(1), id]));
      setTurnedId(null);
      setBusy(false);
    },
    [clearFlourish, waterPlant],
  );

  /* ---- adding, editing, removing ------------------------------------------ */

  type Draft = {
    name: string;
    species: string;
    waterEvery: number;
    light: string;
    icon: PlantIconName;
    photo?: string;
    photoFile?: File;
  };

  /**
   * Claim an un-onboarded garden the moment this page puts a plant in it.
   *
   * THIS PREVENTS THE TWO PAGES FROM DESTROYING EACH OTHER. They share one store, but
   * the grid app gates on `onboarded` and shows its welcome screen until it is set — and
   * one of that screen's two buttons is "start with an example", which REPLACES the
   * plant list. Someone who started here, built a garden, then opened the grid would be
   * offered a button that silently threw it away.
   *
   * Adding your first plant IS the onboarding, so the deck records it as such. The name
   * is left empty because this page never asks for one; the grid already renders a
   * nameless greeting correctly, and `seed: false` keeps the plants that are there.
   */
  const claim = React.useCallback(() => {
    if (!onboarded) completeOnboarding({ userName: '', seed: false });
  }, [completeOnboarding, onboarded]);

  /**
   * Work out the plant's photo list, moving blobs in and out of IndexedDB as needed.
   *
   * PHOTOGRAPHS CANNOT GO IN THE BLOB. localStorage has a ~5MB ceiling that two phone
   * pictures would blow straight through, so the garden record holds only an `idb:`
   * reference and the bytes live in IndexedDB (see lib/photos.ts). The form hands up the
   * File; putting it away is this layer's job.
   *
   * A write that fails returns null rather than throwing, and a plant with no picture is
   * a working plant — the pressing illustration takes over. So the save still goes
   * through and the failure is reported instead of being swallowed.
   */
  const persistPhoto = React.useCallback(
    async (draft: Draft, previous: Plant | undefined): Promise<Plant['photos']> => {
      const existing = previous?.photos ?? [];
      const old = existing[0]?.uri;

      if (draft.photoFile) {
        const uri = await savePhoto(draft.photoFile);
        if (!uri) {
          setPhotoError('That photograph could not be saved, so the plant was kept without it.');
          return existing;
        }
        if (old) await deletePhotos([old]);
        return [{ date: new Date().toISOString().slice(0, 10), uri }];
      }

      // '' means the photograph was cleared; anything else means it was left alone.
      if (draft.photo === '') {
        if (old) await deletePhotos([old]);
        return [];
      }
      return existing;
    },
    [],
  );

  const save = React.useCallback(
    async (draft: Draft) => {
      setPhotoError(null);
      const at = new Date();
      const { photo: _photo, photoFile: _file, ...fields } = draft;

      if (editing === 'new') {
        const id = `p${at.getTime().toString(36)}`;
        const photos = await persistPhoto(draft, undefined);
        claim();
        addPlant({
          id,
          ...fields,
          pressing: 'default',
          // A plant you are adding today is a plant you have just dealt with, so it
          // starts fresh rather than instantly thirsty.
          lastWateredISO: at.toISOString(),
          location: 'indoor',
          addedISO: at.toISOString(),
          photos,
          journal: [],
        });
        // Dealt to the front, so the thing you just made is the thing you are looking
        // at. Set in the same batch as the add, so the reconciler above sees the id
        // already placed and does not append it to the back as well.
        setQueue((q) => [id, ...q]);
        setView('deck');
      } else if (editing) {
        const photos = await persistPhoto(draft, byId.get(editing));
        updatePlant(editing, { ...fields, photos });
      }
      setEditing(null);
    },
    [addPlant, byId, claim, editing, persistPhoto, updatePlant],
  );

  /**
   * Fill an empty garden with the eight demo plants.
   *
   * These go in as REAL plants — written, logged, editable, removable — because a fake
   * garden that cannot be edited teaches you nothing about the app. It is offered only
   * when there is nothing to lose, so it can never overwrite a garden you have tended.
   */
  const plantDemo = React.useCallback(() => {
    claim();
    demoPlants(new Date())
      .sort((a, b) => byThirst(a, b, new Date()))
      .forEach(addPlant);
    setView('deck');
  }, [addPlant, claim]);

  const remove = React.useCallback(() => {
    if (!editing || editing === 'new') return;
    const id = editing;
    // The store drops the plant and its log; the blobs are ours to clean up, because the
    // store never touches storage itself. A failed delete wastes space and nothing more,
    // so it is not awaited and not surfaced.
    void deletePhotos((byId.get(id)?.photos ?? []).map((ph) => ph.uri));
    removePlant(id);
    setQueue((q) => q.filter((x) => x !== id));
    els.current.delete(id);
    setTurnedId(null);
    setEditing(null);
  }, [byId, editing, removePlant]);

  /** A handful of droplets, thrown and discarded. */
  const splash = React.useCallback(
    (el: HTMLElement) => {
      if (reduce) return;
      for (let i = 0; i < 14; i += 1) {
        const drop = document.createElement('span');
        drop.className = 'drop';
        el.appendChild(drop);
        gsap.fromTo(
          drop,
          { x: gsap.utils.random(-70, 70), y: -150, opacity: 1, scale: gsap.utils.random(0.5, 1.2) },
          {
            y: gsap.utils.random(60, 220),
            x: `+=${gsap.utils.random(-40, 40)}`,
            opacity: 0,
            duration: gsap.utils.random(0.45, 0.85),
            delay: i * 0.018,
            ease: 'power1.in',
            onComplete: () => drop.remove(),
          },
        );
      }
    },
    [reduce],
  );

  /**
   * Water the front card: flood the colour back to fresh, splash, and off the top.
   *
   * GSAP is handed the `oklab()` string directly — its colour plugin parses it and
   * interpolates component-wise, the same as palette.ts does. The sRGB path between
   * these colours runs somewhere muddy, which is the whole reason for OKLab (D14).
   */
  const water = React.useCallback(() => {
    const id = frontId;
    const el = id ? els.current.get(id) : undefined;
    const tilt = tiltOf(el);
    if (!id || !el || !tilt || busy) return;
    setBusy(true);

    // Watering happens from the back, so turn the card face up first — a CSS
    // transition, which means the pour just waits for it rather than driving it.
    const wasTurned = turnedId === id;
    setTurnedId(null);

    if (reduce) {
      settle(id, 'watered');
      return;
    }

    later(() => {
      const tl = gsap.timeline();
      tl.to(tilt, { scaleY: 0.92, scaleX: 1.06, duration: 0.1, ease: 'power2.out' })
        .add(() => splash(el), '<')
        .to(
          el.querySelector('.card__field'),
          { backgroundColor: cardColor(0), duration: 0.42, ease: 'power2.out' },
          '<0.04',
        )
        .to(el.querySelector('.card__state'), { opacity: 0, scale: 0.8, duration: 0.2 }, '<')
        .to(tilt, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, '<')
        // It slides under the deck rather than off the screen: it is going to the
        // back of the stack, not away.
        .to(tilt, { y: 150, scale: 0.96, opacity: 0, duration: 0.3, ease: 'power2.in' });
      finish(tl, () => settle(id, 'watered'));
    }, wasTurned ? 420 : 0);
  }, [busy, finish, frontId, later, reduce, settle, splash, turnedId]);

  /**
   * Cycle the deck. Pure state changes — no animation call at all.
   *
   * The cards' resting transforms are declarative, so reordering the queue is enough:
   * every card transitions to its new depth on its own, and the one that left the
   * front travels to the back of the stack as a side effect of being there. That also
   * makes the moves interruptible, which is what lets a scroll gesture run through
   * eight cards without queueing up eight animations.
   */
  const next = React.useCallback(() => {
    if (busy || queue.length < 2) return;
    setTurnedId(null);
    setQueue((q) => [...q.slice(1), q[0]]);
  }, [busy, queue.length]);

  const prev = React.useCallback(() => {
    if (busy || queue.length < 2) return;
    setTurnedId(null);
    setQueue((q) => [q[q.length - 1], ...q.slice(0, -1)]);
  }, [busy, queue.length]);

  const cycling = () =>
    view === 'deck' && !busy && !flipping && !isTurned && queue.length > 1;

  /** Scroll over the deck to run through it, the way you thumb a stack of cards. */
  const onWheel = (e: React.WheelEvent) => {
    if (!cycling()) return;
    const w = wheel.current;
    const t = e.timeStamp;
    const d = wheelPx(e);
    const ad = Math.abs(d);

    // A quiet moment ends the gesture, whatever state it was in.
    if (t - w.at > WHEEL_IDLE_MS) {
      w.acc = 0;
      w.peak = 0;
    }
    w.at = t;
    w.peak = Math.max(w.peak, ad);

    // ONLY THE LEADING EDGE OF A GESTURE COUNTS. While you are pushing, each event is
    // at or near the gesture's peak. Once your fingers leave, the deltas decay, and
    // those are the browser telling us about momentum rather than about you. Gating
    // the accumulation on this — rather than only suppressing after an advance — is
    // what takes one flick from five cards to one: the rate cap below would otherwise
    // expire mid-tail and let the coasting events fire a second time.
    if (ad < w.peak * COAST_RATIO) return;

    w.acc += d;
    if (Math.abs(w.acc) < WHEEL_STEP) return;
    if (t - w.firedAt < WHEEL_MIN_GAP_MS) {
      // Over the line but too soon. Hold the distance rather than dropping it, so a
      // steady scroll keeps its place instead of stuttering.
      w.acc = Math.sign(w.acc) * WHEEL_STEP;
      return;
    }

    const forward = w.acc > 0;
    w.acc = 0;
    w.firedAt = t;
    if (forward) next();
    else prev();
  };

  /* ---- swiping ------------------------------------------------------------- */

  /**
   * The same cycling, for a thumb. The hint promised "swipe" long before anything
   * listened for one — there is no wheel event on a phone, and `touch-action: none`
   * means the page will not scroll either, so without this the deck was unreachable
   * by touch entirely.
   *
   * Vertical only. Horizontal throws were tried and rejected: a swipe commits before
   * you have read anything, and nothing about a direction means "water".
   */
  const onSwipeStart = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || !cycling()) return;
    if ((e.target as HTMLElement).closest('button')) return;
    swipe.current = { y0: e.clientY, dy: 0, active: true };
  };

  const onSwipeMove = (e: React.PointerEvent) => {
    const sw = swipe.current;
    if (!sw?.active) return;
    sw.dy = e.clientY - sw.y0;
    const tilt = tiltOf(frontEl());
    // The card tracks the thumb at half rate — enough to show it is attached to the
    // gesture, damped enough that it never looks like it is being thrown.
    if (tilt) gsap.set(tilt, { y: sw.dy * 0.45, scale: 1 - Math.min(0.04, Math.abs(sw.dy) / 2600) });
  };

  const onSwipeEnd = () => {
    const sw = swipe.current;
    if (!sw?.active) return;
    swipe.current = null;
    const tilt = tiltOf(frontEl());
    const committed = Math.abs(sw.dy) >= SWIPE_PX;
    if (tilt) {
      if (committed) gsap.set(tilt, { clearProps: 'all' });
      else gsap.to(tilt, { y: 0, scale: 1, duration: 0.32, ease: 'power3.out' });
    }
    if (!committed) return;
    if (sw.dy < 0) next();
    else prev();
  };

  /* ---- deck <-> grid ------------------------------------------------------- */

  /**
   * The one place GSAP Flip belongs.
   *
   * Everywhere else in this file the cards keep the same box and only their transforms
   * differ, which a transition handles. Going to the grid is a real LAYOUT change —
   * absolutely positioned cards become grid children — and Flip exists precisely to
   * animate that: measure before, let the DOM change, animate the difference.
   */
  const toggleView = React.useCallback(() => {
    if (busy || flipping) return;
    flipFrom.current = Flip.getState([...els.current.values()]);
    setTurnedId(null);
    setView((v) => (v === 'deck' ? 'grid' : 'deck'));
  }, [busy, flipping]);

  React.useLayoutEffect(() => {
    const from = flipFrom.current;
    if (!from) return;
    flipFrom.current = null;
    setFlipping(true);

    const stack = stage.current?.querySelector('.deck__stack');
    // While Flip drives transforms, the cards' own CSS transition must stand down or
    // the two fight over the same property.
    stack?.classList.add('deck__stack--flipping');

    /**
     * Put every card in the state the CURRENT view says it should be in, and clear
     * everything any animation left behind.
     *
     * This has to be authoritative for BOTH views, not just the deck. An earlier cut
     * only re-asserted deck positions and let Flip clean up after itself in the grid —
     * which it does, unless it is interrupted. Toggling again mid-flight left every
     * tile carrying a stranded stack transform, and the grid came out as a staircase
     * of overlapping cards. Idempotent and run on a timer as well as on completion, so
     * an abandoned animation cannot leave the deck looking broken.
     */
    const land = () => {
      stack?.classList.remove('deck__stack--flipping');
      queue.forEach((id, depth) => {
        const el = els.current.get(id);
        if (!el) return;
        const tilt = el.querySelector('.card__tilt');
        if (tilt) gsap.set(tilt, { clearProps: 'all' });
        if (view === 'grid') {
          // The CSS grid places the tile. Nothing inline may survive.
          el.style.cssText = '';
        } else {
          Object.assign(el.style, restingStyle(depth, queue.length, false));
        }
      });
      setFlipping(false);
    };

    if (reduce) {
      land();
      return;
    }
    Flip.from(from, {
      duration: 0.62,
      ease: 'power3.inOut',
      absolute: true,
      stagger: 0.025,
      onComplete: land,
    });
    // Flip is an animation, so it is on the unreliable side of the line: if the ticker
    // never runs, land() still puts everything where it belongs.
    later(land, 1200);
  }, [later, queue, reduce, view]);

  /** From the grid: bring this plant to the front and fold back into the deck. */
  const deal = React.useCallback(
    (id: string) => {
      if (busy || flipping) return;
      const cards = [...els.current.values()];
      flipFrom.current = Flip.getState(cards);
      setQueue((q) => [id, ...q.filter((x) => x !== id)]);
      setTurnedId(null);
      setView('deck');
    },
    [busy, flipping],
  );

  /* ---- tilt ---------------------------------------------------------------- */

  /**
   * Measured against the STACK, not the card.
   *
   * The card is the thing being rotated, so using its own bounding box feeds the
   * rotation back into the input that produced it and the tilt chases the cursor
   * around. The stack never rotates, so it is a stable frame of reference.
   */
  const onPointerMove = (e: React.PointerEvent) => {
    if (reduce || busy || isTurned || e.pointerType === 'touch') return;
    const stack = stage.current?.querySelector('.deck__stack');
    const tilt = tiltOf(frontEl());
    if (!stack || !tilt) return;
    const r = stack.getBoundingClientRect();
    const px = gsap.utils.clamp(-0.6, 0.6, (e.clientX - r.left) / r.width - 0.5);
    const py = gsap.utils.clamp(-0.6, 0.6, (e.clientY - r.top) / r.height - 0.5);
    gsap.to(tilt, {
      rotationY: px * 13,
      rotationX: -py * 13,
      duration: 0.5,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const onPointerLeave = () => {
    const tilt = tiltOf(frontEl());
    if (tilt) gsap.to(tilt, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power2.out' });
  };

  /* ---- keyboard ------------------------------------------------------------ */

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        turn(!isTurned);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        toggleView();
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        water();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTurned, next, prev, toggleView, turn, water]);

  /**
   * Deal the pass again, in thirst order.
   *
   * This used to be "deal again" on a finished deck, back when watering took the card
   * away and the deck could run out. It cannot any more — a watered card stays and
   * rotates to the back — so the only way the deck empties is an empty garden. What the
   * button is actually good for now is re-sorting a pass you have shuffled by scrolling.
   */
  const reset = React.useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    queue.forEach(clearFlourish);
    setBusy(false);
    setTurnedId(null);
    const at = new Date();
    setQueue([...plants].sort((a, b) => byThirst(a, b, at)).map((p) => p.id));
  }, [clearFlourish, plants, queue]);

  /** A garden with nothing in it — the first run, not a finished pass. */
  const empty = plants.length === 0;
  const thirsty = plants.filter((p) => drynessOf(p, now) >= 1).length;

  return (
    <div className="deck" ref={stage}>
      <header className="deck__top">
        <span className="deck__mark">Juniper</span>
        <div className="deck__top-right">
          {/*
            The count doubles as the re-deal. Scrolling shuffles the pass, and after a
            few minutes of it the card in front is wherever you stopped rather than the
            one that needs you — tapping the thing that says how many are thirsty to put
            the thirstiest back on top is the one gesture that needs no label.
          */}
          {view === 'deck' && plants.length > 1 ? (
            <button
              className="deck__count deck__count--act"
              onClick={reset}
              disabled={busy || flipping}
              title="Deal again, thirstiest first"
            >
              {thirsty === 0 ? 'all watered' : `${thirsty} thirsty`}
            </button>
          ) : (
            <span className="deck__count">
              {empty
                ? 'no plants'
                : view === 'grid'
                  ? `${plants.length} ${plants.length === 1 ? 'plant' : 'plants'}`
                  : thirsty === 0
                    ? 'all watered'
                    : `${thirsty} thirsty`}
            </span>
          )}
          <button className="deck__view" onClick={toggleView} disabled={busy || flipping}>
            {view === 'deck' ? 'grid' : 'deck'}
          </button>
          <button
            className="deck__add"
            onClick={() => setEditing('new')}
            disabled={busy || flipping}
            aria-label="Add a plant"
          >
            +
          </button>
        </div>
      </header>

      <div
        className={`deck__stage deck__stage--${view}`}
        onPointerMove={(e) => {
          onSwipeMove(e);
          onPointerMove(e);
        }}
        onPointerDown={onSwipeStart}
        onPointerUp={onSwipeEnd}
        onPointerCancel={onSwipeEnd}
        onPointerLeave={() => {
          onSwipeEnd();
          onPointerLeave();
        }}
        onWheel={onWheel}
      >
        <div className={`deck__stack${view === 'grid' ? ' deck__stack--grid' : ''}`}>
          {/*
            EVERY PLANT IS RENDERED, ALWAYS, in a stable garden order. A card's place
            in the deck is `depth`, and -1 means "not in this pass" — invisible in the
            deck, present in the grid. Keeping one element per plant in the DOM also
            means deck<->grid has no cards entering or leaving, which is the easiest
            kind of Flip there is.
          */}
          {plants.map((plant) => {
            const depth = queue.indexOf(plant.id);
            return (
              <DeckCard
                key={plant.id}
                plant={plant}
                dryness={drynessOf(plant, now)}
                now={now}
                depth={depth}
                count={queue.length}
                view={view}
                turned={view === 'deck' && depth === 0 && isTurned}
                busy={busy}
                onTurn={() => (view === 'grid' ? deal(plant.id) : turn(!isTurned))}
                onEdit={() => setEditing(plant.id)}
                onWater={water}
                register={register}
              />
            );
          })}
          {view === 'grid' && (
            <button className="tile-add" onClick={() => setEditing('new')}>
              <span className="tile-add__plus">+</span>
              <span className="tile-add__k">add a plant</span>
            </button>
          )}
        </div>

        {/*
          THE FIRST RUN, which the prototype never had to show: it started with eight
          demo plants baked in. A real garden starts at nothing, and a deck of nothing
          is a blank screen — so this is the one place the app has to say what it is for
          and give you a way in.
        */}
        {empty && (
          <div className="deck__done">
            <p className="deck__done-k">your garden</p>
            <p className="deck__done-t deck__done-t--lead">
              Nothing in it yet. Add a plant and it becomes the first card.
            </p>
            <div className="deck__done-acts">
              <button className="deck__again" onClick={() => setEditing('new')}>
                add a plant
              </button>
              <button className="deck__again" onClick={plantDemo}>
                try a demo garden
              </button>
            </div>
          </div>
        )}
      </div>

      {/*
        THE RAIL REPLACED A 82px BUTTON that did what scrolling already did. On an
        iPhone SE the old bar and hint took 111px — 17% of the screen — for the least
        important action on it. This is 44px, it gives `prev` the touch affordance it
        never had, and it says what is coming next instead of naming the gesture.
      */}
      <div className="rail" data-hidden={empty || view === 'grid' || undefined}>
        <button
          className="rail__arrow"
          onClick={prev}
          disabled={busy || flipping || queue.length < 2}
          aria-label="Previous plant"
        >
          ‹
        </button>
        <span className="rail__next">
          {queue.length > 1 ? `next · ${byId.get(queue[1])?.name ?? ''}` : 'last card'}
        </span>
        <button
          className="rail__arrow"
          onClick={next}
          disabled={busy || flipping || queue.length < 2}
          aria-label="Next plant"
        >
          ›
        </button>
      </div>

      {/*
        A FAILED WRITE IS NOT SILENT (DECISIONS.md D13). In a browser the stored blob is
        the only copy of the garden — there is no phone behind it — so someone tending a
        garden all month that was never being saved has to be told on the spot.
      */}
      {(storageError || photoError) && (
        <p className="deck__alarm" role="status">
          {storageError ?? photoError}
        </p>
      )}

      <p className="deck__hint">
        {/* An empty garden has no gesture to teach. */}
        {empty
          ? ''
          : view === 'grid'
            ? 'tap a plant to deal it to the front'
            : isTurned
              ? 'tap the card to turn it back'
              : 'scroll or swipe through the deck'}
      </p>

      {editing && (
        <PlantForm
          key={editing}
          plant={editing === 'new' ? undefined : byId.get(editing)}
          onSave={save}
          onRemove={editing === 'new' ? undefined : remove}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
