/**
 * The square, bigger.
 *
 * Tapping a tile grows this card out of the exact rectangle the tile occupied, so the
 * plant you touched is visibly the plant that opened. It holds what the native app split
 * across a peek sheet and a separate record screen — on one screen there is no reason to
 * make reading about a plant a second navigation.
 *
 * THE EXPANSION IS A FLIP, AND IT IS MUCH SIMPLER HERE THAN ON NATIVE. The card is laid
 * out where it finally belongs, measured, then transformed back onto the tile's rect and
 * released. `getBoundingClientRect()` answers synchronously, which deletes the native
 * version's whole apparatus: no `measureInWindow` bridge round-trip, no rect cached on
 * layout, no re-measuring when the grid settles after a scroll, no fallback for a rect
 * that never arrived.
 *
 * It is a real <dialog> opened with showModal(), which is what makes Escape, the focus
 * trap and the inert background work without being hand-written.
 */

import * as React from 'react';

import type { Plant } from '../data/types';
import { daysSinceWatered, daysUntilWater } from '../lib/watering';
import { durationLabel, tendedDays } from '../lib/stats';
import { coverPhotoUri } from '../lib/cover';
import { usePhotoURL } from '../lib/use-photo';
import { IconCheck, IconClose, IconDrop } from './icons';
import { Pressing } from './Pressing';

const CLOSE_MS = 240;

/** "today" / "yesterday" / "6 days ago" — the answer alone, under its own heading. */
function wateredWhen(daysSince: number): string {
  if (!Number.isFinite(daysSince) || daysSince < 0) return 'not yet';
  if (daysSince === 0) return 'today';
  if (daysSince === 1) return 'yesterday';
  return `${daysSince} days ago`;
}

export interface PlantPeekProps {
  plant: Plant;
  /** The tile's rect, to grow out of. */
  from: DOMRect | null;
  now: Date;
  onClose: () => void;
  onWater: () => void;
  onAddPhoto: (file: File) => void;
  onRemove: () => void;
}

export function PlantPeek({
  plant,
  from,
  now,
  onClose,
  onWater,
  onAddPhoto,
  onRemove,
}: PlantPeekProps) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const card = React.useRef<HTMLDivElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [closing, setClosing] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  const photo = usePhotoURL(coverPhotoUri(plant));
  const since = daysSinceWatered(plant, now);
  const until = daysUntilWater(plant, now);
  const wateredToday = since === 0;

  /** The transform that puts the card exactly over the tile it came from. */
  const transformFrom = React.useCallback((): string | null => {
    const node = card.current;
    if (!node || !from) return null;
    const to = node.getBoundingClientRect();
    if (!to.width || !to.height) return null;
    const scale = Math.max(0.1, from.width / to.width);
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${scale})`;
  }, [from]);

  // Open. Layout effect, so the card is never painted at full size first.
  React.useLayoutEffect(() => {
    dialog.current?.showModal();
    const node = card.current;
    if (!node) return;

    const start = transformFrom();
    if (!start) return; // No rect to grow from — the CSS fade alone carries it.

    node.style.transition = 'none';
    node.style.transform = start;
    node.style.opacity = '0.6';

    const frame = requestAnimationFrame(() => {
      node.style.transition = '';
      node.style.transform = '';
      node.style.opacity = '';
    });
    return () => cancelAnimationFrame(frame);
  }, [transformFrom]);

  const close = React.useCallback(() => {
    if (closing) return;
    setClosing(true);
    const node = card.current;
    const back = transformFrom();
    if (node && back) {
      node.style.transform = back;
      node.style.opacity = '0';
    }
    // Unmounted by the parent on a timer rather than on transitionend, which does not
    // fire at all when the motion is reduced away to nothing.
    window.setTimeout(onClose, CLOSE_MS);
  }, [closing, onClose, transformFrom]);

  const status = wateredToday
    ? 'Watered today'
    : until <= 0
      ? 'Due for water'
      : until === 1
        ? 'Due tomorrow'
        : `${until} days to go`;

  return (
    <dialog
      ref={dialog}
      className="peek"
      aria-label={plant.name}
      data-testid="plant-peek"
      onCancel={(e) => {
        e.preventDefault(); // Run the close animation instead of vanishing.
        close();
      }}
      onClick={(e) => {
        // A click that lands on the dialog itself landed on the backdrop, because the
        // card fills the dialog's content box.
        if (e.target === dialog.current) close();
      }}
    >
      <div ref={card} className="peek__card" data-testid="peek-card">
        <div className="peek__photo">
          {photo ? (
            <img src={photo} alt={plant.name} />
          ) : (
            <Pressing species={plant.species} icon={plant.icon} tone={plant.pressing} big />
          )}
          <button
            type="button"
            className="peek__close"
            aria-label="Close"
            data-testid="peek-close"
            onClick={close}
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="peek__body">
          <h2 className="peek__name">{plant.name}</h2>
          <p className="peek__species">{plant.species}</p>
          {plant.nickname && <p className="peek__nickname">{plant.nickname}</p>}

          <p className="peek__status" data-testid="peek-status">
            {status}
          </p>

          <dl className="peek__facts">
            <div>
              <dt>Water</dt>
              <dd>every {plant.waterEvery} days</dd>
            </div>
            <div>
              <dt>Light</dt>
              <dd>{plant.light}</dd>
            </div>
            <div>
              <dt>Last watered</dt>
              {/*
                `lastWateredLabel` returns a whole sentence ("Last watered Wednesday."),
                which under a "LAST WATERED" heading says it twice. The heading already
                carries the subject, so this is only the answer.
              */}
              <dd>{wateredWhen(since)}</dd>
            </div>
            <div>
              <dt>In your care</dt>
              <dd>{durationLabel(tendedDays(plant, now))}</dd>
            </div>
          </dl>

          {plant.journal.length > 0 && (
            <div className="peek__journal">
              <span className="overline">Notes</span>
              {plant.journal.slice(0, 3).map((note) => (
                <p key={`${note.date}-${note.text.slice(0, 12)}`}>
                  <span className="peek__journal-date">{note.date}</span>
                  {note.text}
                </p>
              ))}
            </div>
          )}

          <div className="peek__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={wateredToday}
              data-testid="peek-water"
              onClick={onWater}
            >
              {wateredToday ? <IconCheck size={16} stroke={2} /> : <IconDrop size={16} />}
              {wateredToday ? 'Watered today' : 'Water'}
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              data-testid="peek-photo"
              onClick={() => fileInput.current?.click()}
            >
              {photo ? 'Replace photo' : 'Add a photo'}
            </button>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              data-testid="peek-file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Reset, so picking the same file twice still fires a change.
                e.target.value = '';
                if (file) onAddPhoto(file);
              }}
            />
          </div>

          {confirmRemove ? (
            <p className="peek__confirm">
              Remove {plant.name} and everything recorded about it? This cannot be undone.
              <span>
                <button
                  type="button"
                  className="btn btn--danger"
                  data-testid="peek-remove-confirm"
                  onClick={() => {
                    onRemove();
                    onClose();
                  }}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setConfirmRemove(false)}
                >
                  Keep
                </button>
              </span>
            </p>
          ) : (
            <button
              type="button"
              className="peek__remove"
              data-testid="peek-remove"
              onClick={() => setConfirmRemove(true)}
            >
              Remove this plant
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
