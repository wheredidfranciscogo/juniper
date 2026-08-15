import { pickArchetype, plantsSeed, ONBOARDING, ARCHETYPES } from '../seed';
import type { Plant } from '../types';
import type { ArchetypeKey, OnboardingAnswers } from '../types';

describe('pickArchetype', () => {
  it('maps herb tenders to the forager', () => {
    expect(pickArchetype({ kind: 'herbs' })).toBe('forager');
  });

  it('maps the craft draw to the whisperer', () => {
    expect(pickArchetype({ draw: 'craft' })).toBe('whisperer');
  });

  it('maps a lifelong history to the whisperer', () => {
    expect(pickArchetype({ history: 'always' })).toBe('whisperer');
  });

  it('maps lots-of-time + calm to the steady hand', () => {
    expect(pickArchetype({ time: 'lots', draw: 'calm' })).toBe('steady');
  });

  it('maps a mixed garden to the collector', () => {
    expect(pickArchetype({ kind: 'mix' })).toBe('collector');
  });

  it('defaults to the whisperer with no answers', () => {
    expect(pickArchetype({})).toBe('whisperer');
  });

  it('prioritises herbs over every other rule', () => {
    const answers: OnboardingAnswers = { kind: 'herbs', draw: 'craft', history: 'always' };
    expect(pickArchetype(answers)).toBe('forager');
  });

  it('prioritises the craft draw over a mixed garden', () => {
    expect(pickArchetype({ kind: 'mix', draw: 'craft' })).toBe('whisperer');
  });

  it('only returns valid archetype keys', () => {
    const keys = Object.keys(ARCHETYPES) as ArchetypeKey[];
    expect(keys).toContain(pickArchetype({ kind: 'mix' }));
  });
});

describe('seed data integrity', () => {
  it('gives every plant a unique id', () => {
    const ids = plantsSeed().map((p: Plant) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every plant the fields the store and UI rely on', () => {
    for (const plant of plantsSeed()) {
      expect(plant.name).toBeTruthy();
      expect(plant.addedISO).toBeTruthy();
      expect(typeof plant.waterEvery).toBe('number');
      expect(Number.isNaN(Date.parse(plant.lastWateredISO))).toBe(false);
      expect(Array.isArray(plant.photos)).toBe(true);
      expect(Array.isArray(plant.journal)).toBe(true);
    }
  });

  it('defines a copy entry for every archetype the picker can return', () => {
    (Object.keys(ARCHETYPES) as ArchetypeKey[]).forEach((key) => {
      expect(ARCHETYPES[key].name).toBeTruthy();
      expect(ARCHETYPES[key].blurb).toBeTruthy();
    });
  });

  it('ships five onboarding questions, each with options and a unique key', () => {
    expect(ONBOARDING).toHaveLength(5);
    const keys = ONBOARDING.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const step of ONBOARDING) {
      expect(step.question).toBeTruthy();
      expect(step.options.length).toBeGreaterThan(0);
    }
  });
});
