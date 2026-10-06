import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import { ApiError } from '../api/client.ts';
import { AuthField } from '../components/AuthField.tsx';

export function LoginPage() {
  const { currentUser, isLoading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      await login(username.trim(), password);
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
      <h1 className="text-center text-xl font-semibold text-base-content">
        Welcome to pandanstreet
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthField
          id="username"
          label="Username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={30}
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={20}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            username.trim().length === 0 ||
            password.length === 0
          }
          className="btn btn-primary min-h-11 text-base"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="text-center text-sm text-base-content/70">
        New here?{' '}
        <Link
          to="/signup"
          className="inline-block py-2 link link-primary font-medium"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
