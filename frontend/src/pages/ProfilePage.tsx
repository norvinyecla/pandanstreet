import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, resolveAssetUrl } from '../api/client.ts';
import type { FollowUser, Tile, UserProfile } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { TileGrid } from '../components/TileGrid.tsx';

export function ProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { currentUser } = useAuth();
  const profileId = id ?? currentUser?.id;
  const isOwnProfile = !id || id === currentUser?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowActionPending, setIsFollowActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    setError(null);

    Promise.all([
      api.get<UserProfile>(`/users/${profileId}`),
      api.get<Tile[]>(`/tiles/${profileId}`),
      isOwnProfile
        ? Promise.resolve([])
        : api.get<FollowUser[]>(`/follows/${profileId}/followers`),
    ])
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
  }, [profileId, isOwnProfile, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!profile) return;
    setIsFollowActionPending(true);
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
      setError(
        err instanceof ApiError ? err.message : 'Something went wrong.',
      );
    } finally {
      setIsFollowActionPending(false);
    }
  };

  if (error) {
    return <p className="text-center text-sm text-red-600">{error}</p>;
  }

  if (!profile) {
    return <p className="text-center text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-6">
      <img
        src={resolveAssetUrl(profile.photoUrl) || undefined}
        alt={`${profile.name}'s profile photo`}
        className="h-24 w-24 rounded-full bg-gray-100 object-cover"
      />
      <h1 className="text-xl font-semibold text-gray-900">{profile.name}</h1>
      {profile.bio && (
        <p className="max-w-xs text-center text-sm text-gray-700">
          {profile.bio}
        </p>
      )}
      <div className="flex gap-6 text-sm text-gray-600">
        <span>{profile.followerCount} followers</span>
        <span>{profile.followingCount} following</span>
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
      <div className="w-full pt-2">
        <TileGrid tiles={tiles} />
      </div>
    </div>
  );
}
