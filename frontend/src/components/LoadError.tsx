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
      <p role="alert" className="text-center text-sm text-red-600">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
      >
        Try again
      </button>
    </div>
  );
}
