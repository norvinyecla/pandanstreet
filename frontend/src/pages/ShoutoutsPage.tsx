import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { Shoutout } from '../api/types.ts';
import { FeedAuthorLink } from '../components/FeedAuthorLink.tsx';

export const SHOUTOUTS_LIMIT = 20;

export function ShoutoutsPage() {
  const [shoutouts, setShoutouts] = useState<Shoutout[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Shout-outs</h1>
      {error ? (
        <p className="text-center text-sm text-red-600">{error}</p>
      ) : !shoutouts ? (
        <p className="text-center text-sm text-gray-500">Loading…</p>
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
              <FeedAuthorLink author={shoutout.author} showAvatar />
              <p className="text-sm text-gray-900">{shoutout.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
