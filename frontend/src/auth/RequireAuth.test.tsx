import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
});
