import { render, screen } from '@testing-library/react-native';

import { LogFeed } from '../LogFeed';
import type { LogEntry } from '../../data/types';

const NOW = new Date(2026, 4, 27, 12, 0, 0);
const iso = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m, d, h, 0, 0).toISOString();

const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: 'e1',
  plantId: 'marcel',
  kind: 'water',
  text: 'Watered Marcel.',
  when: iso(2026, 4, 27, 9),
  ...over,
});

describe('LogFeed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('shows the empty-state copy with no entries', () => {
    render(<LogFeed log={[]} />);
    expect(screen.getByText("No notes yet. Plants don't mind waiting.")).toBeTruthy();
  });

  it('renders entry text under an uppercased day header', () => {
    render(<LogFeed log={[entry({ id: 'a', text: 'Watered Marcel.' })]} />);
    expect(screen.getByText('TODAY')).toBeTruthy();
    expect(screen.getByText('Watered Marcel.')).toBeTruthy();
  });

  it('hides day headers when showGroupHeaders is false', () => {
    render(<LogFeed log={[entry({ id: 'a' })]} showGroupHeaders={false} />);
    expect(screen.queryByText('TODAY')).toBeNull();
    expect(screen.getByText('Watered Marcel.')).toBeTruthy();
  });

  it('renders a dash for an entry with empty text', () => {
    render(<LogFeed log={[entry({ id: 'a', kind: 'observed', text: '' })]} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
