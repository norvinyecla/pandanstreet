import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { createCsvStores } from '../common/csv/csv-stores.js';
import { newUser } from '../users/test-fixtures.js';
import { UsersService } from '../users/users.service.js';
import { TilesController } from './tiles.controller.js';
import { TilesService } from './tiles.service.js';

function photoFile(): Express.Multer.File {
  return {
    buffer: Buffer.from('img'),
    size: 3,
    mimetype: 'image/png',
  } as Express.Multer.File;
}

const itemDto = { caption: 'My cat', badgeColor: 'green' as const };

describe('TilesController item photos', () => {
  let dir: string;
  let uploadDir: string;
  let usersService: UsersService;
  let tilesService: TilesService;
  let controller: TilesController;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tiles-controller-'));
    uploadDir = join(dir, 'uploads');
    const stores = createCsvStores(dir);
    usersService = new UsersService(stores);
    tilesService = new TilesService(stores, usersService);
    const config = {
      get: (key: string) => (key === 'DATA_DIR' ? dir : undefined),
    } as unknown as ConfigService;
    controller = new TilesController(tilesService, config);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('deletes the uploaded photo if creating the tile fails', async () => {
    await expect(
      controller.createItem('missing-user', itemDto, photoFile()),
    ).rejects.toThrow('User not found');
    expect(await readdir(uploadDir)).toEqual([]);
  });

  it('keeps the photo of a tile archived by its owner', async () => {
    const user = await usersService.create(newUser('Ada'));
    const tile = await controller.createItem(user.id, itemDto, photoFile());

    await controller.archive(tile.id, user.id);

    expect(await readdir(uploadDir)).toHaveLength(1);
  });

  it('keeps the photo of a tile auto-archived by a 4th tile', async () => {
    const user = await usersService.create(newUser('Ada'));
    await controller.createItem(user.id, itemDto, photoFile());
    await controller.createText(user.id, { text: 'two' });
    await controller.createText(user.id, { text: 'three' });
    await controller.createText(user.id, { text: 'four' });

    const active = await controller.getUserTiles(user.id);
    expect(active.every((tile) => tile.type === 'text')).toBe(true);
    expect(await readdir(uploadDir)).toHaveLength(1);
  });
});
