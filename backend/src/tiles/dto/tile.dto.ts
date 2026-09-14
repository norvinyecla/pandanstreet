export interface TextTileDto {
  id: string;
  userId: string;
  type: 'text';
  createdAt: string;
  text: string;
}

export interface ItemTileDto {
  id: string;
  userId: string;
  type: 'item';
  createdAt: string;
  photoUrl: string;
  caption: string;
  badgeColor: 'red' | 'yellow' | 'green';
}

export type TileDto = TextTileDto | ItemTileDto;
