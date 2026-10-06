/** Error message for a failed page load, with a button that re-runs the request. */
export function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 pt-6">
      <p role="alert" className="text-center text-sm text-error">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="btn btn-outline min-h-11"
      >
        Try again
      </button>
    </div>
  );
}
