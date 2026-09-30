import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <p className="mt-8 text-center text-sm text-gray-500">Loading…</p>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
