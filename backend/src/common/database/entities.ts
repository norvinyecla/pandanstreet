export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  photoUrl: string;
  bio: string;
  createdAt: string;
}

export type BadgeColor = 'red' | 'yellow' | 'green';

/** Row shapes as stored in Postgres (see supabase/migrations). */
export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  photo_url: string;
  bio: string;
  created_at: string;
}

export interface TileRow {
  id: string;
  user_id: string;
  type: 'text' | 'item';
  created_at: string;
  archived: boolean;
}

export const USER_COLUMNS =
  'id, username, password_hash, name, photo_url, bio, created_at';

export function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    name: row.name,
    photoUrl: row.photo_url,
    bio: row.bio,
    createdAt: toIsoString(row.created_at),
  };
}

/** Normalizes Postgres `timestamptz` output to the ISO format the API has always returned. */
export function toIsoString(timestamp: string): string {
  return new Date(timestamp).toISOString();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids are `uuid` columns; anything else can't match a row (and would make Postgres error). */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Postgres error code for a unique-constraint violation. */
export const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
