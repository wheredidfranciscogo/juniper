/**
 * Add a plant.
 *
 * Six fields, all of which configure something real: the name and species are what the
 * square says, the cadence drives the whole dryness ramp, and the silhouette and tone
 * are what the square looks like until there is a photograph. Nothing here is asked for
 * personality's sake — see DECISIONS.md D11.
 */

import * as React from 'react';

import type { Plant, PlantIconName, PressingTone } from '../data/types';
import { uid } from '../lib/store';
import { PLANT_ICONS } from './icons';

const ICONS = Object.keys(PLANT_ICONS) as PlantIconName[];
const TONES: PressingTone[] = ['default', 'moss', 'clay', 'deep'];

export interface AddPlantProps {
  onAdd: (plant: Plant, photo: File | null) => void;
  onClose: () => void;
}

export function AddPlant({ onAdd, onClose }: AddPlantProps) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const [name, setName] = React.useState('');
  const [species, setSpecies] = React.useState('');
  const [waterEvery, setWaterEvery] = React.useState('7');
  const [light, setLight] = React.useState('bright indirect');
  const [icon, setIcon] = React.useState<PlantIconName>('leaf');
  const [tone, setTone] = React.useState<PressingTone>('default');
  const [photo, setPhoto] = React.useState<File | null>(null);

  React.useLayoutEffect(() => {
    dialog.current?.showModal();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const every = Math.max(1, Math.round(Number(waterEvery) || 7));
    const nowISO = new Date().toISOString();
    onAdd(
      {
        id: uid('pl'),
        name: trimmed,
        species: species.trim() || 'Unknown species',
        pressing: tone,
        icon,
        waterEvery: every,
        // A new plant counts as watered today. Starting it due would have the grid
        // demand water from a plant you have just potted and almost certainly watered.
        lastWateredISO: nowISO,
        light: light.trim() || 'bright indirect',
        addedISO: nowISO,
        photos: [],
        journal: [],
      },
      photo,
    );
  };

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Add a plant"
      data-testid="add-plant"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <form onSubmit={submit}>
        <h2>A new plant</h2>

        <label className="field">
          <span>Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marcel"
            data-testid="add-name"
            required
          />
        </label>

        <label className="field">
          <span>Species</span>
          <input
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="Monstera deliciosa"
            data-testid="add-species"
          />
        </label>

        <label className="field">
          <span>Water every</span>
          <input
            type="number"
            min="1"
            max="365"
            inputMode="numeric"
            value={waterEvery}
            onChange={(e) => setWaterEvery(e.target.value)}
            data-testid="add-cadence"
          />
        </label>

        <label className="field">
          <span>Light</span>
          <select value={light} onChange={(e) => setLight(e.target.value)}>
            <option value="bright indirect">bright indirect</option>
            <option value="direct sun">direct sun</option>
            <option value="partial shade">partial shade</option>
            <option value="low light">low light</option>
          </select>
        </label>

        <label className="field">
          <span>Silhouette</span>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value as PlantIconName)}
            data-testid="add-icon"
          >
            {ICONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Pressing</span>
          <select value={tone} onChange={(e) => setTone(e.target.value as PressingTone)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Photograph</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            data-testid="add-photo"
          />
        </label>

        <div className="sheet__actions">
          <button type="submit" className="btn btn--primary" data-testid="add-submit">
            Add
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
