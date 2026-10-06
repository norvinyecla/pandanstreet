export interface FeedAuthorDto {
  id: string;
  username: string;
  name: string;
  photoUrl: string;
}

export interface ShoutoutDto {
  id: string;
  createdAt: string;
  text: string;
  author: FeedAuthorDto;
}

export interface BulletinItemDto {
  id: string;
  createdAt: string;
  photoUrl: string;
  caption: string;
  badgeColor: 'red' | 'yellow' | 'green';
  author: FeedAuthorDto;
}
