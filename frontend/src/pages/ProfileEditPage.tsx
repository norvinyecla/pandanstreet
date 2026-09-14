import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, resolveAssetUrl } from '../api/client.ts';
import type { UserProfile } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';

const BIO_MAX_LENGTH = 140;

export function ProfileEditPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) setBio(currentUser.bio);
  }, [currentUser]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  if (!currentUser) return null;

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhotoFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.patch<UserProfile>(`/users/${currentUser.id}/bio`, { bio });
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        await api.postForm<UserProfile>(
          `/users/${currentUser.id}/photo`,
          formData,
        );
      }
      navigate('/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not save profile. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewSrc =
    photoPreviewUrl ?? resolveAssetUrl(currentUser.photoUrl) ?? undefined;

  return (
    <div className="flex flex-col gap-4 pt-6">
      <h1 className="text-center text-xl font-semibold text-gray-900">
        Edit profile
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={`${currentUser.name}'s profile photo`}
              className="h-24 w-24 rounded-full bg-gray-100 object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-24 w-24 rounded-full bg-gray-100"
            />
          )}
          <label
            htmlFor="photo"
            className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Choose photo
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="bio" className="text-sm font-medium text-gray-700">
              Bio
            </label>
            <span className="text-xs text-gray-500">
              {bio.length}/{BIO_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={BIO_MAX_LENGTH}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        <Link
          to="/"
          className="text-center text-sm font-medium text-gray-700 underline"
        >
          Cancel
        </Link>
      </form>
    </div>
  );
}
