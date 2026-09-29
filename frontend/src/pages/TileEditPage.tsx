import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { Tile } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { useToast } from '../toast/toastContext.ts';

const TEXT_MAX_LENGTH = 140;

interface LocationState {
  text?: string;
}

export function TileEditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const showToast = useToast();
  const { currentUser } = useAuth();

  const initialText = (location.state as LocationState | null)?.text;
  const [text, setText] = useState(initialText ?? '');
  const [isLoading, setIsLoading] = useState(initialText === undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialText !== undefined || !id || !currentUser) return;
    let cancelled = false;
    api
      .get<Tile[]>(`/tiles/${currentUser.id}`)
      .then((tiles) => {
        if (cancelled) return;
        const tile = tiles.find((t) => t.id === id);
        if (!tile || tile.type !== 'text') {
          setError('Tile not found.');
          return;
        }
        setText(tile.text);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load tile.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, initialText, currentUser]);

  if (!id) return null;

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
      await api.patch<Tile>(`/tiles/${id}`, { text: trimmed });
      showToast('Post updated');
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save tile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p className="text-center text-sm text-gray-500">Loading…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-6">
      <h1 className="text-center text-xl font-semibold text-gray-900">
        Edit tile
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
        {isSubmitting ? 'Saving…' : 'Save'}
      </button>
      <Link
        to="/"
        className="text-center text-sm font-medium text-gray-700 underline"
      >
        Cancel
      </Link>
    </form>
  );
}
