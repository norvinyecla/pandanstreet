import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomNav } from './BottomNav.tsx';

describe('BottomNav', () => {
  it('links to profile, shout-outs, bulletin board, and plaza', () => {
    render(<BottomNav />, { wrapper: MemoryRouter });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: 'Shout-outs' })).toHaveAttribute(
      'href',
      '/shoutouts',
    );
    expect(screen.getByRole('link', { name: 'Bulletin' })).toHaveAttribute(
      'href',
      '/bulletin-board',
    );
    expect(screen.getByRole('link', { name: 'Plaza' })).toHaveAttribute(
      'href',
      '/plaza',
    );
  });

  it('marks the current page as active', () => {
    render(
      <MemoryRouter initialEntries={['/shoutouts']}>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Shout-outs' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
