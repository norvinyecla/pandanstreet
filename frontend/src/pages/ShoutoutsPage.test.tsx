import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Shoutout } from '../api/types.ts';
import { SHOUTOUTS_LIMIT, ShoutoutsPage } from './ShoutoutsPage.tsx';

function makeShoutout(index: number): Shoutout {
  return {
    id: `t${index}`,
    createdAt: `2026-01-01T00:00:${String(index).padStart(2, '0')}Z`,
    text: `Shout ${index}`,
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
  return render(<ShoutoutsPage />, { wrapper: MemoryRouter });
}

describe('ShoutoutsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders shout-outs in the order returned, with author links', async () => {
    const fetchMock = mockFeed(
      Promise.resolve(
        new Response(
          JSON.stringify([
            makeShoutout(2),
            {
              ...makeShoutout(1),
              author: { id: 'u3', name: 'Linus', photoUrl: '/uploads/l.png' },
            },
          ]),
        ),
      ),
    );

    renderPage();

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Shout 2');
    expect(items[1]).toHaveTextContent('Shout 1');
    expect(screen.getByRole('link', { name: 'Grace' })).toHaveAttribute(
      'href',
      '/users/u2',
    );
    expect(screen.getByAltText("Linus's profile photo")).toHaveAttribute(
      'src',
      'http://localhost:3001/uploads/l.png',
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'http://localhost:3001/tiles/feed/shoutouts',
    );
  });

  it(`shows at most ${SHOUTOUTS_LIMIT} shout-outs`, async () => {
    const shoutouts = Array.from({ length: SHOUTOUTS_LIMIT + 5 }, (_, i) =>
      makeShoutout(i),
    );
    mockFeed(Promise.resolve(new Response(JSON.stringify(shoutouts))));

    renderPage();

    expect(await screen.findAllByRole('listitem')).toHaveLength(
      SHOUTOUTS_LIMIT,
    );
  });

  it('shows an empty state when there are no shout-outs', async () => {
    mockFeed(Promise.resolve(new Response(JSON.stringify([]))));

    renderPage();

    expect(await screen.findByText(/no shout-outs yet/i)).toBeInTheDocument();
  });

  it('shows the API error message when loading fails', async () => {
    mockFeed(
      Promise.resolve(
        new Response(JSON.stringify({ message: 'Not logged in' }), {
          status: 401,
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Not logged in')).toBeInTheDocument();
  });
});
