import { resolveAssetUrl } from '../api/client.ts';
import type { BadgeColor, Tile } from '../api/types.ts';

const BADGE_MESSAGES: Record<BadgeColor, string> = {
  red: 'Hello!',
  yellow: 'How are you?',
  green: "G'day!",
};

const BADGE_STYLES: Record<BadgeColor, string> = {
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
};

function BadgeLozenge({ color }: { color: BadgeColor }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_STYLES[color]}`}
    >
      {BADGE_MESSAGES[color]}
    </span>
  );
}

export function TileGrid({ tiles }: { tiles: Tile[] }) {
  if (tiles.length === 0) {
    return <p className="text-center text-sm text-gray-500">No tiles yet.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-3">
      {tiles.map((tile) => (
        <li
          key={tile.id}
          className="rounded-lg border border-gray-200 p-3 text-left"
        >
          {tile.type === 'text' ? (
            <p className="text-sm text-gray-900">{tile.text}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <img
                src={resolveAssetUrl(tile.photoUrl)}
                alt={tile.caption}
                className="aspect-square w-full rounded-md bg-gray-100 object-cover"
              />
              <p className="text-sm text-gray-900">{tile.caption}</p>
              <BadgeLozenge color={tile.badgeColor} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
