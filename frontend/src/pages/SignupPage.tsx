import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';
import { ApiError } from '../api/client.ts';
import { AuthField } from '../components/AuthField.tsx';

export function SignupPage() {
  const { currentUser, isLoading, signup } = useAuth();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
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
      await signup(username.trim(), name.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to create your account. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-8">
      <h1 className="text-center text-xl font-semibold text-base-content">
        Create your account
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthField
          id="username"
          label="Username"
          hint="3–30 characters: lowercase letters, numbers, or underscores"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={30}
          pattern="[a-z0-9_]+"
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
        />
        <AuthField
          id="name"
          label="Display name"
          type="text"
          autoComplete="name"
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <AuthField
          id="password"
          label="Password"
          hint="8–20 characters"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
            name.trim().length === 0 ||
            password.length === 0
          }
          className="btn btn-primary min-h-11 text-base"
        >
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="text-center text-sm text-base-content/70">
        Already have an account?{' '}
        <Link
          to="/login"
          className="inline-block py-2 link link-primary font-medium"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
