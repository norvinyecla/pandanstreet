import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { Tile } from '../api/types.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { LoadError } from '../components/LoadError.tsx';
import { TileEditSkeleton } from '../components/Skeletons.tsx';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
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
          setLoadError('Tile not found.');
          return;
        }
        setText(tile.text);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
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
  }, [id, initialText, currentUser, reloadKey]);

  useEffect(() => {
    if (isSubmitting) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate('/');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, navigate]);

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

  const handleRetry = () => {
    setLoadError(null);
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  };

  if (loadError) {
    return <LoadError message={loadError} onRetry={handleRetry} />;
  }

  if (isLoading) {
    return <TileEditSkeleton />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-6">
      <h1 className="text-center text-xl font-semibold text-base-content">
        Edit tile
      </h1>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="text"
            className="text-sm font-medium text-base-content/80"
          >
            Text
          </label>
          <span className="text-xs text-base-content/70">
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
          className="textarea w-full text-base"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary min-h-11 text-base"
      >
        {isSubmitting ? 'Saving…' : 'Save'}
      </button>
      <Link
        to="/"
        className="text-center link text-sm font-medium text-base-content/80"
      >
        Cancel
      </Link>
    </form>
  );
}
