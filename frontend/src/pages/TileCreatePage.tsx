import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { BadgeColor, Tile } from '../api/types.ts';
import { BADGE_MESSAGES, BadgeLozenge } from '../components/TileGrid.tsx';

const TEXT_MAX_LENGTH = 140;
const CAPTION_MAX_LENGTH = 140;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BADGE_COLORS: BadgeColor[] = ['red', 'yellow', 'green'];

type TileType = 'text' | 'item';

function TypeSelector({ onSelect }: { onSelect: (type: TileType) => void }) {
  return (
    <div className="flex flex-col gap-4 pt-6">
      <h1 className="text-center text-xl font-semibold text-gray-900">
        New tile
      </h1>
      <p className="text-center text-sm text-gray-600">
        Choose a tile type to get started.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onSelect('text')}
          className="min-h-11 rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900"
        >
          Text
          <span className="block text-xs font-normal text-gray-500">
            A short message, up to 140 characters.
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelect('item')}
          className="min-h-11 rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900"
        >
          Item
          <span className="block text-xs font-normal text-gray-500">
            A photo with a caption and a badge.
          </span>
        </button>
      </div>
      <Link
        to="/"
        className="text-center text-sm font-medium text-gray-700 underline"
      >
        Cancel
      </Link>
    </div>
  );
}

function TextTileForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Text tile cannot be empty.');
      return;
    }
    if (trimmed.length > TEXT_MAX_LENGTH) {
      setError(`Text must be ${TEXT_MAX_LENGTH} characters or fewer.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post<Tile>('/tiles/text', { text: trimmed });
      navigate('/');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create tile.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-6">
      <h1 className="text-center text-xl font-semibold text-gray-900">
        New text tile
      </h1>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="text" className="text-sm font-medium text-gray-700">
            Text
          </label>
          <span className="text-xs text-gray-500">
            {text.length}/{TEXT_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="text"
          name="text"
          rows={4}
          maxLength={TEXT_MAX_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
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
        {isSubmitting ? 'Posting…' : 'Post tile'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="text-center text-sm font-medium text-gray-700 underline"
      >
        Back
      </button>
    </form>
  );
}

function ItemTileForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [badgeColor, setBadgeColor] = useState<BadgeColor>('red');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPhotoFile(null);
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError('Photo must be a jpg, png, or webp file.');
      setPhotoFile(null);
      event.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photo must be 5MB or smaller.');
      setPhotoFile(null);
      event.target.value = '';
      return;
    }
    setError(null);
    setPhotoFile(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!photoFile) {
      setError('Please choose a photo.');
      return;
    }
    const trimmedCaption = caption.trim();
    if (!trimmedCaption) {
      setError('Caption cannot be empty.');
      return;
    }
    if (trimmedCaption.length > CAPTION_MAX_LENGTH) {
      setError(`Caption must be ${CAPTION_MAX_LENGTH} characters or fewer.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('caption', trimmedCaption);
      formData.append('badgeColor', badgeColor);
      await api.postForm<Tile>('/tiles/item', formData);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create tile.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-6">
      <h1 className="text-center text-xl font-semibold text-gray-900">
        New item tile
      </h1>
      <div className="flex flex-col items-center gap-2">
        {photoPreviewUrl && (
          <img
            src={photoPreviewUrl}
            alt="Selected photo preview"
            className="aspect-square w-full rounded-md bg-gray-100 object-cover"
          />
        )}
        <label
          htmlFor="photo"
          className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
        >
          {photoFile ? 'Change photo' : 'Choose photo'}
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
          <label
            htmlFor="caption"
            className="text-sm font-medium text-gray-700"
          >
            Caption
          </label>
          <span className="text-xs text-gray-500">
            {caption.length}/{CAPTION_MAX_LENGTH}
          </span>
        </div>
        <input
          id="caption"
          name="caption"
          type="text"
          maxLength={CAPTION_MAX_LENGTH}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="badgeColor" className="text-sm font-medium text-gray-700">
          Badge
        </label>
        <select
          id="badgeColor"
          name="badgeColor"
          value={badgeColor}
          onChange={(event) => setBadgeColor(event.target.value as BadgeColor)}
          className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none"
        >
          {BADGE_COLORS.map((color) => (
            <option key={color} value={color}>
              {color[0].toUpperCase() + color.slice(1)} — {BADGE_MESSAGES[color]}
            </option>
          ))}
        </select>
        <div className="pt-1">
          <BadgeLozenge color={badgeColor} />
        </div>
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
        {isSubmitting ? 'Posting…' : 'Post tile'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="text-center text-sm font-medium text-gray-700 underline"
      >
        Back
      </button>
    </form>
  );
}

export function TileCreatePage() {
  const [type, setType] = useState<TileType | null>(null);

  if (type === null) {
    return <TypeSelector onSelect={setType} />;
  }
  if (type === 'text') {
    return <TextTileForm onBack={() => setType(null)} />;
  }
  return <ItemTileForm onBack={() => setType(null)} />;
}
