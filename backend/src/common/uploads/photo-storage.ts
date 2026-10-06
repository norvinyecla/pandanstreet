import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';

const KEY_PREFIX = 'photos/';

/** The part of `S3Client` that `PhotoStorage` uses, so tests can pass a fake. */
export type S3Sender = Pick<S3Client, 'send'>;

export interface PhotoStorageConfig {
  region?: string;
  bucket?: string;
  baseUrl?: string;
}

/**
 * Stores uploaded photos in S3 under `photos/<uuid>.<ext>`. The bucket allows
 * public reads of `photos/*`, so the browser loads a photo straight from the
 * public URL returned by `save`, which is what the database stores.
 */
export class PhotoStorage {
  private readonly logger = new Logger(PhotoStorage.name);
  private readonly urlPrefix: string;

  constructor(
    private readonly s3: S3Sender,
    private readonly bucket: string,
    baseUrl: string,
  ) {
    this.urlPrefix = `${baseUrl.replace(/\/+$/, '')}/${KEY_PREFIX}`;
  }

  /** Uploads a photo and returns its public URL. Throws if the upload fails. */
  async save(
    buffer: Buffer,
    extension: string,
    contentType: string,
  ): Promise<string> {
    const filename = `${randomUUID()}.${extension}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: `${KEY_PREFIX}${filename}`,
        Body: buffer,
        ContentType: contentType,
        // Keys are never reused, so a photo at a URL never changes.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${this.urlPrefix}${filename}`;
  }

  /**
   * Best-effort removal of a photo previously returned by `save`. Ignores
   * empty values and any URL outside this bucket's `photos/` (e.g. pre-S3
   * `/uploads/` paths), and logs (never throws) if the delete fails.
   */
  async delete(photoUrl: string): Promise<void> {
    if (!photoUrl.startsWith(this.urlPrefix)) return;
    const filename = photoUrl.slice(this.urlPrefix.length);
    // Only plain filenames: never delete outside the photos/ prefix.
    if (!/^[\w-]+\.\w+$/.test(filename)) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: `${KEY_PREFIX}${filename}`,
        }),
      );
    } catch (err) {
      this.logger.warn(`Could not delete photo ${photoUrl}: ${String(err)}`);
    }
  }
}

/**
 * Builds the app's `PhotoStorage` from `AWS_REGION`, `S3_BUCKET` and
 * `PHOTOS_BASE_URL`, failing fast if any is missing. Credentials come from
 * the AWS SDK's default chain (AWS_PROFILE / access-key env vars locally, the
 * instance role on EC2), never from this app's config.
 */
export function createPhotoStorage(config: PhotoStorageConfig): PhotoStorage {
  const { region, bucket, baseUrl } = config;
  if (!region || !bucket || !baseUrl) {
    throw new Error(
      'AWS_REGION, S3_BUCKET and PHOTOS_BASE_URL must be set (see backend/.env.example)',
    );
  }
  return new PhotoStorage(new S3Client({ region }), bucket, baseUrl);
}
