import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client.ts';
import type { BadgeColor, Tile } from '../api/types.ts';

export const BADGE_MESSAGES: Record<BadgeColor, string> = {
  red: 'Hello!',
  yellow: 'How are you?',
  green: "G'day!",
};

const BADGE_STYLES: Record<BadgeColor, string> = {
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
};

export function BadgeLozenge({ color }: { color: BadgeColor }) {
  return (
    <span
      className={`badge badge-sm border-0 font-medium ${BADGE_STYLES[color]}`}
    >
      {BADGE_MESSAGES[color]}
    </span>
  );
}

const ACTION_CLASS = 'link px-2 py-3 text-xs font-medium text-base-content/70';

function TileCard({
  tile,
  isOwnProfile,
  onDelete,
}: {
  tile: Tile;
  isOwnProfile: boolean;
  onDelete?: (tile: Tile) => Promise<void>;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = isOwnProfile && onDelete !== undefined;

  useEffect(() => {
    if (!isConfirmingDelete || isDeleting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsConfirmingDelete(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isConfirmingDelete, isDeleting]);

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(tile);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not delete post.',
      );
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  const actions = isOwnProfile && !isConfirmingDelete && (
    <div className="-my-3 -mr-1 flex shrink-0">
      {tile.type === 'text' && (
        <Link
          to={`/tiles/${tile.id}/edit`}
          state={{ text: tile.text }}
          className={ACTION_CLASS}
        >
          Edit
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          className={ACTION_CLASS}
        >
          Delete
        </button>
      )}
    </div>
  );

  return (
    <li className="card card-border gap-2 bg-base-100 p-3 text-left shadow-sm">
      {tile.type === 'text' ? (
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm break-words text-base-content">
            {tile.text}
          </p>
          {actions}
        </div>
      ) : (
        <>
          <img
            src={tile.photoUrl}
            alt={tile.caption}
            className="aspect-square w-full rounded-md bg-base-200 object-cover"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
              <p className="text-sm break-words text-base-content">
                {tile.caption}
              </p>
              <BadgeLozenge color={tile.badgeColor} />
            </div>
            {actions}
          </div>
        </>
      )}
      {isConfirmingDelete && (
        <div className="flex items-center justify-between gap-3 border-t border-base-200 pt-2">
          <p className="text-sm text-base-content">Delete this post?</p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
              className="btn btn-outline min-h-11"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="btn btn-error min-h-11"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </li>
  );
}

export function TileGrid({
  tiles,
  isOwnProfile = false,
  onDelete,
}: {
  tiles: Tile[];
  isOwnProfile?: boolean;
  onDelete?: (tile: Tile) => Promise<void>;
}) {
  if (tiles.length === 0) {
    return (
      <p className="text-center text-sm text-base-content/70">No tiles yet.</p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3">
      {tiles.map((tile) => (
        <TileCard
          key={tile.id}
          tile={tile}
          isOwnProfile={isOwnProfile}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
