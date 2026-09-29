import { join } from 'node:path';
import { CsvFileStore, type CsvColumn } from './csv-file-store.js';
import type {
  FollowRecord,
  TileItemRecord,
  TileRecord,
  TileTextRecord,
  UserRecord,
} from './entities.js';

const userColumns: CsvColumn<UserRecord>[] = [
  { name: 'id', type: 'string' },
  { name: 'username', type: 'string' },
  { name: 'passwordHash', type: 'string' },
  { name: 'name', type: 'string' },
  { name: 'photoUrl', type: 'string' },
  { name: 'bio', type: 'string' },
  { name: 'createdAt', type: 'string' },
];

const followColumns: CsvColumn<FollowRecord>[] = [
  { name: 'followerId', type: 'string' },
  { name: 'followeeId', type: 'string' },
  { name: 'createdAt', type: 'string' },
];

const tileColumns: CsvColumn<TileRecord>[] = [
  { name: 'id', type: 'string' },
  { name: 'userId', type: 'string' },
  { name: 'type', type: 'string' },
  { name: 'createdAt', type: 'string' },
  { name: 'archived', type: 'boolean' },
];

const tileTextColumns: CsvColumn<TileTextRecord>[] = [
  { name: 'tileId', type: 'string' },
  { name: 'text', type: 'string' },
];

const tileItemColumns: CsvColumn<TileItemRecord>[] = [
  { name: 'tileId', type: 'string' },
  { name: 'photoUrl', type: 'string' },
  { name: 'caption', type: 'string' },
  { name: 'badgeColor', type: 'string' },
];

export interface CsvStores {
  users: CsvFileStore<UserRecord>;
  follows: CsvFileStore<FollowRecord>;
  tiles: CsvFileStore<TileRecord>;
  tileText: CsvFileStore<TileTextRecord>;
  tileItem: CsvFileStore<TileItemRecord>;
}

/** Creates the typed CSV stores for all five entities, rooted at `dataDir`. */
export function createCsvStores(dataDir: string): CsvStores {
  return {
    users: new CsvFileStore<UserRecord>(
      join(dataDir, 'users.csv'),
      userColumns,
    ),
    follows: new CsvFileStore<FollowRecord>(
      join(dataDir, 'follows.csv'),
      followColumns,
    ),
    tiles: new CsvFileStore<TileRecord>(
      join(dataDir, 'tiles.csv'),
      tileColumns,
    ),
    tileText: new CsvFileStore<TileTextRecord>(
      join(dataDir, 'tile_text.csv'),
      tileTextColumns,
    ),
    tileItem: new CsvFileStore<TileItemRecord>(
      join(dataDir, 'tile_item.csv'),
      tileItemColumns,
    ),
  };
}
