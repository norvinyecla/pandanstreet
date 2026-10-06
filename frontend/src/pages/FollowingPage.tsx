import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { FollowUser } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { FollowUserList } from '../components/FollowUserList.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { UserListSkeleton } from '../components/Skeletons.tsx';

export function FollowingPage() {
  const { currentUser } = useAuth();
  const [following, setFollowing] = useState<FollowUser[] | null>(null);
  const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    api
      .get<FollowUser[]>(`/follows/${currentUser.id}/following`)
      .then((data) => {
        if (!cancelled) setFollowing(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load following.',
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

  const setPending = (userId: string, isPending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(userId);
      else next.delete(userId);
      return next;
    });

  // Unfollowed profiles stay listed so they can be re-followed from here.
  const handleToggleFollow = async (user: FollowUser) => {
    const isUnfollowed = unfollowedIds.has(user.id);
    setPending(user.id, true);
    setActionError(null);
    try {
      if (isUnfollowed) {
        await api.post<void>(`/follows/${user.id}`);
      } else {
        await api.delete<void>(`/follows/${user.id}`);
      }
      setUnfollowedIds((prev) => {
        const next = new Set(prev);
        if (isUnfollowed) next.delete(user.id);
        else next.add(user.id);
        return next;
      });
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Something went wrong.',
      );
    } finally {
      setPending(user.id, false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-base-content">Following</h1>
      {actionError && (
        <p role="alert" className="text-center text-sm text-error">
          {actionError}
        </p>
      )}
      {error ? (
        <LoadError message={error} onRetry={handleRetry} />
      ) : !following ? (
        <UserListSkeleton />
      ) : following.length === 0 ? (
        <p className="text-center text-sm text-base-content/70">
          You're not following anyone yet.
        </p>
      ) : (
        <FollowUserList
          users={following}
          renderAction={(user) =>
            unfollowedIds.has(user.id) ? (
              <button
                type="button"
                onClick={() => handleToggleFollow(user)}
                disabled={pendingIds.has(user.id)}
                aria-label={`Follow ${user.name}`}
                className="btn btn-primary min-h-11 shrink-0"
              >
                Follow
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleFollow(user)}
                disabled={pendingIds.has(user.id)}
                aria-label={`Unfollow ${user.name}`}
                className="btn btn-outline min-h-11 shrink-0"
              >
                Unfollow
              </button>
            )
          }
        />
      )}
    </div>
  );
}
