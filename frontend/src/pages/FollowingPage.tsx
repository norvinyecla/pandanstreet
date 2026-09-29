import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { FollowUser } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { FollowUserList } from '../components/FollowUserList.tsx';

export function FollowingPage() {
  const { currentUser } = useAuth();
  const [following, setFollowing] = useState<FollowUser[] | null>(null);
  const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  }, [currentUser]);

  // Unfollowed profiles stay listed so they can be re-followed from here.
  const handleToggleFollow = async (user: FollowUser) => {
    const isUnfollowed = unfollowedIds.has(user.id);
    setPendingId(user.id);
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
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Following</h1>
      {actionError && (
        <p role="alert" className="text-center text-sm text-red-600">
          {actionError}
        </p>
      )}
      {error ? (
        <p className="text-center text-sm text-red-600">{error}</p>
      ) : !following ? (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      ) : following.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
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
                disabled={pendingId === user.id}
                aria-label={`Follow ${user.name}`}
                className="min-h-11 shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Follow
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleFollow(user)}
                disabled={pendingId === user.id}
                aria-label={`Unfollow ${user.name}`}
                className="min-h-11 shrink-0 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
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
