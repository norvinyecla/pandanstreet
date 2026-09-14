import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import { ApiError } from '../api/client.ts';

export function LoginPage() {
  const { currentUser, isLoading, login } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(name.trim());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to log in. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-8">
      <h1 className="text-center text-xl font-semibold text-gray-900">
        Welcome to pandanstreet
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-h-11 rounded-md border border-gray-300 px-3 text-base text-gray-900 focus:border-gray-500 focus:outline-none"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || name.trim().length === 0}
          className="min-h-11 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
