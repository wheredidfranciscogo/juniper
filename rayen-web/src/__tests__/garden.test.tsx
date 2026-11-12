/**
 * The garden grid is the whole app, so these cover the things that would quietly break
 * the glance it exists for: watering from a square actually moving the store, squares
 * saying their state in words as well as in colour, the order not shuffling under your
 * thumb, and the card opening on the plant you touched.
 *
 * The colour itself is asserted in src/lib/__tests__/ramp.test.ts, against the pure
 * function the tile's `background-color` comes from. That split is deliberate and is
 * the reason the ramp is a function at all: the previous two implementations put the
 * interpolation inside the browser's style engine, where it broke without failing
 * anything. A test can read a style attribute; it cannot see a colour.
 */

import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '../App';
import type { Plant } from '../data/types';
import { rampColor } from '../lib/ramp';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const plant = (over: Partial<Plant> = {}): Plant => ({
  id: 'marcel',
  name: 'Marcel',
  species: 'Monstera deliciosa',
  pressing: 'moss',
  icon: 'monstera',
  waterEvery: 10,
  lastWateredISO: daysAgo(10), // due
  light: 'bright indirect',
  addedISO: daysAgo(300),
  photos: [],
  journal: [],
  ...over,
});

/**
 * Seed through localStorage rather than through the UI.
 *
 * The store hydrates synchronously from it on first render, so a test gets a real
 * garden on the very first paint with no waiting and no onboarding to click through.
 */
function seed(plants: Plant[], userName = 'June') {
  window.localStorage.setItem(
    '@rayen/store',
    JSON.stringify({
      version: 2,
      state: { onboarded: true, userName, plants, log: [] },
    }),
  );
}

const tile = (id: string) => screen.getByTestId(`tile-${id}`);

beforeEach(() => {
  window.localStorage.clear();
});

describe('the grid', () => {
  it('gives every plant a square', () => {
    seed([plant({ id: 'a', name: 'Marcel' }), plant({ id: 'b', name: 'Fernando' })]);
    render(<App />);
    expect(tile('a')).toBeInTheDocument();
    expect(tile('b')).toBeInTheDocument();
    expect(screen.getByText('Fernando')).toBeInTheDocument();
  });

  it('greets you by the name onboarding collected', () => {
    seed([plant()]);
    render(<App />);
    expect(screen.getByText(/, June$/)).toBeInTheDocument();
  });

  it('counts what is ready for water without passing judgement on it', () => {
    seed([
      plant({ id: 'a', name: 'Due', lastWateredISO: daysAgo(12) }),
      plant({ id: 'b', name: 'Fresh', lastWateredISO: daysAgo(0) }),
    ]);
    render(<App />);
    expect(screen.getByText('2 plants in your care · 1 ready for water')).toBeInTheDocument();
  });

  it('drops the clause entirely when nothing needs water', () => {
    seed([plant({ lastWateredISO: daysAgo(1) })]);
    render(<App />);
    expect(screen.getByText('1 plant in your care')).toBeInTheDocument();
    expect(screen.queryByText(/ready for water/)).not.toBeInTheDocument();
  });

  // Colour is the grid's signal, which is no signal at all to a screen reader or to
  // someone who cannot separate moss from clay. Every square must also say where it
  // stands in words.
  it('states each square in words, not only in colour', () => {
    seed([
      plant({ id: 'a', name: 'Due', lastWateredISO: daysAgo(10) }),
      plant({ id: 'b', name: 'Soon', lastWateredISO: daysAgo(9) }),
      plant({ id: 'c', name: 'Fresh', lastWateredISO: daysAgo(2) }),
    ]);
    render(<App />);
    expect(screen.getByLabelText('Due, due for water')).toBeInTheDocument();
    expect(screen.getByLabelText('Soon, due tomorrow')).toBeInTheDocument();
    expect(screen.getByLabelText('Fresh, 8 days to go')).toBeInTheDocument();
  });

  it('paints each square the colour its dryness says, and no further', () => {
    seed([
      plant({ id: 'due', name: 'Due', lastWateredISO: daysAgo(10) }),
      plant({ id: 'late', name: 'Late', lastWateredISO: daysAgo(90) }),
      plant({ id: 'fresh', name: 'Fresh', lastWateredISO: daysAgo(0) }),
      plant({ id: 'half', name: 'Half', lastWateredISO: daysAgo(5) }),
    ]);
    render(<App />);
    expect(tile('fresh')).toHaveStyle({ backgroundColor: rampColor(0) });
    expect(tile('half')).toHaveStyle({ backgroundColor: rampColor(0.5) });
    expect(tile('due')).toHaveStyle({ backgroundColor: rampColor(1) });
    // D12: nine weeks late looks exactly like due today.
    expect(tile('late')).toHaveStyle({ backgroundColor: rampColor(1) });
  });

  it('orders the thirstiest first', () => {
    seed([
      plant({ id: 'fresh', name: 'Fresh', lastWateredISO: daysAgo(0) }),
      plant({ id: 'due', name: 'Due', lastWateredISO: daysAgo(10) }),
      plant({ id: 'mid', name: 'Mid', lastWateredISO: daysAgo(5) }),
    ]);
    render(<App />);
    const names = screen.getAllByText(/^(Fresh|Due|Mid)$/).map((n) => n.textContent);
    expect(names).toEqual(['Due', 'Mid', 'Fresh']);
  });
});

describe('watering from a square', () => {
  it('waters without opening the plant', async () => {
    const user = userEvent.setup();
    seed([plant()]);
    render(<App />);
    expect(screen.getByText('1 plant in your care · 1 ready for water')).toBeInTheDocument();

    await user.click(screen.getByTestId('tile-water-marcel'));

    // Derived from the stored timestamp, so this only moves if the store did.
    expect(screen.getByText('1 plant in your care')).toBeInTheDocument();
    expect(tile('marcel')).toHaveStyle({ backgroundColor: rampColor(0) });
    expect(screen.queryByTestId('plant-peek')).not.toBeInTheDocument();
  });

  /**
   * The square you water must not move.
   *
   * Sorting by thirst on every change is the obvious implementation and it is wrong:
   * watering drops a plant's thirst to zero, which threw its square to the far end of
   * the grid. You tap a drop and the thing you touched teleports, which loses the one
   * moment this design exists to make satisfying.
   */
  it('leaves the watered square exactly where it was', async () => {
    const user = userEvent.setup();
    seed([
      plant({ id: 'due', name: 'Due', lastWateredISO: daysAgo(10) }),
      plant({ id: 'mid', name: 'Mid', lastWateredISO: daysAgo(5) }),
      plant({ id: 'fresh', name: 'Fresh', lastWateredISO: daysAgo(0) }),
    ]);
    render(<App />);
    expect(screen.getAllByText(/^(Due|Mid|Fresh)$/).map((n) => n.textContent)).toEqual([
      'Due',
      'Mid',
      'Fresh',
    ]);

    await user.click(screen.getByTestId('tile-water-due'));

    expect(screen.getAllByText(/^(Due|Mid|Fresh)$/).map((n) => n.textContent)).toEqual([
      'Due',
      'Mid',
      'Fresh',
    ]);
    expect(tile('due')).toHaveStyle({ backgroundColor: rampColor(0) });
  });

  it('turns the drop into a tick and refuses a second watering the same day', async () => {
    const user = userEvent.setup();
    seed([plant({ lastWateredISO: daysAgo(0) })]);
    render(<App />);

    const button = screen.getByTestId('tile-water-marcel');
    expect(button).toHaveAccessibleName('Marcel was watered today');
    expect(button).toBeDisabled();

    // And the dead tick must not fall through and open the plant underneath it, which
    // is what the native app's nested-button version did.
    await user.click(button);
    expect(screen.queryByTestId('plant-peek')).not.toBeInTheDocument();
  });
});

describe('the card', () => {
  it('opens on the plant whose square was tapped', async () => {
    const user = userEvent.setup();
    seed([plant({ id: 'a', name: 'Marcel' }), plant({ id: 'b', name: 'Fernando' })]);
    render(<App />);
    expect(screen.queryByTestId('plant-peek')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('tile-open-b'));

    const peek = within(screen.getByTestId('plant-peek'));
    expect(peek.getByRole('heading', { name: 'Fernando' })).toBeInTheDocument();
    expect(peek.getByTestId('peek-status')).toHaveTextContent('Due for water');
  });

  it('waters from inside the card too', async () => {
    const user = userEvent.setup();
    seed([plant()]);
    render(<App />);

    await user.click(screen.getByTestId('tile-open-marcel'));
    await user.click(screen.getByTestId('peek-water'));

    expect(screen.getByTestId('peek-status')).toHaveTextContent('Watered today');
    expect(tile('marcel')).toHaveStyle({ backgroundColor: rampColor(0) });
  });

  it('asks before removing a plant, then removes it and its log', async () => {
    const user = userEvent.setup();
    seed([plant({ id: 'a', name: 'Marcel' }), plant({ id: 'b', name: 'Fernando' })]);
    render(<App />);

    await user.click(screen.getByTestId('tile-open-a'));
    await user.click(screen.getByTestId('peek-remove'));
    // Nothing is gone yet.
    expect(tile('a')).toBeInTheDocument();

    await user.click(screen.getByTestId('peek-remove-confirm'));
    expect(screen.queryByTestId('tile-a')).not.toBeInTheDocument();
    expect(tile('b')).toBeInTheDocument();
  });

  it('closes on the close button', async () => {
    const user = userEvent.setup();
    seed([plant()]);
    render(<App />);

    await user.click(screen.getByTestId('tile-open-marcel'));
    expect(screen.getByTestId('plant-peek')).toBeInTheDocument();

    await user.click(screen.getByTestId('peek-close'));
    // The card unmounts after its close animation, on a timer.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(screen.queryByTestId('plant-peek')).not.toBeInTheDocument();
  });
});

describe('an empty garden', () => {
  it('says what to do rather than looking broken', () => {
    seed([]);
    render(<App />);
    expect(
      screen.getByText('No plants yet. Add your first with the button below.'),
    ).toBeInTheDocument();
  });

  it('offers onboarding before anything has been set up', () => {
    render(<App />);
    expect(screen.getByText('What should we call you?')).toBeInTheDocument();
  });
});
