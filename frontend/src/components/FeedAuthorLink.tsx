import { Link } from 'react-router-dom';
import { resolveAssetUrl } from '../api/client.ts';
import type { FeedAuthor } from '../api/types.ts';
import { ProfileAvatar } from './ProfileAvatar.tsx';

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
      className="flex min-h-11 min-w-0 items-center gap-2 text-sm font-medium text-base-content"
    >
      {showAvatar && (
        <ProfileAvatar
          src={resolveAssetUrl(author.photoUrl)}
          name={author.name}
          size="sm"
        />
      )}
      <span className="truncate">{author.name}</span>
    </Link>
  );
}
