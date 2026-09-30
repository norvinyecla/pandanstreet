import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { createCsvStores } from '../common/csv/csv-stores.js';
import { newUser } from './test-fixtures.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

function photoFile(): Express.Multer.File {
  return {
    buffer: Buffer.from('img'),
    size: 3,
    mimetype: 'image/png',
  } as Express.Multer.File;
}

describe('UsersController photo upload', () => {
  let dir: string;
  let uploadDir: string;
  let usersService: UsersService;
  let controller: UsersController;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'users-controller-'));
    uploadDir = join(dir, 'uploads');
    usersService = new UsersService(createCsvStores(dir));
    const config = {
      get: (key: string) => (key === 'DATA_DIR' ? dir : undefined),
    } as unknown as ConfigService;
    controller = new UsersController(usersService, config);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('keeps the photo on a first upload', async () => {
    const user = await usersService.create(newUser('Ada'));

    const profile = await controller.uploadPhoto(user.id, user.id, photoFile());

    expect(await readdir(uploadDir)).toEqual([
      profile.photoUrl.slice('/uploads/'.length),
    ]);
  });

  it('deletes the previous photo when it is replaced', async () => {
    const user = await usersService.create(newUser('Ada'));
    await controller.uploadPhoto(user.id, user.id, photoFile());

    const profile = await controller.uploadPhoto(user.id, user.id, photoFile());

    expect(await readdir(uploadDir)).toEqual([
      profile.photoUrl.slice('/uploads/'.length),
    ]);
  });

  it('deletes the new file if saving the photo path fails', async () => {
    const user = await usersService.create(newUser('Ada'));
    vi.spyOn(usersService, 'setPhotoUrl').mockRejectedValue(
      new Error('CSV write failed'),
    );

    await expect(
      controller.uploadPhoto(user.id, user.id, photoFile()),
    ).rejects.toThrow('CSV write failed');
    expect(await readdir(uploadDir)).toEqual([]);
  });
});
