import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Tile } from '../api/types.ts';
import { TileGrid } from './TileGrid.tsx';

describe('TileGrid', () => {
  it('shows a placeholder when there are no tiles', () => {
    render(<TileGrid tiles={[]} />);
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

    render(<TileGrid tiles={tiles} />);

    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('A nice photo')).toBeInTheDocument();
    expect(screen.getByText("G'day!")).toBeInTheDocument();
    expect(screen.getByAltText('A nice photo')).toHaveAttribute(
      'src',
      'http://localhost:3001/uploads/photo.png',
    );
  });
});
