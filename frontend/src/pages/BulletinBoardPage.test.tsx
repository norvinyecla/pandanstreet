import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BulletinItem } from '../api/types.ts';
import {
  BULLETIN_BOARD_LIMIT,
  BulletinBoardPage,
} from './BulletinBoardPage.tsx';

function makeItem(index: number): BulletinItem {
  return {
    id: `t${index}`,
    createdAt: `2026-01-01T00:00:${String(index).padStart(2, '0')}Z`,
    photoUrl: `/uploads/${index}.png`,
    caption: `Item ${index}`,
    badgeColor: 'green',
    author: { id: 'u2', name: 'Grace', photoUrl: '' },
  };
}

function mockFeed(response: Promise<Response>) {
  const fetchMock = vi.fn(
    (_input: RequestInfo | URL, _init?: RequestInit) => response,
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(<BulletinBoardPage />, { wrapper: MemoryRouter });
}

describe('BulletinBoardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders item tiles in a 3-column grid with photo, badge, caption, and author', async () => {
    const fetchMock = mockFeed(
      Promise.resolve(
        new Response(
          JSON.stringify([makeItem(1), { ...makeItem(2), badgeColor: 'red' }]),
        ),
      ),
    );

    renderPage();

    const photo = await screen.findByAltText('Item 1');
    expect(photo).toHaveAttribute('src', 'http://localhost:3001/uploads/1.png');
    expect(screen.getByRole('list')).toHaveClass('grid-cols-3');
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText("G'day!")).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Grace' })[0]).toHaveAttribute(
      'href',
      '/users/u2',
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'http://localhost:3001/tiles/feed/bulletin-board',
    );
  });

  it(`shows at most ${BULLETIN_BOARD_LIMIT} item tiles`, async () => {
    const items = Array.from({ length: BULLETIN_BOARD_LIMIT + 4 }, (_, i) =>
      makeItem(i),
    );
    mockFeed(Promise.resolve(new Response(JSON.stringify(items))));

    renderPage();

    expect(await screen.findAllByRole('listitem')).toHaveLength(
      BULLETIN_BOARD_LIMIT,
    );
  });

  it('shows the age of each bulletin tile in a time element', async () => {
    const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockFeed(
      Promise.resolve(
        new Response(JSON.stringify([{ ...makeItem(1), createdAt }])),
      ),
    );

    renderPage();

    const age = await screen.findByText('5m ago');
    expect(age.tagName).toBe('TIME');
    expect(age).toHaveAttribute('dateTime', createdAt);
  });

  it('shows an empty state when there are no item tiles', async () => {
    mockFeed(Promise.resolve(new Response(JSON.stringify([]))));

    renderPage();

    expect(
      await screen.findByText(/nothing on the board yet/i),
    ).toBeInTheDocument();
  });

  it('shows a fallback error when loading fails', async () => {
    mockFeed(Promise.reject(new TypeError('Network down')));

    renderPage();

    expect(
      await screen.findByText('Could not load the bulletin board.'),
    ).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    mockFeed(new Promise<Response>(() => {}));

    renderPage();

    expect(
      screen.getByRole('status', { name: 'Loading bulletin board' }),
    ).toBeInTheDocument();
  });

  it('re-runs the request when Try again is clicked', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network down'))
      .mockResolvedValueOnce(new Response(JSON.stringify([makeItem(1)])));
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByAltText('Item 1')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
