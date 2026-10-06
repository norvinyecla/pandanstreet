-- Login sessions for express-session, so they survive a backend restart.
-- Only the backend reads this table (service-role key), so RLS is enabled
-- with no policies, like the other tables.

create table public.sessions (
  sid text primary key,
  sess jsonb not null,
  expires_at timestamptz not null
);

create index sessions_expires_at_idx on public.sessions (expires_at);

alter table public.sessions enable row level security;
