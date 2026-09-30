import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client.ts';
import { AuthProvider } from './AuthContext.tsx';
import { RequireAuth } from './RequireAuth.tsx';

function renderWithAuth(loggedIn: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        loggedIn
          ? new Response(
              JSON.stringify({
                id: 'u1',
                name: 'Ada',
                photoUrl: '',
                followerCount: 0,
                followingCount: 0,
              }),
              { status: 200 },
            )
          : new Response(null, { status: 401 }),
      ),
    ),
  );

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Login screen</p>} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <p>Protected content</p>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to /login when not authenticated', async () => {
    renderWithAuth(false);
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    renderWithAuth(true);
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /login when a request after login returns 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('/auth/me')
            ? new Response(
                JSON.stringify({
                  id: 'u1',
                  name: 'Ada',
                  photoUrl: '',
                  followerCount: 0,
                  followingCount: 0,
                }),
                { status: 200 },
              )
            : new Response(JSON.stringify({ message: 'Not logged in' }), {
                status: 401,
              }),
        ),
      ),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>Login screen</p>} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <button
                    type="button"
                    onClick={() => api.get('/users/u1').catch(() => {})}
                  >
                    Load
                  </button>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Load' }));

    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });
});
