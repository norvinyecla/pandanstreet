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
          <Route path="/signup" element={<p>Sign up page</p>} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  let loginResponse: () => Response;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loginResponse = () =>
      new Response(JSON.stringify(profile), { status: 200 });
    fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      if (url.endsWith('/auth/login')) {
        return Promise.resolve(loginResponse());
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function fillAndSubmit(username: string, password: string) {
    const user = userEvent.setup();
    await waitFor(() =>
      expect(screen.getByLabelText(/username/i)).toBeEnabled(),
    );
    await user.type(screen.getByLabelText(/username/i), username);
    await user.type(screen.getByLabelText(/password/i), password);
    await user.click(screen.getByRole('button', { name: /log in/i }));
  }

  it('logs in with username and password and navigates home', async () => {
    renderLoginPage();
    await fillAndSubmit('Ada', 'password123');

    expect(await screen.findByText('Home')).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/auth/login'),
    )!;
    expect(JSON.parse(init.body)).toEqual({
      username: 'ada',
      password: 'password123',
    });
  });

  it('shows the error message when credentials are rejected', async () => {
    loginResponse = () =>
      new Response(
        JSON.stringify({
          statusCode: 401,
          message: 'Incorrect username or password',
          error: 'Unauthorized',
        }),
        { status: 401 },
      );
    renderLoginPage();
    await fillAndSubmit('ada', 'wrong-pass');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Incorrect username or password',
    );
  });

  it('links to the sign-up page', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(
      await screen.findByRole('link', { name: /create an account/i }),
    );
    expect(await screen.findByText('Sign up page')).toBeInTheDocument();
  });
});
