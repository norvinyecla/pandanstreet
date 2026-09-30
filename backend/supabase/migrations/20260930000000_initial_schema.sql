-- pandanstreet schema: replaces the Phase 1 CSV files (users, follows, tiles,
-- tile_text, tile_item). The NestJS backend is the only client and connects
-- with the service-role key, so RLS is enabled with no policies: the anon /
-- authenticated keys can't read anything (including password hashes).

create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  name text not null,
  photo_url text not null default '',
  bio text not null default '' check (char_length(bio) <= 140),
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  followee_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_id_idx on public.follows (followee_id);

-- Archiving sets `archived = true`; rows are never deleted.
create table public.tiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('text', 'item')),
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create index tiles_active_user_id_created_at_idx
  on public.tiles (user_id, created_at desc)
  where not archived;

create table public.tile_text (
  tile_id uuid primary key references public.tiles (id) on delete cascade,
  text text not null check (char_length(text) <= 140)
);

create table public.tile_item (
  tile_id uuid primary key references public.tiles (id) on delete cascade,
  photo_url text not null,
  caption text not null check (char_length(caption) <= 140),
  badge_color text not null check (badge_color in ('red', 'yellow', 'green'))
);

alter table public.users enable row level security;
alter table public.follows enable row level security;
alter table public.tiles enable row level security;
alter table public.tile_text enable row level security;
alter table public.tile_item enable row level security;

-- Creates a tile in one transaction, first archiving the author's oldest
-- active tiles so at most 3 stay active. Locking the author's row stops two
-- concurrent creates from both skipping the archive step.
create function public.create_tile(
  p_user_id uuid,
  p_type text,
  p_text text default null,
  p_photo_url text default null,
  p_caption text default null,
  p_badge_color text default null
)
returns public.tiles
language plpgsql
set search_path = ''
as $$
declare
  new_tile public.tiles;
begin
  perform 1 from public.users where id = p_user_id for update;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  update public.tiles
  set archived = true
  where id in (
    select id
    from public.tiles
    where user_id = p_user_id and not archived
    order by created_at desc
    offset 2
  );

  insert into public.tiles (user_id, type)
  values (p_user_id, p_type)
  returning * into new_tile;

  if p_type = 'text' then
    insert into public.tile_text (tile_id, text)
    values (new_tile.id, p_text);
  else
    insert into public.tile_item (tile_id, photo_url, caption, badge_color)
    values (new_tile.id, p_photo_url, p_caption, p_badge_color);
  end if;

  return new_tile;
end;
$$;

-- Sets a user's photo and returns the path it replaced ('' if none), or null
-- for an unknown user. Reading and writing under one row lock means a
-- replaced file is never missed by two concurrent uploads.
create function public.set_user_photo(p_user_id uuid, p_photo_url text)
returns text
language sql
set search_path = ''
as $$
  update public.users as u
  set photo_url = p_photo_url
  from (
    select id, photo_url
    from public.users
    where id = p_user_id
    for update
  ) as previous
  where u.id = previous.id
  returning previous.photo_url;
$$;

revoke execute on function public.create_tile from public, anon, authenticated;
revoke execute on function public.set_user_photo from public, anon, authenticated;
grant execute on function public.create_tile to service_role;
grant execute on function public.set_user_photo to service_role;
