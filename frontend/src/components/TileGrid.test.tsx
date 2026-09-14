import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Tile } from '../api/types.ts';
import { TileGrid } from './TileGrid.tsx';

describe('TileGrid', () => {
  it('shows a placeholder when there are no tiles', () => {
    render(<TileGrid tiles={[]} />, { wrapper: MemoryRouter });
    expect(screen.getByText(/no tiles yet/i)).toBeInTheDocument();
  });

  it('renders text tiles and item tiles with their badge message', () => {
    const tiles: Tile[] = [
      {
        id: 't1',
        userId: 'u1',
        type: 'text',
        createdAt: '2026-01-01',
        text: 'Hello world',
      },
      {
        id: 't2',
        userId: 'u1',
        type: 'item',
        createdAt: '2026-01-02',
        photoUrl: '/uploads/photo.png',
        caption: 'A nice photo',
        badgeColor: 'green',
      },
    ];

    render(<TileGrid tiles={tiles} />, { wrapper: MemoryRouter });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('A nice photo')).toBeInTheDocument();
    expect(screen.getByText("G'day!")).toBeInTheDocument();
    expect(screen.getByAltText('A nice photo')).toHaveAttribute(
      'src',
      'http://localhost:3001/uploads/photo.png',
    );
  });

  it('shows an edit link for text tiles only on the owner profile', () => {
    const tiles: Tile[] = [
      {
        id: 't1',
        userId: 'u1',
        type: 'text',
        createdAt: '2026-01-01',
        text: 'Hello world',
      },
      {
        id: 't2',
        userId: 'u1',
        type: 'item',
        createdAt: '2026-01-02',
        photoUrl: '/uploads/photo.png',
        caption: 'A nice photo',
        badgeColor: 'green',
      },
    ];

    render(<TileGrid tiles={tiles} isOwnProfile />, { wrapper: MemoryRouter });

    const editLinks = screen.getAllByRole('link', { name: /edit/i });
    expect(editLinks).toHaveLength(1);
    expect(editLinks[0]).toHaveAttribute('href', '/tiles/t1/edit');
  });

  it('does not show edit links when viewing another user profile', () => {
    const tiles: Tile[] = [
      {
        id: 't1',
        userId: 'u1',
        type: 'text',
        createdAt: '2026-01-01',
        text: 'Hello world',
      },
    ];

    render(<TileGrid tiles={tiles} />, { wrapper: MemoryRouter });

    expect(
      screen.queryByRole('link', { name: /edit/i }),
    ).not.toBeInTheDocument();
  });
});
