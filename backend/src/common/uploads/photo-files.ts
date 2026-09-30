import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Logger } from '@nestjs/common';

const UPLOADS_PREFIX = '/uploads/';
const logger = new Logger('PhotoFiles');

/** Writes an uploaded photo to `uploadDir` and returns its server-relative `/uploads/...` path. */
export async function savePhoto(
  uploadDir: string,
  buffer: Buffer,
  extension: string,
): Promise<string> {
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);
  return `${UPLOADS_PREFIX}${filename}`;
}

/**
 * Best-effort removal of a photo previously returned by `savePhoto`. Ignores
 * empty or non-`/uploads/` paths, and logs (never throws) if the delete fails.
 */
export async function deletePhoto(
  uploadDir: string,
  photoUrl: string,
): Promise<void> {
  if (!photoUrl.startsWith(UPLOADS_PREFIX)) return;
  const filename = photoUrl.slice(UPLOADS_PREFIX.length);
  // Only plain filenames: never follow a path out of the uploads directory.
  if (!filename || basename(filename) !== filename) return;

  try {
    await unlink(join(uploadDir, filename));
  } catch (err) {
    logger.warn(`Could not delete photo ${photoUrl}: ${String(err)}`);
  }
}
