import type { PlantIconName } from '../components/icons';
import type { PressingTone } from '../components/Pressing';

export type ArchetypeKey = 'whisperer' | 'collector' | 'forager' | 'steady';

export interface Archetype {
  name: string;
  blurb: string;
  body: string;
}

export interface PlantPhoto {
  date: string; // ISO or display string
  label?: string;
  uri?: string; // Set on user-captured photos (camera or library).
}

export interface JournalEntry {
  date: string;
  text: string;
}

export interface Plant {
  id: string;
  name: string;
  species: string;
  nickname?: string;
  pressing: PressingTone;
  icon: PlantIconName;
  /** Watering cadence in whole days. */
  waterEvery: number;
  /**
   * Absolute timestamp of the last watering. Everything time-related — thirsty state,
   * "last watered" copy, the next reminder — is derived from this via src/lib/watering.ts.
   * It replaced a stored `daysSinceWater` counter that nothing ever incremented, which
   * meant a plant watered once could never become thirsty again.
   */
  lastWateredISO: string;
  light: string;
  temp: string;
  tendedDays: number;
  addedISO: string;
  photos: PlantPhoto[];
  journal: JournalEntry[];
}

export type LogKind = 'water' | 'repot' | 'fertilize' | 'move' | 'note' | 'joined' | 'observed';

export interface LogEntry {
  id: string;
  plantId: string;
  kind: LogKind;
  text: string;
  when: string; // ISO timestamp
}

export interface OnboardingOption {
  v: string;
  label: string;
  hint: string;
  icon: string;
}

export interface OnboardingStep {
  key: string;
  question: string;
  options: OnboardingOption[];
}

export type OnboardingAnswers = Record<string, string>;
