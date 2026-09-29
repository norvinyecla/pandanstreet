import { useCallback, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import { TilesVersionContext } from '../tiles/TilesVersionContext.ts';
import { AddTileSheet } from './AddTileSheet.tsx';
import { BottomNav } from './BottomNav.tsx';

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isAddTileOpen, setIsAddTileOpen] = useState(false);
  const [tilesVersion, setTilesVersion] = useState(0);

  const openAddTile = useCallback(() => setIsAddTileOpen(true), []);
  const closeAddTile = useCallback(() => setIsAddTileOpen(false), []);
  const handleTileCreated = useCallback(
    () => setTilesVersion((version) => version + 1),
    [],
  );

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
      <main className={`flex-1 px-4 py-4 ${currentUser ? 'pb-20' : ''}`}>
        <TilesVersionContext.Provider value={tilesVersion}>
          {children}
        </TilesVersionContext.Provider>
      </main>
      {currentUser && <BottomNav onAddTile={openAddTile} />}
      {currentUser && isAddTileOpen && (
        <AddTileSheet onClose={closeAddTile} onCreated={handleTileCreated} />
      )}
    </div>
  );
}
