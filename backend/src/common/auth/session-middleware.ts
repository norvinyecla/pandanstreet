import type { NestExpressApplication } from '@nestjs/platform-express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';
import session from 'express-session';
import { SupabaseSessionStore } from './supabase-session.store.js';

const DEV_SESSION_SECRET = 'pandanstreet-dev-secret';

/** Secrets that must never be used in production (the dev default and the `.env.example` value). */
const PLACEHOLDER_SECRETS = [DEV_SESSION_SECRET, 'change-me-in-production'];

export interface SessionSettings {
  secret: string;
  /** Behind the HTTPS proxy in production: trust it and send the cookie over HTTPS only. */
  production: boolean;
}

/**
 * Reads the session settings from the environment. In production a missing
 * or placeholder `SESSION_SECRET` is a startup error.
 */
export function readSessionSettings(env: NodeJS.ProcessEnv): SessionSettings {
  const production = env.NODE_ENV === 'production';
  const secret = env.SESSION_SECRET;
  if (production && (!secret || PLACEHOLDER_SECRETS.includes(secret))) {
    throw new Error(
      'SESSION_SECRET must be set to a strong random value in production (see backend/.env.example)',
    );
  }
  return { secret: secret || DEV_SESSION_SECRET, production };
}

/** Session cookie middleware, storing sessions in the database. */
export function createSessionMiddleware(
  db: SupabaseClient,
  secret: string,
  secureCookie = false,
): RequestHandler {
  return session({
    secret,
    store: new SupabaseSessionStore(db),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

/**
 * Adds session cookies to the app. In production nginx terminates HTTPS in
 * front of the app, so the first proxy is trusted (for `X-Forwarded-Proto`)
 * and the cookie is only sent over HTTPS.
 */
export function useSessions(
  app: NestExpressApplication,
  db: SupabaseClient,
  settings: SessionSettings,
): void {
  if (settings.production) {
    app.set('trust proxy', 1);
  }
  app.use(createSessionMiddleware(db, settings.secret, settings.production));
}
