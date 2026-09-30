import { formatTileAge } from './formatTileAge.ts';

export function TileAge({
  createdAt,
  className = '',
}: {
  createdAt: string;
  className?: string;
}) {
  return (
    <time dateTime={createdAt} className={`text-xs text-gray-500 ${className}`}>
      {formatTileAge(createdAt)}
    </time>
  );
}
