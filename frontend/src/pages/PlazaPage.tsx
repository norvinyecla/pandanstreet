import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { FollowUser } from '../api/types.ts';
import { FollowUserList } from '../components/FollowUserList.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { UserListSkeleton } from '../components/Skeletons.tsx';

/** Plaza only shows suggestions when at least this many profiles qualify. */
export const PLAZA_MIN_CANDIDATES = 2;
export const PLAZA_MAX_CANDIDATES = 3;

export function PlazaPage() {
  const [candidates, setCandidates] = useState<FollowUser[] | null>(null);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<FollowUser[]>('/follows/plaza')
      .then((data) => {
        if (!cancelled) {
          setCandidates(
            data.length < PLAZA_MIN_CANDIDATES
              ? []
              : data.slice(0, PLAZA_MAX_CANDIDATES),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load the Plaza.',
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

  const setPending = (userId: string, isPending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(userId);
      else next.delete(userId);
      return next;
    });

  const handleFollow = async (user: FollowUser) => {
    setPending(user.id, true);
    setActionError(null);
    try {
      await api.post<void>(`/follows/${user.id}`);
      setFollowedIds((prev) => new Set(prev).add(user.id));
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
      <h1 className="text-xl font-semibold text-gray-900">Plaza</h1>
      {actionError && (
        <p role="alert" className="text-center text-sm text-red-600">
          {actionError}
        </p>
      )}
      {error ? (
        <LoadError message={error} onRetry={handleRetry} />
      ) : !candidates ? (
        <UserListSkeleton rows={PLAZA_MAX_CANDIDATES} />
      ) : candidates.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          No one new to discover right now. Check back later.
        </p>
      ) : (
        <FollowUserList
          users={candidates}
          renderAction={(user) =>
            followedIds.has(user.id) ? (
              <span className="shrink-0 px-4 text-sm font-medium text-gray-500">
                Following
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleFollow(user)}
                disabled={pendingIds.has(user.id)}
                aria-label={`Follow ${user.name}`}
                className="min-h-11 shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Follow
              </button>
            )
          }
        />
      )}
    </div>
  );
}
