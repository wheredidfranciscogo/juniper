/**
 * One plant, one square.
 *
 * The square's field drifts from moss to dried as the plant goes from watered to due;
 * the drop in its corner waters it without leaving the grid; the square itself opens the
 * plant. See DECISIONS.md D12, and styles/tile.css for how the colour actually works.
 *
 * TWO THINGS HERE ARE DELIBERATE AND EASY TO "FIX" WRONGLY:
 *
 * 1. THE PHOTO IS MATTED, NOT WASHED. The colour is a border around the picture rather
 *    than a tint over it. Tinting would mean the thirstiest plants — the ones you most
 *    need to recognise — are the ones rendered least recognisable.
 *
 *    A PLANT WITH NO PHOTOGRAPH HAS NOTHING TO PROTECT, so it gets no mat: the
 *    silhouette sits straight on the dryness colour and the whole square is the signal.
 *    This was found by looking. With a mat on every square the colour was a thin frame
 *    around a pale middle, and a frame is too little colour to read across a room —
 *    which is the one job the grid has.
 *
 * 2. THE TWO CONTROLS ARE SIBLINGS, NOT NESTED. The open button covers the square and
 *    the water button sits above it. A button inside a button is invalid HTML, and the
 *    native version's nested version had a real bug: tapping the disabled tick fell
 *    through to the parent and opened the plant. Here the tick swallows its own click.
 */

import * as React from 'react';

import type { Plant } from '../data/types';
import { usePhotoURL } from '../lib/use-photo';
import { coverPhotoUri } from '../lib/cover';
import { rampColor } from '../lib/ramp';
import { IconCheck, IconDrop } from './icons';
import { Pressing } from './Pressing';

/** How long the square holds full moss before it starts sinking back. */
const POUR_MS = 180;

export interface PlantTileProps {
  plant: Plant;
  /** 0 = just watered, 1 = due. Saturates at 1; see lib/dryness.ts. */
  dryness: number;
  /** "Marcel, 3 days to go" — what colour alone cannot say. */
  label: string;
  wateredToday: boolean;
  onOpen: (rect: DOMRect) => void;
  onWater: () => void;
}

export function PlantTile({
  plant,
  dryness,
  label,
  wateredToday,
  onOpen,
  onWater,
}: PlantTileProps) {
  const photo = usePhotoURL(coverPhotoUri(plant));
  const [pouring, setPouring] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<number>(0);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const water = () => {
    if (wateredToday) return;
    setPouring(true);
    window.clearTimeout(timer.current);
    // Releasing the class is what starts the long sink back — the two directions have
    // different durations, which is the whole trick. See styles/tile.css.
    timer.current = window.setTimeout(() => setPouring(false), POUR_MS);
    onWater();
  };

  return (
    <div
      ref={root}
      className={`tile${pouring ? ' tile--pouring' : ''}`}
      style={{ backgroundColor: rampColor(dryness) }}
      data-testid={`tile-${plant.id}`}
    >
      <div className="tile__mat">
        {photo ? (
          <img className="tile__photo" src={photo} alt="" />
        ) : (
          <Pressing species={plant.species} icon={plant.icon} tone={plant.pressing} bare />
        )}
      </div>

      <span className="tile__name">{plant.name}</span>

      <button
        type="button"
        className="tile__open"
        aria-label={label}
        data-testid={`tile-open-${plant.id}`}
        onClick={() => {
          const rect = root.current?.getBoundingClientRect();
          if (rect) onOpen(rect);
        }}
      />

      <button
        type="button"
        className="tile__water"
        aria-label={wateredToday ? `${plant.name} was watered today` : `Water ${plant.name}`}
        disabled={wateredToday}
        data-testid={`tile-water-${plant.id}`}
        onClick={(e) => {
          // The square underneath is a button too; without this, watering also opens
          // the plant.
          e.stopPropagation();
          water();
        }}
      >
        {wateredToday ? <IconCheck size={15} stroke={2} /> : <IconDrop size={15} stroke={1.75} />}
      </button>
    </div>
  );
}
