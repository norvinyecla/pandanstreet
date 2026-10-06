import {
  DeleteObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { PhotoStorage, type S3Sender } from './photo-storage.js';

export const TEST_BUCKET = 'pandanstreet-test';
export const TEST_PHOTOS_BASE_URL = 'https://photos.example.test';

/**
 * In-memory stand-in for S3 in tests: keeps uploaded objects by key, so no
 * network or AWS credentials are needed. Set `failPut` / `failDelete` to make
 * the next calls throw.
 */
export class FakeS3 implements S3Sender {
  readonly objects = new Map<string, PutObjectCommandInput>();
  failPut = false;
  failDelete = false;

  send = (async (command: unknown) => {
    if (command instanceof PutObjectCommand) {
      if (this.failPut) throw new Error('S3 upload failed');
      this.objects.set(command.input.Key!, command.input);
      return {};
    }
    if (command instanceof DeleteObjectCommand) {
      if (this.failDelete) throw new Error('S3 delete failed');
      this.objects.delete(command.input.Key!);
      return {};
    }
    throw new Error('Unexpected S3 command');
  }) as S3Sender['send'];

  keys(): string[] {
    return [...this.objects.keys()];
  }
}

/** A real `PhotoStorage` backed by a `FakeS3`. */
export function createFakePhotoStorage(): {
  s3: FakeS3;
  storage: PhotoStorage;
} {
  const s3 = new FakeS3();
  return {
    s3,
    storage: new PhotoStorage(s3, TEST_BUCKET, TEST_PHOTOS_BASE_URL),
  };
}

/** The S3 key of a photo URL returned by the fake storage. */
export function keyOf(photoUrl: string): string {
  return photoUrl.slice(`${TEST_PHOTOS_BASE_URL}/`.length);
}
