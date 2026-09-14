import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <header className="flex min-h-14 items-center justify-between border-b border-gray-200 px-4">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          pandanstreet
        </Link>
        {currentUser && (
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 min-w-11 px-3 text-sm font-medium text-gray-600"
          >
            Log out
          </button>
        )}
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
