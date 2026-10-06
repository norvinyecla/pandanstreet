import { promisify } from 'node:util';
import type { SessionData } from 'express-session';
import {
  createTestSupabase,
  resetDatabase,
} from '../database/test-database.js';
import { SupabaseSessionStore } from './supabase-session.store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function sessionData(userId: string, expiresInMs = DAY_MS): SessionData {
  return {
    userId,
    cookie: {
      originalMaxAge: expiresInMs,
      expires: new Date(Date.now() + expiresInMs),
    },
  } as SessionData;
}

describe('SupabaseSessionStore', () => {
  const db = createTestSupabase();
  const store = new SupabaseSessionStore(db);
  const get = promisify(store.get.bind(store));
  const set = promisify(store.set.bind(store));
  const destroy = promisify(store.destroy.bind(store));
  const touch = promisify(store.touch.bind(store));

  beforeEach(async () => {
    await resetDatabase(db);
  });

  async function expiryOf(sid: string): Promise<number> {
    const { data } = await db
      .from('sessions')
      .select('expires_at')
      .eq('sid', sid)
      .single()
      .throwOnError();
    return new Date(data.expires_at as string).getTime();
  }

  it('returns a saved session', async () => {
    await set('sid-1', sessionData('user-1'));

    const loaded = await get('sid-1');
    expect(loaded).toMatchObject({ userId: 'user-1' });
  });

  it('returns nothing for an unknown session', async () => {
    expect(await get('missing')).toBeNull();
  });

  it('returns nothing for an expired session', async () => {
    await db
      .from('sessions')
      .insert({
        sid: 'old',
        sess: sessionData('user-1'),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .throwOnError();

    expect(await get('old')).toBeNull();
  });

  it('removes the session on destroy', async () => {
    await set('sid-1', sessionData('user-1'));

    await destroy('sid-1');

    expect(await get('sid-1')).toBeNull();
  });

  it('moves the expiry forward on touch', async () => {
    await set('sid-1', sessionData('user-1', DAY_MS));
    const before = await expiryOf('sid-1');

    await touch('sid-1', sessionData('user-1', 2 * DAY_MS));

    expect(await expiryOf('sid-1')).toBeGreaterThan(before);
  });

  it('deletes expired sessions when saving one', async () => {
    await db
      .from('sessions')
      .insert({
        sid: 'old',
        sess: sessionData('user-1'),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .throwOnError();

    await set('sid-2', sessionData('user-2'));

    const { data } = await db.from('sessions').select('sid').throwOnError();
    expect(data).toEqual([{ sid: 'sid-2' }]);
  });
});
