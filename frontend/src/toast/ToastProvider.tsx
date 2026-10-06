import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ToastContext } from './toastContext.ts';

export const TOAST_DURATION_MS = 3000;

interface Toast {
  id: number;
  message: string;
}

/** Shows a short green confirmation at the top of the screen that hides itself. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4"
      >
        {toast && (
          <p
            key={toast.id}
            className="alert alert-success px-4 py-2 text-sm font-medium shadow-lg motion-safe:animate-toast-in"
          >
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
