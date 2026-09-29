import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav.tsx';

describe('BottomNav', () => {
  it('links to profile, shout-outs, bulletin board, and plaza', () => {
    render(<BottomNav onAddTile={() => {}} />, { wrapper: MemoryRouter });

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
        <BottomNav onAddTile={() => {}} />
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

  it('calls onAddTile when the + button is pressed', async () => {
    const onAddTile = vi.fn();
    const user = userEvent.setup();
    render(<BottomNav onAddTile={onAddTile} />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole('button', { name: 'Add tile' }));

    expect(onAddTile).toHaveBeenCalledTimes(1);
  });
});
