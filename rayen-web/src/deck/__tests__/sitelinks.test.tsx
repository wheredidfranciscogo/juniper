import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SiteLinks } from '../SiteLinks';

describe('the links out of the app', () => {
  it('points at the about and privacy pages on the same site', () => {
    render(<SiteLinks />);
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
  });

  it('opens the source on GitHub without handing it a reference back', () => {
    render(<SiteLinks />);
    const source = screen.getByRole('link', { name: 'Source' });
    expect(source).toHaveAttribute('href', 'https://github.com/wheredidfranciscogo/rayen');
    expect(source).toHaveAttribute('target', '_blank');
    expect(source.getAttribute('rel')).toContain('noopener');
  });

  it('is a labelled navigation landmark', () => {
    render(<SiteLinks />);
    expect(screen.getByRole('navigation', { name: 'About Rayen' })).toBeInTheDocument();
  });
});
