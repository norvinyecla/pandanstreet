import { Link } from 'react-router-dom';

/** Shown for any URL that doesn't match a route. */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 pt-8 text-center">
      <h1 className="text-xl font-semibold text-base-content">
        Page not found
      </h1>
      <p className="text-sm text-base-content/70">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="btn btn-primary min-h-11">
        Go to the home page
      </Link>
    </div>
  );
}
