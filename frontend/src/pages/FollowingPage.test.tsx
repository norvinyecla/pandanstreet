import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { FollowingPage } from './FollowingPage.tsx';

const me = {
  id: 'u1',
  name: 'Ada',
  photoUrl: '',
  bio: '',
  followerCount: 0,
  followingCount: 2,
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function mockFetch(handlers: Record<string, () => Promise<Response>>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const path = new URL(url).pathname;
    const handler = handlers[`${method} ${path}`] ?? handlers[path];
    if (!handler) {
      return Promise.reject(new Error(`Unexpected fetch to ${method} ${url}`));
    }
    return handler();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <FollowingPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('FollowingPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the current user's followed profiles with profile links", async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/follows/u1/following': () =>
        jsonResponse([
          { id: 'u2', name: 'Grace', photoUrl: '' },
          { id: 'u3', name: 'Linus', photoUrl: '/uploads/l.png' },
        ]),
    });

    renderPage();

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Grace' })).toHaveAttribute(
      'href',
      '/users/u2',
    );
    expect(screen.getByAltText("Linus's profile photo")).toBeInTheDocument();
    expect(
      within(items[0]!).getByRole('button', { name: 'Unfollow Grace' }),
    ).toBeInTheDocument();
  });

  it('keeps an unfollowed profile listed with a Follow button to re-follow', async () => {
    const fetchMock = mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/follows/u1/following': () =>
        jsonResponse([
          { id: 'u2', name: 'Grace', photoUrl: '' },
          { id: 'u3', name: 'Linus', photoUrl: '' },
        ]),
      'DELETE /follows/u2': () =>
        Promise.resolve(new Response(null, { status: 204 })),
      'POST /follows/u2': () =>
        Promise.resolve(new Response(null, { status: 204 })),
    });
    const calledWith = (method: string) =>
      fetchMock.mock.calls.some(
        ([url, init]) =>
          init?.method === method && new URL(url).pathname === '/follows/u2',
      );

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Unfollow Grace' }),
    );

    const followButton = await screen.findByRole('button', {
      name: 'Follow Grace',
    });
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unfollow Linus' }),
    ).toBeInTheDocument();
    expect(calledWith('DELETE')).toBe(true);

    await user.click(followButton);

    expect(
      await screen.findByRole('button', { name: 'Unfollow Grace' }),
    ).toBeInTheDocument();
    expect(calledWith('POST')).toBe(true);
  });

  it('keeps the profile and shows an error when unfollowing fails', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/follows/u1/following': () =>
        jsonResponse([{ id: 'u2', name: 'Grace', photoUrl: '' }]),
      'DELETE /follows/u2': () =>
        jsonResponse({ message: 'Not following this user' }, 404),
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Unfollow Grace' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not following this user',
    );
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });

  it('shows an empty state when not following anyone', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/follows/u1/following': () => jsonResponse([]),
    });

    renderPage();

    expect(
      await screen.findByText(/not following anyone yet/i),
    ).toBeInTheDocument();
  });
});
