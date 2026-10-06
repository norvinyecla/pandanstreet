import { formatTileAge } from './formatTileAge.ts';

export function TileAge({
  createdAt,
  className = '',
}: {
  createdAt: string;
  className?: string;
}) {
  return (
    <time
      dateTime={createdAt}
      className={`text-xs text-base-content/70 ${className}`}
    >
      {formatTileAge(createdAt)}
    </time>
  );
}
