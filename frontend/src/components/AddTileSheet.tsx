import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { api, ApiError } from '../api/client.ts';
import type { BadgeColor, Tile } from '../api/types.ts';
import { useToast } from '../toast/toastContext.ts';
import { BADGE_MESSAGES } from './TileGrid.tsx';

const TEXT_MAX_LENGTH = 140;
const CAPTION_MAX_LENGTH = 140;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BADGE_COLORS: BadgeColor[] = ['red', 'yellow', 'green'];

type TileType = 'text' | 'item';

const SHEET_TITLE_ID = 'add-tile-sheet-title';

function TypeSelector({
  onSelect,
  onCancel,
}: {
  onSelect: (type: TileType) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2
        id={SHEET_TITLE_ID}
        className="text-center text-xl font-semibold text-gray-900"
      >
        New tile
      </h2>
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
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 text-center text-sm font-medium text-gray-700 underline"
      >
        Cancel
      </button>
    </div>
  );
}

function TextTileForm({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
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
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create tile.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2
        id={SHEET_TITLE_ID}
        className="text-center text-xl font-semibold text-gray-900"
      >
        New text tile
      </h2>
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
        className="min-h-11 text-center text-sm font-medium text-gray-700 underline"
      >
        Back
      </button>
    </form>
  );
}

function ItemTileForm({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [badgeColor, setBadgeColor] = useState<BadgeColor>('red');
  const [photoError, setPhotoError] = useState<string | null>(null);
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
      setPhotoError('Photo must be a jpg, png, or webp file.');
      setPhotoFile(null);
      event.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo must be 5MB or smaller.');
      setPhotoFile(null);
      event.target.value = '';
      return;
    }
    setPhotoError(null);
    setPhotoFile(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!photoFile) {
      setPhotoError('Please add a photo.');
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
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create tile.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2
        id={SHEET_TITLE_ID}
        className="text-center text-xl font-semibold text-gray-900"
      >
        New item tile
      </h2>
      <div className="flex gap-3">
        <div className="flex w-28 shrink-0 flex-col gap-1">
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={photoFile ? 'Change photo' : 'Add photo'}
            aria-describedby={photoError ? 'photo-error' : 'photo-hint'}
            aria-invalid={photoError ? true : undefined}
            onChange={handlePhotoChange}
            className="peer sr-only"
          />
          <label
            htmlFor="photo"
            className={`relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 text-gray-500 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gray-900 peer-focus-visible:ring-offset-2 active:border-gray-500 ${
              photoPreviewUrl
                ? 'border-transparent'
                : photoError
                  ? 'border-dashed border-red-400 bg-red-50'
                  : 'border-dashed border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            {photoPreviewUrl ? (
              <>
                <img
                  src={photoPreviewUrl}
                  alt="Selected photo preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                  Change
                </span>
              </>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span className="text-xs font-medium">Add photo</span>
              </>
            )}
          </label>
          {photoError ? (
            <p
              id="photo-error"
              role="alert"
              className="text-center text-xs leading-tight text-red-600"
            >
              {photoError}
            </p>
          ) : (
            <p
              id="photo-hint"
              className="text-center text-xs leading-tight text-gray-500"
            >
              JPG, PNG or WebP, up to 5MB
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
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
            <label
              htmlFor="badgeColor"
              className="text-sm font-medium text-gray-700"
            >
              Badge
            </label>
            <select
              id="badgeColor"
              name="badgeColor"
              value={badgeColor}
              onChange={(event) =>
                setBadgeColor(event.target.value as BadgeColor)
              }
              className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none"
            >
              {BADGE_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color[0].toUpperCase() + color.slice(1)} —{' '}
                  {BADGE_MESSAGES[color]}
                </option>
              ))}
            </select>
          </div>
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
        className="min-h-11 text-center text-sm font-medium text-gray-700 underline"
      >
        Back
      </button>
    </form>
  );
}

/** Half-height bottom sheet for creating a tile without leaving the current page. */
export function AddTileSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<TileType | null>(null);
  const showToast = useToast();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCreated = () => {
    showToast('Post created');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/30"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={SHEET_TITLE_ID}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto h-[50svh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-4 pt-5 pb-6 shadow-lg focus:outline-none motion-safe:animate-slide-up"
      >
        {type === null ? (
          <TypeSelector onSelect={setType} onCancel={onClose} />
        ) : type === 'text' ? (
          <TextTileForm
            onBack={() => setType(null)}
            onCreated={handleCreated}
          />
        ) : (
          <ItemTileForm
            onBack={() => setType(null)}
            onCreated={handleCreated}
          />
        )}
      </div>
    </div>
  );
}
