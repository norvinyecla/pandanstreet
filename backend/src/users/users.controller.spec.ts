import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  createTestSupabase,
  resetDatabase,
} from '../common/database/test-database.js';
import {
  createFakePhotoStorage,
  type FakeS3,
  keyOf,
} from '../common/uploads/fake-s3.js';
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
  const db = createTestSupabase();
  let s3: FakeS3;
  let usersService: UsersService;
  let controller: UsersController;

  beforeEach(async () => {
    await resetDatabase(db);
    usersService = new UsersService(db);
    const fake = createFakePhotoStorage();
    s3 = fake.s3;
    const config = { get: () => undefined } as unknown as ConfigService;
    controller = new UsersController(usersService, fake.storage, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the photo on a first upload', async () => {
    const user = await usersService.create(newUser('Ada'));

    const profile = await controller.uploadPhoto(user.id, user.id, photoFile());

    expect(s3.keys()).toEqual([keyOf(profile.photoUrl)]);
  });

  it('deletes the previous photo when it is replaced', async () => {
    const user = await usersService.create(newUser('Ada'));
    await controller.uploadPhoto(user.id, user.id, photoFile());

    const profile = await controller.uploadPhoto(user.id, user.id, photoFile());

    expect(s3.keys()).toEqual([keyOf(profile.photoUrl)]);
  });

  it('deletes the new photo if saving its URL fails', async () => {
    const user = await usersService.create(newUser('Ada'));
    vi.spyOn(usersService, 'setPhotoUrl').mockRejectedValue(
      new Error('Database write failed'),
    );

    await expect(
      controller.uploadPhoto(user.id, user.id, photoFile()),
    ).rejects.toThrow('Database write failed');
    expect(s3.keys()).toEqual([]);
  });

  it('keeps the new photo if deleting the previous one fails', async () => {
    const user = await usersService.create(newUser('Ada'));
    const first = await controller.uploadPhoto(user.id, user.id, photoFile());
    s3.failDelete = true;
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const profile = await controller.uploadPhoto(user.id, user.id, photoFile());

    expect(profile.photoUrl).not.toBe(first.photoUrl);
    expect(s3.keys()).toEqual([keyOf(first.photoUrl), keyOf(profile.photoUrl)]);
  });

  it('saves nothing if the upload to S3 fails', async () => {
    const user = await usersService.create(newUser('Ada'));
    s3.failPut = true;

    await expect(
      controller.uploadPhoto(user.id, user.id, photoFile()),
    ).rejects.toThrow('S3 upload failed');
    expect((await usersService.getProfile(user.id)).photoUrl).toBe('');
  });
});
