import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { FollowUser } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { FollowUserList } from '../components/FollowUserList.tsx';

export function FollowersPage() {
  const { currentUser } = useAuth();
  const [followers, setFollowers] = useState<FollowUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    api
      .get<FollowUser[]>(`/follows/${currentUser.id}/followers`)
      .then((data) => {
        if (!cancelled) setFollowers(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load followers.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Followers</h1>
      {error ? (
        <p className="text-center text-sm text-red-600">{error}</p>
      ) : !followers ? (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      ) : followers.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No followers yet.</p>
      ) : (
        <FollowUserList users={followers} />
      )}
    </div>
  );
}
