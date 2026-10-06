import type { RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import session from 'express-session';
import { SupabaseSessionStore } from './supabase-session.store.js';

/** Session cookie middleware, storing sessions in the database. */
export function createSessionMiddleware(
  db: SupabaseClient,
  secret: string,
): RequestHandler {
  return session({
    secret,
    store: new SupabaseSessionStore(db),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}
