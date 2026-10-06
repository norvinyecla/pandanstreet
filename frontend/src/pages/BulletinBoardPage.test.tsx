import { render, screen, within } from '@testing-library/react';
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
    photoUrl: `https://photos.example.test/photos/${index}.png`,
    caption: `Item ${index}`,
    badgeColor: 'green',
    author: { id: 'u2', username: 'grace', name: 'Grace', photoUrl: '' },
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
    expect(photo).toHaveAttribute(
      'src',
      'https://photos.example.test/photos/1.png',
    );
    expect(screen.getByRole('list')).toHaveClass('grid-cols-3');
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText("G'day!")).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Grace' })[0]).toHaveAttribute(
      'href',
      '/users/grace',
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'http://localhost:3001/tiles/feed/bulletin-board',
    );
  });

  it("renders the author's avatar inside a link to their profile", async () => {
    mockFeed(
      Promise.resolve(
        new Response(
          JSON.stringify([
            {
              ...makeItem(1),
              author: {
                id: 'u3',
                username: 'ada',
                name: 'Ada',
                photoUrl: 'https://photos.example.test/photos/ada.png',
              },
            },
          ]),
        ),
      ),
    );

    renderPage();

    const avatar = await screen.findByAltText("Ada's profile photo");
    expect(avatar).toHaveAttribute(
      'src',
      'https://photos.example.test/photos/ada.png',
    );
    const link = avatar.closest('a');
    expect(link).toHaveAttribute('href', '/users/ada');
    expect(link).toHaveTextContent('Ada');
    expect(link).toHaveClass('min-h-11');
  });

  it('renders the default avatar for authors without a photo', async () => {
    mockFeed(Promise.resolve(new Response(JSON.stringify([makeItem(1)]))));

    renderPage();

    const link = await screen.findByRole('link', { name: 'Grace' });
    expect(link).toHaveAttribute('href', '/users/grace');
    expect(within(link).getByTestId('default-avatar')).toBeInTheDocument();
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

  describe('full-screen item tile', () => {
    async function openSecondTile() {
      mockFeed(
        Promise.resolve(
          new Response(
            JSON.stringify([
              makeItem(1),
              {
                ...makeItem(2),
                createdAt: new Date(
                  Date.now() - 2 * 60 * 60 * 1000,
                ).toISOString(),
                badgeColor: 'red',
                author: {
                  id: 'u3',
                  username: 'ada',
                  name: 'Ada',
                  photoUrl: '',
                },
              },
            ]),
          ),
        ),
      );
      const user = userEvent.setup();
      renderPage();
      const trigger = await screen.findByRole('button', {
        name: 'View Item 2 full screen',
      });
      await user.click(trigger);
      return { user, trigger };
    }

    it("opens with the tapped tile's photo, caption, badge, age, and author", async () => {
      await openSecondTile();

      const dialog = screen.getByRole('dialog', { name: 'Item 2' });
      expect(within(dialog).getByAltText('Item 2')).toHaveAttribute(
        'src',
        'https://photos.example.test/photos/2.png',
      );
      expect(within(dialog).getByText('Hello!')).toBeInTheDocument();
      const age = within(dialog).getByText('2h ago');
      expect(age.tagName).toBe('TIME');
      expect(within(dialog).getByRole('link', { name: 'Ada' })).toHaveAttribute(
        'href',
        '/users/ada',
      );
      expect(
        within(dialog).getByRole('button', { name: 'Close' }),
      ).toHaveFocus();
    });

    it("shows the author's avatar in a link with a 44px tap target", async () => {
      await openSecondTile();

      const link = within(screen.getByRole('dialog')).getByRole('link', {
        name: 'Ada',
      });
      expect(link).toHaveAttribute('href', '/users/ada');
      expect(link).toHaveClass('min-h-11');
      expect(within(link).getByTestId('default-avatar')).toBeInTheDocument();
    });

    it('closes via the Close button and returns focus to the tile', async () => {
      const { user, trigger } = await openSecondTile();

      await user.click(screen.getByRole('button', { name: 'Close' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('closes via the Escape key', async () => {
      const { user, trigger } = await openSecondTile();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('closes via a tap on the backdrop', async () => {
      const { user } = await openSecondTile();

      await user.click(screen.getByTestId('item-overlay-backdrop'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
