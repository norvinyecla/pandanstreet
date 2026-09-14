export interface UserRecord extends Record<string, unknown> {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  createdAt: string;
}

export interface FollowRecord extends Record<string, unknown> {
  followerId: string;
  followeeId: string;
  createdAt: string;
}

export interface TileRecord extends Record<string, unknown> {
  id: string;
  userId: string;
  type: 'text' | 'item';
  createdAt: string;
  archived: boolean;
}

export interface TileTextRecord extends Record<string, unknown> {
  tileId: string;
  text: string;
}

export interface TileItemRecord extends Record<string, unknown> {
  tileId: string;
  photoUrl: string;
  caption: string;
  badgeColor: 'red' | 'yellow' | 'green';
}
