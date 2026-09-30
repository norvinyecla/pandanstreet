import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client.ts';
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

  const ownTiles: Tile[] = [
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

  it('shows a delete button on both text and item tiles on the owner profile', () => {
    render(<TileGrid tiles={ownTiles} isOwnProfile onDelete={vi.fn()} />, {
      wrapper: MemoryRouter,
    });

    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
  });

  it('does not show delete buttons on another user profile', () => {
    render(<TileGrid tiles={ownTiles} />, { wrapper: MemoryRouter });

    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting, and cancel keeps the tile', async () => {
    const onDelete = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();
    render(<TileGrid tiles={ownTiles} isOwnProfile onDelete={onDelete} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    expect(screen.getByText('Delete this post?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete this post?')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    const confirmRow = screen.getByText('Delete this post?').parentElement!;
    await user.click(
      within(confirmRow).getByRole('button', { name: 'Delete' }),
    );
    expect(onDelete).toHaveBeenCalledWith(ownTiles[1]);
  });

  it('shows an error on the tile when deleting fails', async () => {
    const onDelete = vi.fn(() =>
      Promise.reject(new ApiError('Tile not found', 404)),
    );
    const user = userEvent.setup();
    render(<TileGrid tiles={ownTiles} isOwnProfile onDelete={onDelete} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirmRow = screen.getByText('Delete this post?').parentElement!;
    await user.click(
      within(confirmRow).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tile not found',
    );
  });

  it('cancels the delete confirmation when Escape is pressed', async () => {
    const onDelete = vi.fn(() => Promise.resolve());
    const user = userEvent.setup();
    render(<TileGrid tiles={ownTiles} isOwnProfile onDelete={onDelete} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(screen.getByText('Delete this post?')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Delete this post?')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('disables the confirm and cancel buttons while deleting', async () => {
    let resolveDelete!: () => void;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<TileGrid tiles={ownTiles} isOwnProfile onDelete={onDelete} />, {
      wrapper: MemoryRouter,
    });

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirmRow = screen.getByText('Delete this post?').parentElement!;
    await user.click(
      within(confirmRow).getByRole('button', { name: 'Delete' }),
    );

    const deletingButton = within(confirmRow).getByRole('button', {
      name: 'Deleting…',
    });
    expect(deletingButton).toBeDisabled();
    expect(
      within(confirmRow).getByRole('button', { name: 'Cancel' }),
    ).toBeDisabled();
    await user.click(deletingButton);
    expect(onDelete).toHaveBeenCalledTimes(1);

    resolveDelete();
  });
});
