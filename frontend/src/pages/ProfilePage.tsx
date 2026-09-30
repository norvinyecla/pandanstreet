import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, resolveAssetUrl } from '../api/client.ts';
import type { FollowUser, Tile, UserProfile } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { ProfileAvatar } from '../components/ProfileAvatar.tsx';
import { ProfileSkeleton } from '../components/Skeletons.tsx';
import { TileGrid } from '../components/TileGrid.tsx';
import { useTilesVersion } from '../tiles/TilesVersionContext.ts';
import { useToast } from '../toast/toastContext.ts';

export function ProfilePage() {
  const { username } = useParams<{ username?: string }>();
  const { currentUser } = useAuth();
  const isOwnProfile = !username || username === currentUser?.username;
  const profilePath = isOwnProfile
    ? currentUser && `/users/${currentUser.id}`
    : `/users/by-username/${encodeURIComponent(username)}`;
  const tilesVersion = useTilesVersion();
  const showToast = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowActionPending, setIsFollowActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!profilePath) return;
    let cancelled = false;
    setError(null);

    // The profile is looked up by username, so its id (needed for tiles and
    // followers) is only known once it has loaded.
    api
      .get<UserProfile>(profilePath)
      .then((profileData) =>
        Promise.all([
          profileData,
          api.get<Tile[]>(`/tiles/${profileData.id}`),
          isOwnProfile
            ? Promise.resolve([])
            : api.get<FollowUser[]>(`/follows/${profileData.id}/followers`),
        ]),
      )
      .then(([profileData, tilesData, followers]) => {
        if (cancelled) return;
        setProfile(profileData);
        setTiles(tilesData);
        setIsFollowing(
          followers.some((follower) => follower.id === currentUser?.id),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load profile.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profilePath, isOwnProfile, currentUser?.id, tilesVersion, reloadKey]);

  const handleRetry = () => {
    setError(null);
    setProfile(null);
    setReloadKey((key) => key + 1);
  };

  const handleToggleFollow = async () => {
    if (!profile) return;
    setIsFollowActionPending(true);
    setActionError(null);
    try {
      if (isFollowing) {
        await api.delete<void>(`/follows/${profile.id}`);
        setIsFollowing(false);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: prev.followerCount - 1 } : prev,
        );
      } else {
        await api.post<void>(`/follows/${profile.id}`);
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev,
        );
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Something went wrong.',
      );
    } finally {
      setIsFollowActionPending(false);
    }
  };

  const handleDeleteTile = async (tile: Tile) => {
    await api.delete<void>(`/tiles/${tile.id}`);
    setTiles((prev) => prev.filter((t) => t.id !== tile.id));
    showToast('Post deleted');
  };

  if (error) {
    return <LoadError message={error} onRetry={handleRetry} />;
  }

  if (!profile) {
    return <ProfileSkeleton />;
  }

  const followerLabel = `${profile.followerCount} ${
    profile.followerCount === 1 ? 'follower' : 'followers'
  }`;
  const followingLabel = `${profile.followingCount} following`;

  return (
    <div className="flex flex-col items-center gap-4 pt-6">
      <ProfileAvatar
        src={resolveAssetUrl(profile.photoUrl)}
        name={profile.name}
        size="lg"
      />
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900">{profile.name}</h1>
        <p className="text-sm text-gray-500">@{profile.username}</p>
      </div>
      {profile.bio && (
        <p className="max-w-xs text-center text-sm text-gray-700">
          {profile.bio}
        </p>
      )}
      <div className="flex gap-6 text-sm text-gray-600">
        {isOwnProfile ? (
          <>
            <Link to="/followers" className="flex min-h-11 items-center">
              {followerLabel}
            </Link>
            <Link to="/following" className="flex min-h-11 items-center">
              {followingLabel}
            </Link>
          </>
        ) : (
          <>
            <span>{followerLabel}</span>
            <span>{followingLabel}</span>
          </>
        )}
      </div>
      {isOwnProfile ? (
        <Link
          to="/profile/edit"
          className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
        >
          Edit profile
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleToggleFollow}
          disabled={isFollowActionPending}
          className="min-h-11 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
      {actionError && (
        <p role="alert" className="text-center text-sm text-red-600">
          {actionError}
        </p>
      )}
      <div className="w-full pt-2">
        <h2 className="pb-2 text-sm font-semibold text-gray-900">Tiles</h2>
        <TileGrid
          tiles={tiles}
          isOwnProfile={isOwnProfile}
          onDelete={isOwnProfile ? handleDeleteTile : undefined}
        />
      </div>
    </div>
  );
}
