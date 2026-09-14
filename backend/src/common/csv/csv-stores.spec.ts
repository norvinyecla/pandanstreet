import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCsvStores } from './csv-stores.js';

describe('createCsvStores', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'csv-stores-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates independent stores that read/write the expected files', async () => {
    const stores = createCsvStores(dir);

    await stores.users.append({
      id: 'u1',
      name: 'Ada',
      photoUrl: '',
      createdAt: '2026-01-01',
    });
    await stores.tiles.append({
      id: 't1',
      userId: 'u1',
      type: 'text',
      createdAt: '2026-01-01',
      archived: false,
    });
    await stores.tileText.append({ tileId: 't1', text: 'hello' });

    await expect(stores.users.readAll()).resolves.toEqual([
      { id: 'u1', name: 'Ada', photoUrl: '', createdAt: '2026-01-01' },
    ]);
    await expect(stores.tiles.readAll()).resolves.toEqual([
      {
        id: 't1',
        userId: 'u1',
        type: 'text',
        createdAt: '2026-01-01',
        archived: false,
      },
    ]);
    await expect(stores.tileText.readAll()).resolves.toEqual([
      { tileId: 't1', text: 'hello' },
    ]);
    await expect(stores.follows.readAll()).resolves.toEqual([]);
    await expect(stores.tileItem.readAll()).resolves.toEqual([]);
  });
});
