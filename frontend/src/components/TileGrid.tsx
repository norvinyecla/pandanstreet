import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, resolveAssetUrl } from '../api/client.ts';
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
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[color]}`}
    >
      {BADGE_MESSAGES[color]}
    </span>
  );
}

const ACTION_CLASS = 'px-2 py-3 text-xs font-medium text-gray-600 underline';

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
    <li className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-left">
      {tile.type === 'text' ? (
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm break-words text-gray-900">
            {tile.text}
          </p>
          {actions}
        </div>
      ) : (
        <>
          <img
            src={resolveAssetUrl(tile.photoUrl)}
            alt={tile.caption}
            className="aspect-square w-full rounded-md bg-gray-100 object-cover"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
              <p className="text-sm break-words text-gray-900">
                {tile.caption}
              </p>
              <BadgeLozenge color={tile.badgeColor} />
            </div>
            {actions}
          </div>
        </>
      )}
      {isConfirmingDelete && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
          <p className="text-sm text-gray-900">Delete this post?</p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="min-h-11 rounded-md bg-red-600 px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
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
    return <p className="text-center text-sm text-gray-500">No tiles yet.</p>;
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
