export interface UserProfile {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  followerCount: number;
  followingCount: number;
}

export interface FollowUser {
  id: string;
  name: string;
  photoUrl: string;
}

export type BadgeColor = 'red' | 'yellow' | 'green';

export interface TextTile {
  id: string;
  userId: string;
  type: 'text';
  createdAt: string;
  text: string;
}

export interface ItemTile {
  id: string;
  userId: string;
  type: 'item';
  createdAt: string;
  photoUrl: string;
  caption: string;
  badgeColor: BadgeColor;
}

export type Tile = TextTile | ItemTile;

export interface FeedAuthor {
  id: string;
  name: string;
  photoUrl: string;
}

export interface Shoutout {
  id: string;
  createdAt: string;
  text: string;
  author: FeedAuthor;
}

export interface BulletinItem {
  id: string;
  createdAt: string;
  photoUrl: string;
  caption: string;
  badgeColor: BadgeColor;
  author: FeedAuthor;
}
