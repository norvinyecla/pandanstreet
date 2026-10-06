import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { SignupPage } from './SignupPage.tsx';

const profile = {
  id: 'u1',
  username: 'ada lovelace',
  name: 'Ada Lovelace',
  photoUrl: '',
  followerCount: 0,
  followingCount: 0,
};

function renderSignupPage() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('SignupPage', () => {
  let signupResponse: () => Response;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signupResponse = () =>
      new Response(JSON.stringify(profile), { status: 201 });
    fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      if (url.endsWith('/auth/signup')) {
        return Promise.resolve(signupResponse());
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function fillAndSubmit() {
    const user = userEvent.setup();
    await waitFor(() =>
      expect(screen.getByLabelText(/username/i)).toBeEnabled(),
    );
    await user.type(screen.getByLabelText(/username/i), 'Ada_L');
    await user.type(screen.getByLabelText(/display name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/password/i), 'engine1843');
    await user.click(screen.getByRole('button', { name: /sign up/i }));
  }

  it('creates an account and navigates home', async () => {
    renderSignupPage();
    await fillAndSubmit();

    expect(await screen.findByText('Home')).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/auth/signup'),
    )!;
    expect(JSON.parse(init.body)).toEqual({
      username: 'ada_l',
      name: 'Ada Lovelace',
      password: 'engine1843',
    });
  });

  it('shows the error when the username is taken', async () => {
    signupResponse = () =>
      new Response(
        JSON.stringify({
          statusCode: 409,
          message: 'Username is already taken',
          error: 'Conflict',
        }),
        { status: 409 },
      );
    renderSignupPage();
    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Username is already taken',
    );
  });

  it('links back to the login page', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    await user.click(await screen.findByRole('link', { name: /log in/i }));
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('disables the button while signing up', async () => {
    let resolveSignup!: (response: Response) => void;
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/auth/me')
        ? Promise.resolve(new Response(null, { status: 401 }))
        : new Promise<Response>((resolve) => {
            resolveSignup = resolve;
          }),
    );

    renderSignupPage();
    await fillAndSubmit();

    expect(
      screen.getByRole('button', { name: 'Creating account…' }),
    ).toBeDisabled();
    resolveSignup(new Response(JSON.stringify(profile), { status: 201 }));
    expect(await screen.findByText('Home')).toBeInTheDocument();
  });
});
