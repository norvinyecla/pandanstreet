import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { deletePhoto, savePhoto } from './photo-files.js';

describe('photo-files', () => {
  let root: string;
  let uploadDir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'photo-files-'));
    uploadDir = join(root, 'uploads');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it('savePhoto writes the file and returns its /uploads/ path', async () => {
    const photoUrl = await savePhoto(uploadDir, Buffer.from('img'), 'png');

    expect(photoUrl).toMatch(/^\/uploads\/[\w-]+\.png$/);
    expect(await readdir(uploadDir)).toEqual([
      photoUrl.slice('/uploads/'.length),
    ]);
  });

  it('deletePhoto removes a saved photo', async () => {
    const photoUrl = await savePhoto(uploadDir, Buffer.from('img'), 'jpg');

    await deletePhoto(uploadDir, photoUrl);

    expect(await readdir(uploadDir)).toEqual([]);
  });

  it('deletePhoto ignores empty and non-upload paths', async () => {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(root, 'secret.txt'), 'keep');

    await deletePhoto(uploadDir, '');
    await deletePhoto(uploadDir, '/elsewhere/secret.txt');
    await deletePhoto(uploadDir, '/uploads/../secret.txt');

    expect(await readdir(root)).toContain('secret.txt');
  });

  it('deletePhoto logs instead of throwing when the delete fails', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      deletePhoto(uploadDir, '/uploads/missing.jpg'),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
