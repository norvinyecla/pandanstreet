import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import './load-env.js';
import { createTestSupabase } from '../src/common/database/test-database.js';

/** Origin of a URL, treating `localhost` and `127.0.0.1` as the same host. */
function originOf(url: string): string {
  const parsed = new URL(url);
  if (parsed.hostname === 'localhost') parsed.hostname = '127.0.0.1';
  return parsed.origin;
}

/** SUPABASE_URL from backend/.env (the dev database), if there is one. */
function devSupabaseUrl(): string | undefined {
  try {
    return parseEnv(readFileSync('.env', 'utf8')).SUPABASE_URL;
  } catch {
    return undefined;
  }
}

/**
 * Runs once before any test file. Tests wipe the database's tables, so stop
 * the run unless they're pointed at a reachable test database (Phase 22).
 */
export default async function setup(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for tests: copy them from `yarn db:test:status` into backend/.env.test (see backend/.env.test.example)',
    );
  }

  const devUrl = devSupabaseUrl();
  if (devUrl && originOf(devUrl) === originOf(url)) {
    throw new Error(
      `Tests would wipe the dev database: SUPABASE_URL (${url}) is the same as in backend/.env. Point backend/.env.test at the test database from \`yarn db:test:status\``,
    );
  }

  const { error } = await createTestSupabase()
    .from('users')
    .select('id')
    .limit(1);
  if (error) {
    throw new Error(
      `Test database isn't reachable at ${url} (${error.message}). Start it with \`yarn db:test:start\``,
    );
  }
}
