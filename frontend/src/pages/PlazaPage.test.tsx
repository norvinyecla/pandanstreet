import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FollowUser } from '../api/types.ts';
import { PlazaPage } from './PlazaPage.tsx';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function mockFetch(handlers: Record<string, () => Promise<Response>>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const handler = handlers[`${method} ${new URL(url).pathname}`];
    if (!handler) {
      return Promise.reject(new Error(`Unexpected fetch to ${method} ${url}`));
    }
    return handler();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function makeUser(index: number): FollowUser {
  return { id: `u${index}`, name: `Person ${index}`, photoUrl: '' };
}

function renderPage() {
  return render(<PlazaPage />, { wrapper: MemoryRouter });
}

describe('PlazaPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows each candidate with a profile link and Follow button', async () => {
    mockFetch({
      'GET /follows/plaza': () =>
        jsonResponse([makeUser(2), makeUser(3), makeUser(4)]),
    });

    renderPage();

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Person 2' })).toHaveAttribute(
      'href',
      '/users/u2',
    );
    expect(screen.getAllByRole('button', { name: /^follow/i })).toHaveLength(3);
  });

  it('shows at most 3 candidates', async () => {
    mockFetch({
      'GET /follows/plaza': () =>
        jsonResponse([2, 3, 4, 5].map((i) => makeUser(i))),
    });

    renderPage();

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
  });

  it('follows a candidate and marks them as followed', async () => {
    const fetchMock = mockFetch({
      'GET /follows/plaza': () => jsonResponse([makeUser(2), makeUser(3)]),
      'POST /follows/u2': () =>
        Promise.resolve(new Response(null, { status: 204 })),
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Follow Person 2' }),
    );

    expect(await screen.findByText('Following')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Follow Person 2' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Follow Person 3' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows an error when following fails', async () => {
    mockFetch({
      'GET /follows/plaza': () => jsonResponse([makeUser(2), makeUser(3)]),
      'POST /follows/u2': () =>
        jsonResponse({ message: 'User not found' }, 404),
    });

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Follow Person 2' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'User not found',
    );
    expect(
      screen.getByRole('button', { name: 'Follow Person 2' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['no candidates', []],
    ['only one candidate', [makeUser(2)]],
  ])('shows an empty state with %s', async (_label, candidates) => {
    mockFetch({ 'GET /follows/plaza': () => jsonResponse(candidates) });

    renderPage();

    expect(
      await screen.findByText(/no one new to discover/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
