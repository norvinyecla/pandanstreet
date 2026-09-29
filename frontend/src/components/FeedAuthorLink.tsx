import { Link } from 'react-router-dom';
import { resolveAssetUrl } from '../api/client.ts';
import type { FeedAuthor } from '../api/types.ts';

export function FeedAuthorLink({
  author,
  showAvatar = false,
}: {
  author: FeedAuthor;
  showAvatar?: boolean;
}) {
  return (
    <Link
      to={`/users/${author.id}`}
      className="flex min-h-11 min-w-0 items-center gap-2 text-sm font-medium text-gray-900"
    >
      {showAvatar &&
        (author.photoUrl ? (
          <img
            src={resolveAssetUrl(author.photoUrl)}
            alt={`${author.name}'s profile photo`}
            className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-8 w-8 shrink-0 rounded-full bg-gray-100"
          />
        ))}
      <span className="truncate">{author.name}</span>
    </Link>
  );
}
