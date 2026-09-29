import { useEffect, useState } from 'react';
import { api, ApiError, resolveAssetUrl } from '../api/client.ts';
import type { BulletinItem } from '../api/types.ts';
import { FeedAuthorLink } from '../components/FeedAuthorLink.tsx';
import { BadgeLozenge } from '../components/TileGrid.tsx';

export const BULLETIN_BOARD_LIMIT = 21;

export function BulletinBoardPage() {
  const [items, setItems] = useState<BulletinItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<BulletinItem[]>('/tiles/feed/bulletin-board')
      .then((data) => {
        if (!cancelled) setItems(data.slice(0, BULLETIN_BOARD_LIMIT));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load the bulletin board.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Bulletin Board</h1>
      {error ? (
        <p className="text-center text-sm text-red-600">{error}</p>
      ) : !items ? (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          Nothing on the board yet. Follow people to see their item tiles here.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-col gap-1">
              <img
                src={resolveAssetUrl(item.photoUrl)}
                alt={item.caption}
                className="aspect-square w-full rounded-md bg-gray-100 object-cover"
              />
              <div className="self-start">
                <BadgeLozenge color={item.badgeColor} />
              </div>
              <p className="truncate text-xs text-gray-900">{item.caption}</p>
              <FeedAuthorLink author={item.author} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
