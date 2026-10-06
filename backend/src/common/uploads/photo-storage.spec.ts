import { Logger } from '@nestjs/common';
import {
  createFakePhotoStorage,
  keyOf,
  TEST_BUCKET,
  TEST_PHOTOS_BASE_URL,
} from './fake-s3.js';
import { createPhotoStorage, PhotoStorage } from './photo-storage.js';

describe('PhotoStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('save uploads the photo under photos/ and returns its public URL', async () => {
    const { s3, storage } = createFakePhotoStorage();
    const body = Buffer.from('img');

    const photoUrl = await storage.save(body, 'png', 'image/png');

    expect(photoUrl).toMatch(
      new RegExp(`^${TEST_PHOTOS_BASE_URL}/photos/[\\w-]+\\.png$`),
    );
    expect(s3.objects.get(keyOf(photoUrl))).toEqual({
      Bucket: TEST_BUCKET,
      Key: keyOf(photoUrl),
      Body: body,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    });
  });

  it('save gives each photo a new key', async () => {
    const { s3, storage } = createFakePhotoStorage();

    await storage.save(Buffer.from('a'), 'jpg', 'image/jpeg');
    await storage.save(Buffer.from('b'), 'jpg', 'image/jpeg');

    expect(s3.keys()).toHaveLength(2);
  });

  it('save throws if the upload fails', async () => {
    const { s3, storage } = createFakePhotoStorage();
    s3.failPut = true;

    await expect(
      storage.save(Buffer.from('img'), 'png', 'image/png'),
    ).rejects.toThrow('S3 upload failed');
  });

  it('a trailing slash on the base URL is ignored', async () => {
    const { s3 } = createFakePhotoStorage();
    const storage = new PhotoStorage(
      s3,
      TEST_BUCKET,
      `${TEST_PHOTOS_BASE_URL}/`,
    );

    const photoUrl = await storage.save(Buffer.from('img'), 'png', 'image/png');

    expect(photoUrl.startsWith(`${TEST_PHOTOS_BASE_URL}/photos/`)).toBe(true);
  });

  it('delete removes a saved photo', async () => {
    const { s3, storage } = createFakePhotoStorage();
    const photoUrl = await storage.save(
      Buffer.from('img'),
      'jpg',
      'image/jpeg',
    );

    await storage.delete(photoUrl);

    expect(s3.keys()).toEqual([]);
  });

  it('delete ignores empty, pre-S3 and foreign URLs', async () => {
    const { s3, storage } = createFakePhotoStorage();
    const send = vi.spyOn(s3, 'send');

    await storage.delete('');
    await storage.delete('/uploads/old.jpg');
    await storage.delete('https://elsewhere.example/photos/a.jpg');
    await storage.delete(`${TEST_PHOTOS_BASE_URL}/other/a.jpg`);
    await storage.delete(`${TEST_PHOTOS_BASE_URL}/photos/../secret.jpg`);
    await storage.delete(`${TEST_PHOTOS_BASE_URL}/photos/nested/a.jpg`);

    expect(send).not.toHaveBeenCalled();
  });

  it('delete logs instead of throwing when the delete fails', async () => {
    const { s3, storage } = createFakePhotoStorage();
    const photoUrl = await storage.save(
      Buffer.from('img'),
      'jpg',
      'image/jpeg',
    );
    s3.failDelete = true;
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(storage.delete(photoUrl)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('createPhotoStorage', () => {
  const complete = {
    region: 'ap-southeast-2',
    bucket: 'pandanstreet-dev',
    baseUrl: 'https://pandanstreet-dev.s3.ap-southeast-2.amazonaws.com',
  };

  it('builds the storage when every setting is present', () => {
    expect(createPhotoStorage(complete)).toBeInstanceOf(PhotoStorage);
  });

  it.each(['region', 'bucket', 'baseUrl'] as const)(
    'fails with a clear message when %s is missing',
    (setting) => {
      expect(() =>
        createPhotoStorage({ ...complete, [setting]: undefined }),
      ).toThrow(
        'AWS_REGION, S3_BUCKET and PHOTOS_BASE_URL must be set (see backend/.env.example)',
      );
    },
  );
});
