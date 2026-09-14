import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { LoginPage } from './LoginPage.tsx';

const profile = {
  id: 'u1',
  name: 'Ada',
  photoUrl: '',
  followerCount: 0,
  followingCount: 0,
};

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/auth/me')) {
          return Promise.resolve(
            new Response(null, { status: 401 }),
          );
        }
        if (url.endsWith('/auth/login')) {
          return Promise.resolve(
            new Response(JSON.stringify(profile), { status: 201 }),
          );
        }
        return Promise.reject(new Error(`Unexpected fetch to ${url}`));
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs in and navigates home on submit', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/your name/i)).toBeEnabled(),
    );

    await user.type(screen.getByLabelText(/your name/i), 'Ada');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });
});
