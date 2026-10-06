import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPhotoStorage, PhotoStorage } from './photo-storage.js';

/** Provides the shared, app-wide S3 photo storage. */
@Global()
@Module({
  providers: [
    {
      provide: PhotoStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PhotoStorage =>
        createPhotoStorage({
          region: config.get<string>('AWS_REGION'),
          bucket: config.get<string>('S3_BUCKET'),
          baseUrl: config.get<string>('PHOTOS_BASE_URL'),
        }),
    },
  ],
  exports: [PhotoStorage],
})
export class PhotoStorageModule {}
