import type { ConfigService } from '@nestjs/config';

export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function resolveUploadLimits(config: ConfigService): {
  maxBytes: number;
  allowedTypes: Record<string, string>;
} {
  const maxBytes = Number(
    config.get<string>('UPLOAD_MAX_BYTES') ?? 5 * 1024 * 1024,
  );
  const allowedList = config
    .get<string>('UPLOAD_ALLOWED_TYPES')
    ?.split(',')
    .map((type) => type.trim())
    .filter(Boolean);
  const allowedTypes = allowedList
    ? Object.fromEntries(
        allowedList
          .filter((type) => type in ALLOWED_PHOTO_TYPES)
          .map((type) => [type, ALLOWED_PHOTO_TYPES[type]]),
      )
    : ALLOWED_PHOTO_TYPES;
  return { maxBytes, allowedTypes };
}
