/**
 * Adding and editing a plant, as a card you fill in.
 *
 * A native <dialog> with showModal(), which buys the focus trap, Escape-to-close and
 * an inert background for free — the same reason the grid app's PlantPeek uses one.
 *
 * ONE FORM FOR BOTH. Add and edit differ only in what the fields start as and whether
 * removing is possible, and splitting them into two components is how the two drift
 * apart. `plant` undefined means a new plant.
 */

import * as React from 'react';

import { PlantIcon } from '../components/icons';
import type { Plant, PlantIconName } from '../data/types';

const ICONS: PlantIconName[] = [
  'seedling',
  'leaf',
  'monstera',
  'fern',
  'cactus',
  'flower',
  'herb',
];

const LIGHTS = ['Full sun', 'Bright, indirect', 'Shade', 'Low'];

export interface PlantFormProps {
  /** Undefined when adding. */
  plant?: Plant;
  onSave: (draft: {
    name: string;
    species: string;
    waterEvery: number;
    light: string;
    icon: PlantIconName;
    /** An object URL, or '' to clear, or undefined to leave the photo alone. */
    photo?: string;
  }) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export function PlantForm({ plant, onSave, onRemove, onClose }: PlantFormProps) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const [name, setName] = React.useState(plant?.name ?? '');
  const [species, setSpecies] = React.useState(plant?.species ?? '');
  const [every, setEvery] = React.useState(String(plant?.waterEvery ?? 7));
  const [light, setLight] = React.useState(plant?.light ?? 'Bright, indirect');
  const [icon, setIcon] = React.useState<PlantIconName>(plant?.icon ?? 'seedling');
  const [confirming, setConfirming] = React.useState(false);
  const [photo, setPhoto] = React.useState<string | undefined>(plant?.photos[0]?.uri);
  const made = React.useRef<string[]>([]);

  // Object URLs pin their blob in memory until revoked. The one that is saved is
  // handed on; every other one this form made is its own to clean up.
  React.useEffect(
    () => () => {
      made.current.filter((u) => u !== photo).forEach(URL.revokeObjectURL);
    },
    [photo],
  );

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    made.current.push(url);
    setPhoto(url);
  };

  React.useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const named = name.trim();
  // A cadence of zero divides by zero in dryness(); the floor is enforced here too so
  // the field cannot be the thing that produces it.
  const days = Math.min(365, Math.max(1, Math.round(Number(every) || 0)));
  const valid = named.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      name: named,
      species: species.trim() || 'Unknown species',
      waterEvery: days,
      light,
      icon,
      photo: photo ?? '',
    });
  };

  return (
    <dialog ref={dialog} className="sheet" onClose={onClose} onCancel={onClose}>
      <form className="sheet__card" onSubmit={submit}>
        <header className="sheet__head">
          <h2 className="sheet__title">{plant ? 'Edit plant' : 'New plant'}</h2>
          <button type="button" className="sheet__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <label className="field">
          <span className="field__k">name</span>
          <input
            className="field__in"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marcel"
            autoFocus
            maxLength={40}
          />
        </label>

        <label className="field">
          <span className="field__k">species</span>
          <input
            className="field__in"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="Monstera deliciosa"
            maxLength={60}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field__k">water every</span>
            <input
              className="field__in"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={every}
              onChange={(e) => setEvery(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__k">light</span>
            <select
              className="field__in"
              value={light}
              onChange={(e) => setLight(e.target.value)}
            >
              {LIGHTS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <span className="field__k">photograph</span>
          <div className="shot">
            <div className="shot__well">
              {photo ? <img className="shot__img" src={photo} alt="" /> : <span>none</span>}
            </div>
            <div className="shot__acts">
              <label className="shot__btn">
                {photo ? 'replace' : 'choose'}
                <input type="file" accept="image/*" onChange={pick} hidden />
              </label>
              {photo && (
                <button type="button" className="shot__btn" onClick={() => setPhoto(undefined)}>
                  clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="field">
          <span className="field__k">
            silhouette{photo ? ' · shown when there is no photograph' : ''}
          </span>
          <div className="glyphs" role="radiogroup" aria-label="Silhouette">
            {ICONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`glyphs__b${n === icon ? ' glyphs__b--on' : ''}`}
                aria-pressed={n === icon}
                aria-label={n}
                onClick={() => setIcon(n)}
              >
                <PlantIcon name={n} size={26} stroke={1.5} />
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__foot">
          <button type="submit" className="sheet__save" disabled={!valid}>
            {plant ? 'save' : 'add to the garden'}
          </button>

          {onRemove &&
            (confirming ? (
              <div className="sheet__confirm">
                <span>Remove {plant?.name}? This cannot be undone.</span>
                <div className="sheet__confirm-row">
                  <button type="button" className="sheet__no" onClick={() => setConfirming(false)}>
                    keep
                  </button>
                  <button type="button" className="sheet__yes" onClick={onRemove}>
                    remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="sheet__remove"
                onClick={() => setConfirming(true)}
              >
                remove from the garden
              </button>
            ))}
        </div>
      </form>
    </dialog>
  );
}
