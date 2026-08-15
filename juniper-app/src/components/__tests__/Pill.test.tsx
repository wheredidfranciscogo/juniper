import { render, screen } from '@testing-library/react-native';

import { Pill } from '../Pill';

describe('Pill', () => {
  it('renders its label text', () => {
    render(<Pill tone="moss">Bright indirect</Pill>);
    expect(screen.getByText('Bright indirect')).toBeTruthy();
  });

  it('renders across every tone without error', () => {
    const tones = ['dried', 'moss', 'ink', 'muted'] as const;
    for (const tone of tones) {
      render(<Pill tone={tone}>{tone}</Pill>);
      expect(screen.getByText(tone)).toBeTruthy();
    }
  });
});
