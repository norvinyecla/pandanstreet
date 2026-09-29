import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddTileSheet } from './AddTileSheet.tsx';

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

function renderSheet() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(<AddTileSheet onClose={onClose} onCreated={onCreated} />);
  return { onClose, onCreated };
}

describe('AddTileSheet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens as a labelled dialog offering Text and Item', () => {
    renderSheet();

    expect(
      screen.getByRole('dialog', { name: 'New tile' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^item/i })).toBeInTheDocument();
  });

  it('creates a text tile, then notifies and closes', async () => {
    const posted: unknown[] = [];
    mockFetch({
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
    const { onClose, onCreated } = renderSheet();

    await user.click(screen.getByRole('button', { name: /^text/i }));
    await user.type(screen.getByRole('textbox', { name: 'Text' }), 'Hi there');
    await user.click(screen.getByRole('button', { name: /post tile/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(posted).toEqual([JSON.stringify({ text: 'Hi there' })]);
  });

  it('rejects an empty text tile without calling the API', async () => {
    mockFetch({});

    const user = userEvent.setup();
    const { onCreated } = renderSheet();

    await user.click(screen.getByRole('button', { name: /^text/i }));
    await user.click(screen.getByRole('button', { name: /post tile/i }));

    expect(
      await screen.findByText(/text tile cannot be empty/i),
    ).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('rejects an oversized photo for an item tile', async () => {
    mockFetch({});

    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /^item/i }));

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    const input = screen.getByLabelText(/choose photo/i);
    await user.upload(input, bigFile);

    expect(
      await screen.findByText(/photo must be 5mb or smaller/i),
    ).toBeInTheDocument();
  });

  it('closes via Cancel, the backdrop, or Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderSheet();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
