import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { TilesVersionContext } from '../tiles/TilesVersionContext.ts';
import { ToastProvider } from '../toast/ToastProvider.tsx';
import { ProfilePage } from './ProfilePage.tsx';

const me = {
  id: 'u1',
  username: 'ada',
  name: 'Ada',
  photoUrl: '',
  bio: 'Building things.',
  followerCount: 1,
  followingCount: 2,
};

const other = {
  id: 'u2',
  username: 'grace',
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
          <Route path="/users/:username" element={<ProfilePage />} />
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
    expect(screen.getByText('@ada')).toBeInTheDocument();
    expect(screen.getByText('Building things.')).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /edit profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /follow/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '1 follower' })).toHaveAttribute(
      'href',
      '/followers',
    );
    expect(screen.getByRole('link', { name: '2 following' })).toHaveAttribute(
      'href',
      '/following',
    );
  });

  it('shows a follow button for another user and toggles it on click', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/by-username/grace': () => jsonResponse(other),
      '/tiles/u2': () => jsonResponse([]),
      '/follows/u2/followers': () => jsonResponse([]),
      'POST /follows/u2': () =>
        Promise.resolve(new Response(null, { status: 204 })),
    });

    const user = userEvent.setup();
    renderProfilePage('/users/grace');

    const followButton = await screen.findByRole('button', {
      name: /^follow$/i,
    });
    expect(
      screen.queryByRole('link', { name: /follower|following/i }),
    ).not.toBeInTheDocument();
    await user.click(followButton);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^unfollow$/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('1 follower')).toBeInTheDocument();
  });

  it("loads another user's profile by the username in the URL", async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/by-username/grace': () => jsonResponse(other),
      '/tiles/u2': () =>
        jsonResponse([
          {
            id: 't2',
            userId: 'u2',
            type: 'text',
            createdAt: '2026-01-01',
            text: 'from grace',
          },
        ]),
      '/follows/u2/followers': () => jsonResponse([]),
    });

    renderProfilePage('/users/grace');

    expect(
      await screen.findByRole('heading', { name: 'Grace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('@grace')).toBeInTheDocument();
    expect(screen.getByText('from grace')).toBeInTheDocument();
  });

  it('treats its own username in the URL as the own profile', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/u1': () => jsonResponse(me),
      '/tiles/u1': () => jsonResponse([]),
    });

    renderProfilePage('/users/ada');

    expect(
      await screen.findByRole('link', { name: /edit profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /follow/i }),
    ).not.toBeInTheDocument();
  });

  it('shows an error for an unknown username', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/by-username/nobody': () =>
        jsonResponse(
          { statusCode: 404, message: 'User not found', error: 'Not Found' },
          404,
        ),
    });

    renderProfilePage('/users/nobody');

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });

  it('deletes a tile after confirmation and confirms with a toast', async () => {
    const deleted: string[] = [];
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
            text: 'goodbye tile',
          },
        ]),
      'DELETE /tiles/t1': () => {
        deleted.push('t1');
        return Promise.resolve(new Response(null, { status: 204 }));
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<ProfilePage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('goodbye tile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(screen.queryByText('goodbye tile')).not.toBeInTheDocument(),
    );
    expect(deleted).toEqual(['t1']);
    expect(screen.getByRole('status')).toHaveTextContent('Post deleted');
    expect(screen.getByText(/no tiles yet/i)).toBeInTheDocument();
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

  it('shows a skeleton while loading', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/u1': () => new Promise<Response>(() => {}),
      '/tiles/u1': () => jsonResponse([]),
    });

    renderProfilePage('/');

    expect(
      await screen.findByRole('status', { name: 'Loading profile' }),
    ).toBeInTheDocument();
  });

  it('re-runs the request when Try again is clicked', async () => {
    let attempts = 0;
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/u1': () =>
        ++attempts === 1
          ? jsonResponse({ message: 'Server error' }, 500)
          : jsonResponse(me),
      '/tiles/u1': () => jsonResponse([]),
    });

    const user = userEvent.setup();
    renderProfilePage('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: 'Ada' }),
    ).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('disables the follow button while the request is pending', async () => {
    let resolveFollow!: (response: Response) => void;
    const followCalls: string[] = [];
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/by-username/grace': () => jsonResponse(other),
      '/tiles/u2': () => jsonResponse([]),
      '/follows/u2/followers': () => jsonResponse([]),
      'POST /follows/u2': () => {
        followCalls.push('u2');
        return new Promise<Response>((resolve) => {
          resolveFollow = resolve;
        });
      },
    });

    const user = userEvent.setup();
    renderProfilePage('/users/grace');

    const followButton = await screen.findByRole('button', {
      name: /^follow$/i,
    });
    await user.click(followButton);
    await user.click(followButton);
    expect(followButton).toBeDisabled();

    resolveFollow(new Response(null, { status: 204 }));
    expect(
      await screen.findByRole('button', { name: /^unfollow$/i }),
    ).toBeEnabled();
    expect(followCalls).toEqual(['u2']);
  });

  it('keeps the profile on screen when following fails', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/users/by-username/grace': () => jsonResponse(other),
      '/tiles/u2': () => jsonResponse([]),
      '/follows/u2/followers': () => jsonResponse([]),
      'POST /follows/u2': () =>
        jsonResponse({ message: 'Cannot follow this user' }, 400),
    });

    const user = userEvent.setup();
    renderProfilePage('/users/grace');

    await user.click(await screen.findByRole('button', { name: /^follow$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot follow this user',
    );
    expect(screen.getByRole('heading', { name: 'Grace' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
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
