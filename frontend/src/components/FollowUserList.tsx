import type { ReactNode } from 'react';
import type { FollowUser } from '../api/types.ts';
import { FeedAuthorLink } from './FeedAuthorLink.tsx';

export function FollowUserList({
  users,
  renderAction,
}: {
  users: FollowUser[];
  renderAction?: (user: FollowUser) => ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {users.map((user) => (
        <li
          key={user.id}
          className="card card-border flex-row items-center justify-between gap-3 bg-base-100 px-3 py-2 shadow-sm"
        >
          <FeedAuthorLink author={user} showAvatar />
          {renderAction?.(user)}
        </li>
      ))}
    </ul>
  );
}
