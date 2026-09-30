import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { ToastProvider } from '../toast/ToastProvider.tsx';
import { TileEditPage } from './TileEditPage.tsx';

const me = {
  id: 'u1',
  name: 'Ada',
  photoUrl: '',
  bio: '',
  followerCount: 0,
  followingCount: 0,
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function mockFetch(
  handlers: Record<string, (init?: RequestInit) => Promise<Response>>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const path = new URL(url).pathname;
      const handler = handlers[`${method} ${path}`] ?? handlers[path];
      if (!handler) {
        return Promise.reject(
          new Error(`Unexpected fetch to ${method} ${url}`),
        );
      }
      return handler(init);
    }),
  );
}

function renderEditPage(initialEntry: { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/tiles/:id/edit" element={<TileEditPage />} />
            <Route path="/" element={<p>Home</p>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('TileEditPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pre-fills text from router state, saves, navigates home, and confirms', async () => {
    const patched: unknown[] = [];
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      'PATCH /tiles/t1': (init) => {
        patched.push(init?.body);
        return jsonResponse({
          id: 't1',
          userId: 'u1',
          type: 'text',
          createdAt: '2026-01-01',
          text: 'Updated text',
        });
      },
    });

    const user = userEvent.setup();
    renderEditPage({
      pathname: '/tiles/t1/edit',
      state: { text: 'Original text' },
    });

    const field = await screen.findByLabelText(/text/i);
    await waitFor(() => expect(field).toHaveValue('Original text'));

    await user.clear(field);
    await user.type(field, 'Updated text');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(patched).toEqual([JSON.stringify({ text: 'Updated text' })]);
    expect(screen.getByRole('status')).toHaveTextContent('Post updated');
  });

  it('returns home without saving when Escape is pressed', async () => {
    mockFetch({ '/auth/me': () => jsonResponse(me) });

    const user = userEvent.setup();
    renderEditPage({
      pathname: '/tiles/t1/edit',
      state: { text: 'Original text' },
    });

    await screen.findByLabelText(/text/i);
    await user.keyboard('{Escape}');

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('fetches the tile by id when no router state is available', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/tiles/u1': () =>
        jsonResponse([
          {
            id: 't1',
            userId: 'u1',
            type: 'text',
            createdAt: '2026-01-01',
            text: 'From the server',
          },
        ]),
    });

    renderEditPage({ pathname: '/tiles/t1/edit' });

    const field = await screen.findByLabelText(/text/i);
    await waitFor(() => expect(field).toHaveValue('From the server'));
  });

  it('shows a skeleton while loading the tile', async () => {
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/tiles/u1': () => new Promise<Response>(() => {}),
    });

    renderEditPage({ pathname: '/tiles/t1/edit' });

    expect(
      await screen.findByRole('status', { name: 'Loading tile' }),
    ).toBeInTheDocument();
  });

  it('re-runs the request when Try again is clicked', async () => {
    let attempts = 0;
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      '/tiles/u1': () =>
        ++attempts === 1
          ? jsonResponse({ message: 'Server error' }, 500)
          : jsonResponse([
              {
                id: 't1',
                userId: 'u1',
                type: 'text',
                createdAt: '2026-01-01',
                text: 'From the server',
              },
            ]),
    });

    const user = userEvent.setup();
    renderEditPage({ pathname: '/tiles/t1/edit' });

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    const field = await screen.findByLabelText(/text/i);
    expect(field).toHaveValue('From the server');
    expect(attempts).toBe(2);
  });

  it('disables Save while the update is pending', async () => {
    let resolvePatch!: (response: Response) => void;
    const patched: unknown[] = [];
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      'PATCH /tiles/t1': (init) => {
        patched.push(init?.body);
        return new Promise<Response>((resolve) => {
          resolvePatch = resolve;
        });
      },
    });

    const user = userEvent.setup();
    renderEditPage({
      pathname: '/tiles/t1/edit',
      state: { text: 'Original text' },
    });

    await user.click(await screen.findByRole('button', { name: 'Save' }));
    const savingButton = screen.getByRole('button', { name: 'Saving…' });
    expect(savingButton).toBeDisabled();
    await user.click(savingButton);

    resolvePatch(new Response(JSON.stringify({}), { status: 200 }));
    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(patched).toHaveLength(1);
  });
});
