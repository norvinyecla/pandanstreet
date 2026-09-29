import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { FollowersPage } from './FollowersPage.tsx';

const me = {
  id: 'u1',
  name: 'Ada',
  photoUrl: '',
  bio: '',
  followerCount: 2,
  followingCount: 0,
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function mockFetch(handlers: Record<string, () => Promise<Response>>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const handler = handlers[new URL(url).pathname];
      if (!handler) {
        return Promise.reject(new Error(`Unexpected fetch to ${url}`));
      }
      return handler();
    }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <FollowersPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('FollowersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the current user's followers as read-only profile links", async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/follows/u1/followers': () =>
        jsonResponse([
          { id: 'u2', name: 'Grace', photoUrl: '' },
          { id: 'u3', name: 'Linus', photoUrl: '' },
        ]),
    });

    renderPage();

    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Linus' })).toHaveAttribute(
      'href',
      '/users/u3',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no followers', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/follows/u1/followers': () => jsonResponse([]),
    });

    renderPage();

    expect(await screen.findByText(/no followers yet/i)).toBeInTheDocument();
  });

  it('shows the API error message when loading fails', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/follows/u1/followers': () =>
        jsonResponse({ message: 'User not found' }, 404),
    });

    renderPage();

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });
});
