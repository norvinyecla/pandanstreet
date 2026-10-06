import type { SupabaseClient } from '@supabase/supabase-js';
import session, { type SessionData } from 'express-session';

/** Used when a session cookie has no expiry of its own. */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Callback = (err?: unknown) => void;

/**
 * express-session store backed by the `sessions` table, so logins survive a
 * backend restart. Database errors are passed to the callback, which fails
 * the request rather than treating the user as logged out.
 */
export class SupabaseSessionStore extends session.Store {
  constructor(private readonly db: SupabaseClient) {
    super();
  }

  override get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void,
  ): void {
    this.findActive(sid).then(
      (sess) => callback(null, sess),
      (err: unknown) => callback(err),
    );
  }

  override set(sid: string, sess: SessionData, callback?: Callback): void {
    settle(this.save(sid, sess), callback);
  }

  override destroy(sid: string, callback?: Callback): void {
    settle(
      this.db.from('sessions').delete().eq('sid', sid).throwOnError(),
      callback,
    );
  }

  override touch(sid: string, sess: SessionData, callback?: Callback): void {
    settle(
      this.db
        .from('sessions')
        .update({ expires_at: expiresAt(sess) })
        .eq('sid', sid)
        .throwOnError(),
      callback,
    );
  }

  /** The session, or null if it's missing or expired. */
  private async findActive(sid: string): Promise<SessionData | null> {
    const { data } = await this.db
      .from('sessions')
      .select('sess')
      .eq('sid', sid)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
      .throwOnError();
    return (data?.sess as SessionData | undefined) ?? null;
  }

  /** Saves the session, then deletes any that have expired. */
  private async save(sid: string, sess: SessionData): Promise<void> {
    await this.db
      .from('sessions')
      .upsert({ sid, sess, expires_at: expiresAt(sess) })
      .throwOnError();
    await this.db
      .from('sessions')
      .delete()
      .lte('expires_at', new Date().toISOString())
      .throwOnError();
  }
}

function expiresAt(sess: SessionData): string {
  const expires = sess.cookie?.expires;
  return (
    expires ? new Date(expires) : new Date(Date.now() + DEFAULT_TTL_MS)
  ).toISOString();
}

function settle(work: PromiseLike<unknown>, callback?: Callback): void {
  work.then(
    () => callback?.(),
    (err: unknown) => callback?.(err),
  );
}
