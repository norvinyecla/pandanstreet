import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { ToastProvider } from '../toast/ToastProvider.tsx';
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
  render(
    <ToastProvider>
      <AddTileSheet onClose={onClose} onCreated={onCreated} />
    </ToastProvider>,
  );
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

  it('creates a text tile, then confirms, notifies, and closes', async () => {
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
    expect(screen.getByRole('status')).toHaveTextContent('Post created');
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
    const input = screen.getByLabelText('Add photo');
    await user.upload(input, bigFile);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /photo must be 5mb or smaller/i,
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.queryByText('JPG, PNG or WebP, up to 5MB'),
    ).not.toBeInTheDocument();
  });

  it('shows the photo limits hint, then a preview with a Change label once chosen', async () => {
    // jsdom doesn't implement object URLs, which the preview relies on.
    const { createObjectURL, revokeObjectURL } = URL;
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    onTestFinished(() => {
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
    });

    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /^item/i }));

    const input = screen.getByLabelText('Add photo');
    expect(input).toHaveAccessibleDescription('JPG, PNG or WebP, up to 5MB');

    const photo = new File([new Uint8Array(10)], 'ok.png', {
      type: 'image/png',
    });
    await user.upload(input, photo);

    expect(
      await screen.findByAltText('Selected photo preview'),
    ).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByLabelText('Change photo')).toBe(input);
  });

  it('asks for a photo when posting an item tile without one', async () => {
    mockFetch({});

    const user = userEvent.setup();
    const { onCreated } = renderSheet();

    await user.click(screen.getByRole('button', { name: /^item/i }));
    await user.click(screen.getByRole('button', { name: /post tile/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please add a photo.',
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('stops Escape from reaching handlers on the page underneath', async () => {
    const pageHandler = vi.fn();
    document.addEventListener('keydown', pageHandler);
    onTestFinished(() => document.removeEventListener('keydown', pageHandler));

    const user = userEvent.setup();
    const { onClose } = renderSheet();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(pageHandler).not.toHaveBeenCalled();
  });

  it('closes via Cancel, the backdrop, or Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderSheet();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('disables Post tile while the tile is being created', async () => {
    let resolvePost!: (response: Response) => void;
    let postCount = 0;
    mockFetch({
      'POST /tiles/text': () => {
        postCount += 1;
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      },
    });

    const user = userEvent.setup();
    const { onCreated } = renderSheet();

    await user.click(screen.getByRole('button', { name: /^text/i }));
    await user.type(screen.getByRole('textbox', { name: 'Text' }), 'Hi there');
    await user.click(screen.getByRole('button', { name: 'Post tile' }));
    const postingButton = screen.getByRole('button', { name: 'Posting…' });
    expect(postingButton).toBeDisabled();
    await user.click(postingButton);

    resolvePost(new Response(JSON.stringify({}), { status: 201 }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(postCount).toBe(1);
  });
});
