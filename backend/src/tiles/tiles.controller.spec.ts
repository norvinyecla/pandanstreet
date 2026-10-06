import type { ConfigService } from '@nestjs/config';
import {
  createTestSupabase,
  resetDatabase,
} from '../common/database/test-database.js';
import {
  createFakePhotoStorage,
  type FakeS3,
} from '../common/uploads/fake-s3.js';
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
  const db = createTestSupabase();
  let s3: FakeS3;
  let usersService: UsersService;
  let tilesService: TilesService;
  let controller: TilesController;

  beforeEach(async () => {
    await resetDatabase(db);
    usersService = new UsersService(db);
    tilesService = new TilesService(db, usersService);
    const fake = createFakePhotoStorage();
    s3 = fake.s3;
    const config = { get: () => undefined } as unknown as ConfigService;
    controller = new TilesController(tilesService, fake.storage, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes the uploaded photo if creating the tile fails', async () => {
    await expect(
      controller.createItem('missing-user', itemDto, photoFile()),
    ).rejects.toThrow('User not found');
    expect(s3.keys()).toEqual([]);
  });

  it('saves no tile if the upload to S3 fails', async () => {
    const user = await usersService.create(newUser('Ada'));
    s3.failPut = true;

    await expect(
      controller.createItem(user.id, itemDto, photoFile()),
    ).rejects.toThrow('S3 upload failed');
    expect(await controller.getUserTiles(user.id)).toEqual([]);
  });

  it('keeps the photo of a tile archived by its owner', async () => {
    const user = await usersService.create(newUser('Ada'));
    const tile = await controller.createItem(user.id, itemDto, photoFile());

    await controller.archive(tile.id, user.id);

    expect(s3.keys()).toHaveLength(1);
  });

  it('keeps the photo of a tile auto-archived by a 4th tile', async () => {
    const user = await usersService.create(newUser('Ada'));
    await controller.createItem(user.id, itemDto, photoFile());
    await controller.createText(user.id, { text: 'two' });
    await controller.createText(user.id, { text: 'three' });
    await controller.createText(user.id, { text: 'four' });

    const active = await controller.getUserTiles(user.id);
    expect(active.every((tile) => tile.type === 'text')).toBe(true);
    expect(s3.keys()).toHaveLength(1);
  });
});
