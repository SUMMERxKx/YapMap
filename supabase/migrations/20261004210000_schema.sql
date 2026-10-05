-- Yap schema: tables, indexes and row-level security.
--
-- The client never writes tables directly. Every write goes through the functions in
-- 20261004210001_functions.sql, which run as the database owner and enforce the rules.
-- RLS here is deny-by-default: SELECT policies exist only where the app (or Realtime)
-- reads rows directly, and there are no INSERT/UPDATE policies at all except profiles
-- (own row) and blocks (unblock).

create extension if not exists postgis with schema extensions;

-- Internal helpers live here; this schema is never exposed through the Data API.
create schema if not exists private;

-- people ------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 30),
  last_name text not null check (char_length(last_name) between 1 and 30),
  gender text not null check (gender in ('woman', 'man', 'non-binary', 'prefer-not')),
  show_gender boolean not null default true,
  intro text not null check (char_length(intro) between 1 and 300),
  interests text[] not null check (array_length(interests, 1) between 3 and 5),
  photo_path text,                           -- storage path of the profile picture
  photo_paths text[] not null default '{}',  -- the 4-6 extra photos (storage paths)
  is_adult boolean not null,
  verified boolean not null default false,   -- set by the selfie check, never by the client
  status text not null default 'active' check (status in ('active', 'hidden', 'suspended')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per account. Other people only ever see the card built by private.person_card().';

-- Who is live right now. Rows are deleted on get-off or expiry, so the table stays tiny
-- no matter how many accounts exist, and the spatial index stays fast.
create table public.availability (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  location extensions.geography (point, 4326) not null,  -- never returned to clients
  accuracy_m double precision,
  note text not null default '' check (char_length(note) <= 60),
  state text not null default 'open' check (state in ('open', 'chatting')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index availability_location_idx on public.availability using gist (location);
create index availability_expires_idx on public.availability (expires_at);

-- say hi ------------------------------------------------------------------------------

create table public.chat_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled', 'met')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes',
  responded_at timestamptz,
  ended_at timestamptz,
  check (from_user <> to_user)
);

-- One request in flight per sender, enforced by the database, not the app.
create unique index chat_requests_one_pending_idx on public.chat_requests (from_user)
  where status = 'pending';
create index chat_requests_to_user_idx on public.chat_requests (to_user);
create index chat_requests_from_user_created_idx on public.chat_requests (from_user, created_at);
create index chat_requests_expires_idx on public.chat_requests (expires_at) where status = 'pending';

-- map events --------------------------------------------------------------------------

-- An event's location is the PLACE the host chose on the map - by design the one
-- location in the system that other people are meant to see.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references public.profiles (id) on delete cascade,
  emoji text not null default '☕' check (char_length(emoji) <= 8),
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 200),
  location extensions.geography (point, 4326) not null,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index events_location_idx on public.events using gist (location);
create index events_host_idx on public.events (host);
create index events_starts_idx on public.events (starts_at);

create table public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_members_user_idx on public.event_members (user_id);

-- messages (both kinds) ---------------------------------------------------------------

-- One table for 1:1 and event group messages: exactly one parent is set.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.chat_requests (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  sender uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  check ((request_id is null) <> (event_id is null))
);

create index messages_request_idx on public.messages (request_id, created_at);
create index messages_event_idx on public.messages (event_id, created_at);
create index messages_sender_created_idx on public.messages (sender, created_at);

-- safety ------------------------------------------------------------------------------

create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create index blocks_blocked_idx on public.blocks (blocked);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.chat_requests (id) on delete set null,
  reason text not null check (reason in
    ('inappropriate-photo', 'harassment', 'unsafe', 'spam-or-fake', 'under-18', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  action text
);

create index reports_reported_idx on public.reports (reported);
create index reports_reporter_idx on public.reports (reporter);
create index reports_request_idx on public.reports (request_id);

-- row-level security ------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.availability enable row level security;
alter table public.chat_requests enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Definer helpers for policies that need to look across tables (a policy's own
-- subqueries are themselves subject to RLS, which would deny everything here).
create or replace function private.is_chat_participant(req uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.chat_requests r
    where r.id = req and (select auth.uid()) in (r.from_user, r.to_user)
  );
$$;

create or replace function private.is_event_member(ev uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_members m
    where m.event_id = ev and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_chat_participant (uuid),
  private.is_event_member (uuid) from public, anon, authenticated;

-- profiles: you can read and edit yourself; nobody reads others directly
-- (their card comes from the functions). The columns a client may write are limited
-- by column grants below, so `verified` and `status` stay server-only.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()) and is_adult);
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- chat_requests: participants may read (this is also what lets Realtime deliver them)
create policy chat_requests_select_own on public.chat_requests
  for select to authenticated using ((select auth.uid()) in (from_user, to_user));

-- messages: readable by the chat's participants or the event's members,
-- minus anything written by someone the reader has blocked
create policy messages_select_participant on public.messages
  for select to authenticated using (
    not exists (
      select 1 from public.blocks b
      where b.blocker = (select auth.uid()) and b.blocked = sender
    )
    and (
      (request_id is not null and private.is_chat_participant(request_id))
      or (event_id is not null and private.is_event_member(event_id))
    )
  );

-- blocks: you see your own block list, and unblocking is a plain delete
create policy blocks_select_own on public.blocks
  for select to authenticated using (blocker = (select auth.uid()));
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker = (select auth.uid()));

-- availability, events, event_members, reports: no direct access at all.
-- (RLS with no policy denies everything; the functions bypass it as owner.)

-- least privilege ---------------------------------------------------------------------

-- The Data API exposes `public`, so strip the default broad grants.
revoke all on all tables in schema public from anon;
revoke insert, update, delete on
  public.availability, public.chat_requests, public.messages,
  public.events, public.event_members, public.reports, public.blocks
  from authenticated;
grant delete on public.blocks to authenticated;  -- unblock

-- Clients may write only these profile columns; `verified` and `status` are server-only.
revoke insert, update on public.profiles from authenticated;
grant insert (id, first_name, last_name, gender, show_gender, intro, interests,
              photo_path, photo_paths, is_adult)
  on public.profiles to authenticated;
grant update (first_name, last_name, gender, show_gender, intro, interests,
              photo_path, photo_paths)
  on public.profiles to authenticated;
