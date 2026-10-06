import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from './supabase.module.js';

/**
 * Client for tests that need the database. Runs against the separate local
 * test stack (`yarn db:test:start`), configured through backend/.env.test.
 */
export function createTestSupabase(): SupabaseClient {
  return createSupabaseClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Deletes every row; follows and tiles go with their users via `on delete cascade`. */
export async function resetDatabase(db: SupabaseClient): Promise<void> {
  await db.from('sessions').delete().not('sid', 'is', null).throwOnError();
  await db.from('users').delete().not('id', 'is', null).throwOnError();
}
