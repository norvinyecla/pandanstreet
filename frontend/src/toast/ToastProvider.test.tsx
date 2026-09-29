import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from './toastContext.ts';
import { TOAST_DURATION_MS, ToastProvider } from './ToastProvider.tsx';

function Trigger({ message }: { message: string }) {
  const showToast = useToast();
  return (
    <button type="button" onClick={() => showToast(message)}>
      Show {message}
    </button>
  );
}

function renderWithTriggers() {
  return render(
    <ToastProvider>
      <Trigger message="Post created" />
      <Trigger message="Post updated" />
    </ToastProvider>,
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a green toast in a live region and hides it after the duration', () => {
    renderWithTriggers();

    act(() =>
      screen.getByRole('button', { name: 'Show Post created' }).click(),
    );

    const toast = screen.getByText('Post created');
    expect(screen.getByRole('status')).toContainElement(toast);
    expect(toast).toHaveClass('bg-green-600');

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByText('Post created')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Post created')).not.toBeInTheDocument();
  });

  it('replaces the current toast and restarts the timer', () => {
    renderWithTriggers();

    act(() =>
      screen.getByRole('button', { name: 'Show Post created' }).click(),
    );
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 500));
    act(() =>
      screen.getByRole('button', { name: 'Show Post updated' }).click(),
    );

    expect(screen.queryByText('Post created')).not.toBeInTheDocument();
    expect(screen.getByText('Post updated')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByText('Post updated')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Post updated')).not.toBeInTheDocument();
  });
});
