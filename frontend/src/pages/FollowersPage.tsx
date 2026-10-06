import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { FollowUser } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { FollowUserList } from '../components/FollowUserList.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { UserListSkeleton } from '../components/Skeletons.tsx';

export function FollowersPage() {
  const { currentUser } = useAuth();
  const [followers, setFollowers] = useState<FollowUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [currentUser, reloadKey]);

  const handleRetry = () => {
    setError(null);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-base-content">Followers</h1>
      {error ? (
        <LoadError message={error} onRetry={handleRetry} />
      ) : !followers ? (
        <UserListSkeleton withAction={false} />
      ) : followers.length === 0 ? (
        <p className="text-center text-sm text-base-content/70">
          No followers yet.
        </p>
      ) : (
        <FollowUserList users={followers} />
      )}
    </div>
  );
}
