import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { TileCreatePage } from './TileCreatePage.tsx';

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
        return Promise.reject(new Error(`Unexpected fetch to ${method} ${url}`));
      }
      return handler(init);
    }),
  );
}

function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={['/tiles/new']}>
      <AuthProvider>
        <Routes>
          <Route path="/tiles/new" element={<TileCreatePage />} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('TileCreatePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a text tile and navigates home', async () => {
    const posted: unknown[] = [];
    mockFetch({
      '/auth/me': () => jsonResponse(me),
      'POST /tiles/text': (init) => {
        posted.push(init?.body);
        return jsonResponse({
          id: 't1',
          userId: 'u1',
          type: 'text',
          createdAt: '2026-01-01',
          text: 'Hi there',
        });
      },
    });

    const user = userEvent.setup();
    renderCreatePage();

    await user.click(await screen.findByRole('button', { name: /^text/i }));
    await user.type(screen.getByLabelText(/text/i), 'Hi there');
    await user.click(screen.getByRole('button', { name: /post tile/i }));

    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(posted).toEqual([JSON.stringify({ text: 'Hi there' })]);
  });

  it('rejects an empty text tile without calling the API', async () => {
    mockFetch({ '/auth/me': () => jsonResponse(me) });

    const user = userEvent.setup();
    renderCreatePage();

    await user.click(await screen.findByRole('button', { name: /^text/i }));
    await user.click(screen.getByRole('button', { name: /post tile/i }));

    expect(
      await screen.findByText(/text tile cannot be empty/i),
    ).toBeInTheDocument();
  });

  it('rejects an oversized photo for an item tile', async () => {
    mockFetch({ '/auth/me': () => jsonResponse(me) });

    const user = userEvent.setup();
    renderCreatePage();

    await user.click(await screen.findByRole('button', { name: /^item/i }));

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    const input = screen.getByLabelText(/choose photo/i);
    await user.upload(input, bigFile);

    expect(
      await screen.findByText(/photo must be 5mb or smaller/i),
    ).toBeInTheDocument();
  });
});
