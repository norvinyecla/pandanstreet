import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { UserProfile } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';

export function ProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { currentUser } = useAuth();
  const profileId = id ?? currentUser?.id;
  const isOwnProfile = !id || id === currentUser?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    api
      .get<UserProfile>(`/users/${profileId}`)
      .then((data) => {
        if (!cancelled) setProfile(data);
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
  }, [profileId]);

  if (error) {
    return <p className="text-center text-sm text-red-600">{error}</p>;
  }

  if (!profile) {
    return <p className="text-center text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-6">
      <img
        src={profile.photoUrl || undefined}
        alt={`${profile.name}'s profile photo`}
        className="h-24 w-24 rounded-full bg-gray-100 object-cover"
      />
      <h1 className="text-xl font-semibold text-gray-900">{profile.name}</h1>
      <div className="flex gap-6 text-sm text-gray-600">
        <span>{profile.followerCount} followers</span>
        <span>{profile.followingCount} following</span>
      </div>
      {isOwnProfile && (
        <Link
          to="/profile/edit"
          className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
        >
          Edit profile
        </Link>
      )}
    </div>
  );
}
