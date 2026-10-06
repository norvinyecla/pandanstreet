import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

/**
 * Server-side Supabase client using the service-role key. Only the backend
 * talks to the database; the key must never reach the frontend.
 */
export function createSupabaseClient(
  url: string | undefined,
  serviceRoleKey: string | undefined,
): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see backend/.env.example)',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Provides the shared, app-wide Supabase client. */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient =>
        createSupabaseClient(
          config.get<string>('SUPABASE_URL'),
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY'),
        ),
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
