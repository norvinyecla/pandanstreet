import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from './supabase.module.js';

/**
 * Client for tests that need the database. Runs against the local Supabase
 * stack (`yarn db:start`), configured through backend/.env.
 */
export function createTestSupabase(): SupabaseClient {
  return createSupabaseClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Deletes every row; follows and tiles go with their users via `on delete cascade`. */
export async function resetDatabase(db: SupabaseClient): Promise<void> {
  await db.from('users').delete().not('id', 'is', null).throwOnError();
}
