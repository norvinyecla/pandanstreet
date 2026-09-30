import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { Shoutout } from '../api/types.ts';
import { FeedAuthorLink } from '../components/FeedAuthorLink.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { ShoutoutsSkeleton } from '../components/Skeletons.tsx';
import { TileAge } from '../tiles/TileAge.tsx';

export const SHOUTOUTS_LIMIT = 20;

export function ShoutoutsPage() {
  const [shoutouts, setShoutouts] = useState<Shoutout[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Shoutout[]>('/tiles/feed/shoutouts')
      .then((data) => {
        if (!cancelled) setShoutouts(data.slice(0, SHOUTOUTS_LIMIT));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load shout-outs.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleRetry = () => {
    setError(null);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Shout-outs</h1>
      {error ? (
        <LoadError message={error} onRetry={handleRetry} />
      ) : !shoutouts ? (
        <ShoutoutsSkeleton />
      ) : shoutouts.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          No shout-outs yet. Follow people to see their text tiles here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shoutouts.map((shoutout) => (
            <li
              key={shoutout.id}
              className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <FeedAuthorLink author={shoutout.author} showAvatar />
                <TileAge createdAt={shoutout.createdAt} className="shrink-0" />
              </div>
              <p className="text-sm text-gray-900">{shoutout.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
