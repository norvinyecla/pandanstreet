import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { TilesVersionContext } from '../tiles/TilesVersionContext.ts';
import { ProfilePage } from './ProfilePage.tsx';

const me = {
  id: 'u1',
  name: 'Ada',
  photoUrl: '',
  bio: 'Building things.',
  followerCount: 1,
  followingCount: 2,
};

const other = {
  id: 'u2',
  name: 'Grace',
  photoUrl: '',
  bio: '',
  followerCount: 0,
  followingCount: 0,
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function renderProfilePage(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProfilePage />} />
          <Route path="/users/:id" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<p>Edit page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the logged-in user's bio, tiles, and an edit link on their own profile", async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/u1': () => jsonResponse(me),
      '/tiles/u1': () =>
        jsonResponse([
          {
            id: 't1',
            userId: 'u1',
            type: 'text',
            createdAt: '2026-01-01',
            text: 'hello world',
          },
        ]),
    });

    renderProfilePage('/');

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Building things.')).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /edit profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /follow/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a follow button for another user and toggles it on click', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/u2': () => jsonResponse(other),
      '/tiles/u2': () => jsonResponse([]),
      '/follows/u2/followers': () => jsonResponse([]),
      'POST /follows/u2': () =>
        Promise.resolve(new Response(null, { status: 204 })),
    });

    const user = userEvent.setup();
    renderProfilePage('/users/u2');

    const followButton = await screen.findByRole('button', {
      name: /^follow$/i,
    });
    await user.click(followButton);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^unfollow$/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('1 follower')).toBeInTheDocument();
  });

  it('refetches tiles when a new tile is created elsewhere in the app', async () => {
    const tileFetches: number[] = [];
    let tiles = [
      {
        id: 't1',
        userId: 'u1',
        type: 'text',
        createdAt: '2026-01-01',
        text: 'first tile',
      },
    ];
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/u1': () => jsonResponse(me),
      '/tiles/u1': () => {
        tileFetches.push(Date.now());
        return jsonResponse(tiles);
      },
    });

    const tree = (version: number) => (
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <TilesVersionContext.Provider value={version}>
            <Routes>
              <Route path="/" element={<ProfilePage />} />
            </Routes>
          </TilesVersionContext.Provider>
        </AuthProvider>
      </MemoryRouter>
    );
    const { rerender } = render(tree(0));
    expect(await screen.findByText('first tile')).toBeInTheDocument();

    tiles = [
      ...tiles,
      {
        id: 't2',
        userId: 'u1',
        type: 'text',
        createdAt: '2026-01-02',
        text: 'second tile',
      },
    ];
    rerender(tree(1));

    expect(await screen.findByText('second tile')).toBeInTheDocument();
    expect(tileFetches).toHaveLength(2);
  });
});

function mockFetch(
  handlers: Record<string, (init?: RequestInit) => Promise<Response>>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const methodKey = `${method} ${new URL(url).pathname}`;
      const path = new URL(url).pathname;
      const handler = handlers[methodKey] ?? handlers[path];
      if (!handler) {
        return Promise.reject(
          new Error(`Unexpected fetch to ${method} ${url}`),
        );
      }
      return handler(init);
    }),
  );
}
