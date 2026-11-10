-- Safety fixes from the October 2026 QA report. The app changes that use them ship together.
--
--   * Nearby (D1): live positions are stored only as the centre of a cell of about 100 m, and
--     "nearby" means the same cell or one touching it, with a fixed distance. The GPS accuracy
--     the app sends no longer changes anything (it is kept between 0 and 50 m), so nobody can
--     resize their own circle to measure how far away someone is. nearby() takes at most 12
--     calls a minute per person, and location changes are counted one call at a time.
--   * Reports (D2): a report only counts towards the automatic hide when the two people have
--     really interacted (a chat between them, even one that has ended, a say-hi from the
--     reported person, or a message they posted in a group chat both are in), or when it comes
--     from an established account (at least 3 days old, active, with no open report against
--     it). Only reports not yet reviewed count. Every report still lands in the review queue.
--   * Restricted accounts (D3, D9): the automatic hide now ends what the person is in, as
--     suspend_user does (live session, waiting requests, chats, event memberships). Saying hi,
--     sending chat and group messages and changing your note need an active account, and a
--     hidden or suspended person is told 'account restricted' instead of 'profile not ready'.
--   * Coming back after a ban (D4): a private list of banned email addresses (as hashes of
--     the normalised address), checked by the Before User Created auth hook
--     (public.before_user_created), which also refuses throwaway email domains and more than
--     20 new accounts a day from one IP address. Suspending someone puts their email on the
--     list, and so does deleting an account while it is hidden or suspended. Reports are kept
--     when either person deletes their account, with a hash of the reported id.
--   * Events (D5, D6): the map lists events around the position the server holds for you
--     (the newest one set_map_position or go_green stored), not any point the app sends, at
--     most 20 times a minute; joining an event checks that same position. That last known
--     position is kept, so a new one far from it is refused ('location jumped') unless it could
--     have been reached since (5 km plus 1000 km/h), even after going offline. A host's photo
--     is shown only to people who joined their event.
--   * Photos (D7): at most 1.5 MB a file, 16 files in your folder and 40 uploads a day.
--   * Event categories (D10): events.emoji must be one of the app's categories.
--
-- Functions whose arguments change (events_near, join_event) are dropped and created again,
-- then given the same grants as before: executable by `authenticated`, not by `anon` or
-- `public`. `create or replace` keeps the existing grants of every other function changed here.
--
-- Applying this to the hosted project: events whose emoji isn't one of the categories are set
-- to the default (☕) before the new rule is added, and live positions are moved to the centre
-- of their cell. The Before User Created hook has to be switched on in the dashboard once
-- (Authentication -> Hooks, Postgres function public.before_user_created); supabase/config.toml
-- only switches it on for the local stack.

-- helpers -----------------------------------------------------------------------------

-- The centre of the cell of about 100 x 100 m that a point is in. Rows are 100 m of latitude
-- tall; each row is cut into cells 100 m wide at its own middle latitude. The centre depends
-- only on the point itself, so comparing two centres can never tell more than which cells two
-- people are in, however often someone asks.
create function private.cell_center(lat double precision, lng double precision)
returns extensions.geography
language sql immutable set search_path = ''
as $$
  -- 1113.2 cells per degree of latitude: about 111,320 m per degree, 100 m per cell
  with cell_row as (
    select (floor(lat * 1113.2) + 0.5) / 1113.2 as row_lat
  ), cell_width as (
    select row_lat, 1113.2 * greatest(cos(radians(row_lat)), 0.01) as cells_per_degree
    from cell_row
  )
  select extensions.st_setsrid(
    extensions.st_makepoint(
      least(180, greatest(-180, (floor(lng * cells_per_degree) + 0.5) / cells_per_degree)),
      least(90, greatest(-90, row_lat))
    ),
    4326
  )::extensions.geography
  from cell_width;
$$;

revoke execute on function private.cell_center (double precision, double precision)
from public, anon, authenticated;

-- Refuses the call unless `uid` is signed in with a finished profile and an active account.
-- 'account restricted' means the account is hidden (after reports) or suspended.
create function private.require_active(uid uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
declare
  who public.profiles;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into who from public.profiles where id = uid;
  if not found or not who.is_adult then raise exception 'profile not ready'; end if;
  if who.status <> 'active' then raise exception 'account restricted'; end if;
end;
$$;

revoke execute on function private.require_active (uuid) from public, anon, authenticated;

-- How many times each person called a looked-up list (nearby, events_near) in the current
-- window. One row per person and list, so it stays small; rows from old windows are removed
-- by the cron job.
create table private.call_counts (
  user_id uuid not null references auth.users (id) on delete cascade,
  fn text not null,
  window_start timestamptz not null,
  calls integer not null,
  primary key (user_id, fn)
);

-- Only the functions use it (as the owner). RLS with no policy denies everyone else.
alter table private.call_counts enable row level security;
revoke all on private.call_counts from public, anon, authenticated;

-- Counts a call to `list_name` and refuses it ('too many lookups') past `max_calls` in a window of
-- `per`. The row lock taken by the upsert makes calls sent at the same moment count one after
-- another, so the limit is exact. A refused call rolls back and isn't counted.
create function private.count_call(uid uuid, list_name text, max_calls integer, per interval)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  this_window timestamptz := date_bin(per, now(), timestamptz '2000-01-01 00:00:00+00');
  so_far integer;
begin
  insert into private.call_counts as c (user_id, fn, window_start, calls)
  values (uid, list_name, this_window, 1)
  on conflict (user_id, fn) do update
    set calls = case when c.window_start = excluded.window_start then c.calls + 1 else 1 end,
        window_start = excluded.window_start
  returning c.calls into so_far;
  if so_far > max_calls then raise exception 'too many lookups'; end if;
end;
$$;

revoke execute on function private.count_call (uuid, text, integer, interval)
from public, anon, authenticated;

-- nearby (D1) -------------------------------------------------------------------------

-- Live positions become the centre of their cell; the accuracy no longer does anything.
update public.availability
set location = private.cell_center(
      extensions.st_y(location::extensions.geometry),
      extensions.st_x(location::extensions.geometry)
    ),
    accuracy_m = greatest(0, least(coalesce(accuracy_m, 0), 50));

-- "Near" means the same cell of about 100 m or one touching it: the two cell centres are at
-- most 150 m apart. Every live position is a cell centre (go_green), and the distance is the
-- same for everyone, so it never depends on anything the caller sends.
create or replace function private.near_each_other(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.availability av_a
    join public.availability av_b on av_b.user_id = b
    where av_a.user_id = a
      and av_a.expires_at > now()
      and av_b.expires_at > now()
      and extensions.st_dwithin(av_a.location, av_b.location, 150)
  );
$$;

-- People who are live near the caller (the same cells as near_each_other): cards only, never
-- positions or distances. At most 12 calls a minute (the app asks every 20 seconds).
create or replace function public.nearby()
returns setof jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;
  perform private.count_call(uid, 'nearby', 12, interval '1 minute');

  return query
    with me as (
      select user_id, location
      from public.availability
      where user_id = uid and expires_at > now()
    )
    select private.person_card(a.user_id)
    from public.availability a
    join public.profiles p on p.id = a.user_id
    cross join me
    where a.user_id <> me.user_id
      and a.state = 'open'
      and a.expires_at > now()
      and p.status = 'active'
      and extensions.st_dwithin(a.location, me.location, 150)
      and not private.blocked_between(me.user_id, a.user_id)
    limit 50;
end;
$$;

-- events: where you are -----------------------------------------------------------------

-- The last position the server holds for each person, set by set_map_position and go_green
-- from the phone's position. Like a live position it is only the centre of a cell of about
-- 100 m. The map lists events around it and joining checks it for 2 hours after it was set; it
-- is kept after that (until a newer one replaces it), so a new position can always be checked
-- against it.
create table private.last_positions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  location extensions.geography (point, 4326) not null,
  set_at timestamptz not null default now()
);

-- Only the functions use it (as the owner). RLS with no policy denies everyone else.
alter table private.last_positions enable row level security;
revoke all on private.last_positions from public, anon, authenticated;

-- Where the server holds `uid` to be: the last position set_map_position or go_green stored, if
-- it was set in the last 2 hours (a live session never runs longer than that since its last
-- go_green). Null otherwise.
create function private.my_position(uid uuid)
returns extensions.geography
language sql stable security definer set search_path = ''
as $$
  select p.location from private.last_positions p
  where p.user_id = uid and p.set_at > now() - interval '2 hours';
$$;

revoke execute on function private.my_position (uuid) from public, anon, authenticated;

-- Sets the position the map uses. A move of 150 m or less from the last known position is GPS
-- wobble: the position stays and is only renewed. A bigger move must be one you could have made
-- since the last known position was set, however long ago: at most 5 km plus 1000 km/h, which
-- allows a commute or a flight but not hopping between cities ('location jumped'). It is a
-- location change, at most 3 in 10 minutes (shared with go_green); moving to where your live
-- session already is doesn't count again.
create function public.set_map_position(lat double precision, lng double precision)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  here extensions.geography;
  previous private.last_positions;
  moved_m double precision;
begin
  perform private.require_active(uid);
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then
    raise exception 'invalid location';
  end if;
  here := extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;

  -- one call at a time per person, so parallel calls can't all pass the limit below
  perform pg_advisory_xact_lock(hashtextextended('yap:location:' || uid::text, 0));

  select * into previous from private.last_positions where user_id = uid;
  if found then
    moved_m := extensions.st_distance(previous.location, here);
    -- GPS wobble: stay where you were
    if moved_m <= 150 then
      update private.last_positions set set_at = now() where user_id = uid;
      return;
    end if;
    -- 1000 km/h is 1000000 m per 3600 s, counted from when the last position was set
    if moved_m > 5000 + 1000000.0 / 3600 * extract(epoch from now() - previous.set_at) then
      raise exception 'location jumped';
    end if;
  end if;

  if not exists (
    select 1 from public.availability a
    where a.user_id = uid and a.expires_at > now() and extensions.st_dwithin(a.location, here, 150)
  ) then
    if (
      select count(*) from private.location_changes
      where user_id = uid and changed_at > now() - interval '10 minutes'
    ) >= 3 then
      raise exception 'too many location changes';
    end if;
    insert into private.location_changes (user_id) values (uid);
  end if;

  insert into private.last_positions (user_id, location, set_at)
  values (uid, private.cell_center(lat, lng), now())
  on conflict (user_id) do update set
    location = excluded.location,
    set_at = excluded.set_at;
end;
$$;

revoke execute on function public.set_map_position (double precision, double precision) from public, anon;
grant execute on function public.set_map_position (double precision, double precision) to authenticated;

-- going live --------------------------------------------------------------------------

-- As before (20261022024832_server_rules.sql), plus: the stored position is the centre of its
-- cell, the accuracy is kept between 0 and 50 m and changes nothing, a hidden or suspended
-- account is told 'account restricted', and calls are counted one at a time. Going live when
-- you aren't must be a move set_map_position would allow from your last known position
-- ('location jumped'), and going live where that position already is doesn't count as another
-- location change. The live position becomes your last known position.
create or replace function public.go_green(
  lat double precision,
  lng double precision,
  accuracy double precision,
  minutes integer,
  note text default ''
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  here extensions.geography;
  live_at extensions.geography;  -- the position to store
  previous public.availability;
  last_known private.last_positions;
  moved_m double precision;  -- how far from your live position; null when you're not live
  allowed_m double precision;
  set_at timestamptz := now();  -- when the stored live position was set
  new_state text := 'open';
  saved public.availability;
begin
  perform private.require_active(uid);
  if minutes is null or minutes not in (30, 60, 120) then raise exception 'invalid duration'; end if;
  if char_length(coalesce(note, '')) > 60 then raise exception 'note too long'; end if;
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then
    raise exception 'invalid location';
  end if;

  here := extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;
  live_at := private.cell_center(lat, lng);

  -- one call at a time per person, so parallel calls can't all pass the limit below
  perform pg_advisory_xact_lock(hashtextextended('yap:location:' || uid::text, 0));

  -- a session that has run out (the cron job just hasn't removed it yet) isn't a live position
  select * into previous from public.availability where user_id = uid;
  if found and previous.expires_at > now() then
    moved_m := extensions.st_distance(previous.location, here);
  end if;

  if moved_m is not null and moved_m <= 150 then
    -- GPS wobble: stay where you were
    live_at := previous.location;
    set_at := previous.started_at;
  else
    if moved_m is not null then
      -- 10 km/h is 10000 m per 3600 s, counted from when your live position was set
      allowed_m := 150 + 10000.0 / 3600 * extract(epoch from now() - previous.started_at);
      if moved_m > allowed_m then raise exception 'moving too fast'; end if;
    else
      -- not live: 5 km plus 1000 km/h from the last known position, as in set_map_position
      select * into last_known from private.last_positions where user_id = uid;
      if found and extensions.st_distance(last_known.location, here)
        > 5000 + 1000000.0 / 3600 * extract(epoch from now() - last_known.set_at)
      then
        raise exception 'location jumped';
      end if;
    end if;
    if not exists (
      select 1 from private.last_positions m
      where m.user_id = uid and m.set_at > now() - interval '2 hours'
        and extensions.st_dwithin(m.location, here, 150)
    ) then
      if (
        select count(*) from private.location_changes
        where user_id = uid and changed_at > now() - interval '10 minutes'
      ) >= 3 then
        raise exception 'too many location changes';
      end if;
      insert into private.location_changes (user_id) values (uid);
    end if;
  end if;

  -- Someone still in a chat stays off the nearby lists.
  if exists (
    select 1 from public.chat_requests
    where status = 'accepted' and uid in (from_user, to_user)
  ) then
    new_state := 'chatting';
  end if;

  insert into public.availability (user_id, location, accuracy_m, note, state, started_at, expires_at)
  values (
    uid,
    live_at,
    greatest(0, least(coalesce(accuracy, 0), 50)),
    coalesce(note, ''),
    new_state,
    set_at,
    now() + make_interval(mins => minutes)
  )
  on conflict (user_id) do update set
    location = excluded.location,
    accuracy_m = excluded.accuracy_m,
    note = excluded.note,
    state = excluded.state,
    started_at = excluded.started_at,
    expires_at = excluded.expires_at
  returning * into saved;

  insert into private.last_positions (user_id, location, set_at)
  values (uid, live_at, now())
  on conflict (user_id) do update set
    location = excluded.location,
    set_at = excluded.set_at;

  return jsonb_build_object(
    'startedAt', (extract(epoch from saved.started_at) * 1000)::bigint,
    'expiresAt', (extract(epoch from saved.expires_at) * 1000)::bigint
  );
end;
$$;

-- As before, plus: a hidden or suspended account can't change its note.
create or replace function public.update_note(note text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_active((select auth.uid()));
  if char_length(coalesce(note, '')) > 60 then raise exception 'note too long'; end if;
  update public.availability
  set note = coalesce(update_note.note, '')
  where user_id = (select auth.uid());
end;
$$;

-- say hi and messages (D3) ------------------------------------------------------------

-- As before (20261022103744_break_it_hardening.sql), plus: the sender's account must be active.
create or replace function public.send_request(target uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
begin
  perform private.require_active(uid);
  if target = uid then raise exception 'cannot request yourself'; end if;
  if private.blocked_between(uid, target) then raise exception 'not available'; end if;
  if not exists (
    select 1 from public.profiles where id = target and status = 'active'
  ) then raise exception 'not available'; end if;

  -- already waiting on this person: the same request, not a second one
  select * into req
  from public.chat_requests
  where from_user = uid and to_user = target and status = 'pending' and expires_at > now();
  if found then
    return jsonb_build_object(
      'id', req.id,
      'expiresAt', (extract(epoch from req.expires_at) * 1000)::bigint
    );
  end if;

  -- one chat at a time: finish the one you're in before saying hi to someone else
  if exists (
    select 1 from public.chat_requests
    where status = 'accepted' and uid in (from_user, to_user)
  ) or exists (
    select 1 from public.availability where user_id = uid and state = 'chatting'
  ) then
    raise exception 'already chatting';
  end if;
  -- both must be live, open, and actually near each other
  if not exists (
    select 1 from public.availability where user_id = target and state = 'open' and expires_at > now()
  ) or not private.near_each_other(uid, target) then
    raise exception 'not nearby';
  end if;
  -- rate limit: at most 5 requests per 10 minutes
  if (
    select count(*) from public.chat_requests
    where from_user = uid and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'too many requests';
  end if;

  -- A request whose 5 minutes are up may not be marked expired yet (the cron job runs once a
  -- minute), so do that now: it shouldn't count as the one request you can have waiting.
  update public.chat_requests set status = 'expired'
  where from_user = uid and status = 'pending' and expires_at <= now();
  if exists (
    select 1 from public.chat_requests where from_user = uid and status = 'pending'
  ) then
    raise exception 'already waiting';
  end if;

  -- the partial unique index also stops a second pending request at the database level
  insert into public.chat_requests (from_user, to_user)
  values (uid, target)
  returning * into req;

  return jsonb_build_object(
    'id', req.id,
    'expiresAt', (extract(epoch from req.expires_at) * 1000)::bigint
  );
end;
$$;

-- As before (20261022024832_server_rules.sql), plus: the sender's account must be active.
create or replace function public.send_chat_message(request_id uuid, body text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
  saved public.messages;
begin
  perform private.require_active(uid);
  if char_length(coalesce(body, '')) not between 1 and 1000 then
    raise exception 'invalid message';
  end if;
  select * into req
  from public.chat_requests
  where id = request_id and uid in (from_user, to_user) and status = 'accepted';
  if not found then raise exception 'no such chat'; end if;
  if private.blocked_between(req.from_user, req.to_user) then
    raise exception 'not available';
  end if;
  -- rate limit: at most 30 messages a minute per sender
  if (
    select count(*) from public.messages
    where sender = uid and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'too many messages';
  end if;

  insert into public.messages (request_id, sender, sender_name, body)
  values (
    req.id,
    uid,
    (select p.first_name || ' ' || upper(left(p.last_name, 1)) || '.' from public.profiles p where p.id = uid),
    body
  )
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

-- As before (20261022024832_server_rules.sql), plus: the sender's account must be active.
create or replace function public.send_event_message(event_id uuid, body text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  saved public.messages;
begin
  perform private.require_active(uid);
  if char_length(coalesce(body, '')) not between 1 and 1000 then
    raise exception 'invalid message';
  end if;
  if not exists (
    select 1 from public.event_members m where m.event_id = send_event_message.event_id and m.user_id = uid
  ) then raise exception 'not a member'; end if;
  if (
    select count(*) from public.messages
    where sender = uid and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'too many messages';
  end if;

  insert into public.messages (event_id, sender, sender_name, body)
  values (
    send_event_message.event_id,
    uid,
    (select p.first_name || ' ' || upper(left(p.last_name, 1)) || '.' from public.profiles p where p.id = uid),
    body
  )
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

-- ban list (D4) -----------------------------------------------------------------------

-- An email address as the ban list compares it: lowercase, without a +tag, and for Gmail
-- without dots (Gmail ignores both, so they are the same inbox).
create function private.normalised_email(email text)
returns text
language sql immutable set search_path = ''
as $$
  with address as (
    select
      split_part(regexp_replace(lower(trim(email)), '@[^@]*$', ''), '+', 1) as local_part,
      substring(lower(trim(email)) from '@([^@]*)$') as domain
  )
  select case
    when domain in ('gmail.com', 'googlemail.com') then replace(local_part, '.', '') || '@gmail.com'
    else local_part || '@' || domain
  end
  from address;
$$;

-- A SHA-256 of the normalised address, so the ban list holds no readable addresses.
create function private.email_hash(email text)
returns text
language sql immutable set search_path = ''
as $$
  select encode(sha256(convert_to(private.normalised_email(email), 'UTF8')), 'hex');
$$;

revoke execute on function private.normalised_email (text), private.email_hash (text)
from public, anon, authenticated;

-- Email addresses that can't make a new account: suspended people, and anyone who deleted
-- their account while it was hidden or suspended. The owner can add or remove rows by hand
-- (docs/legal/moderation.md); private.restore_user removes a person's row.
create table private.banned_identities (
  email_hash text primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

comment on table private.banned_identities is
  'Hashes (private.email_hash) of email addresses refused at sign-up by public.before_user_created.';

alter table private.banned_identities enable row level security;
revoke all on private.banned_identities from public, anon, authenticated;

-- Throwaway email domains, from the public-domain (CC0) list at
-- https://github.com/disposable-email-domains/disposable-email-domains. Loaded by the next
-- migration; the owner can add or remove rows without a migration.
create table private.disposable_email_domains (
  domain text primary key check (domain ~ '^[a-z0-9.-]+$')
);

alter table private.disposable_email_domains enable row level security;
revoke all on private.disposable_email_domains from public, anon, authenticated;

-- When each sign-up was let through, by a hash of its IP address, for the 20-a-day limit.
-- Rows older than a day are removed by the cron job.
create table private.signup_ips (
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index signup_ips_hash_idx on private.signup_ips (ip_hash, created_at);

alter table private.signup_ips enable row level security;
revoke all on private.signup_ips from public, anon, authenticated;

-- Puts `target`'s email address on the ban list.
create function private.ban_email_of(target uuid, reason text)
returns void
language sql security definer set search_path = ''
as $$
  insert into private.banned_identities (email_hash, reason)
  select private.email_hash(u.email), ban_email_of.reason
  from auth.users u
  where u.id = target and coalesce(u.email, '') <> ''
  on conflict (email_hash) do nothing;
$$;

revoke execute on function private.ban_email_of (uuid, text) from public, anon, authenticated;

-- The Before User Created auth hook: Supabase Auth calls it before it creates any account and
-- shows the message to the person when it refuses. It refuses an email on the ban list, an
-- address at a throwaway domain (or a subdomain of one), and a 21st new account in a day from
-- the same IP address (generous, since a campus network puts many students behind one).
-- https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
create function public.before_user_created(event jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  email text := lower(trim(event -> 'user' ->> 'email'));
  domain_parts text[] := string_to_array(substring(email from '@([^@]*)$'), '.');
  ip text := event -> 'metadata' ->> 'ip_address';
  address_hash text;
begin
  if coalesce(email, '') <> '' then
    if exists (
      select 1 from private.banned_identities b where b.email_hash = private.email_hash(email)
    ) then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 403,
        'message', 'This email address can''t be used for Yap. If you think that''s a mistake, email support@samarxkx.dev.'
      ));
    end if;
    -- the domain and every domain it is part of: mail.example.com, example.com, com
    if exists (
      select 1
      from generate_subscripts(domain_parts, 1) as i
      join private.disposable_email_domains d
        on d.domain = array_to_string(domain_parts[i:], '.')
    ) then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 403,
        'message', 'Use an email address you''ll keep. Temporary email addresses can''t be used for Yap.'
      ));
    end if;
  end if;

  if coalesce(ip, '') <> '' then
    address_hash := encode(sha256(convert_to(ip, 'UTF8')), 'hex');
    -- one sign-up at a time per address, so parallel ones can't all pass the limit
    perform pg_advisory_xact_lock(hashtextextended('yap:signup:' || address_hash, 0));
    if (
      select count(*) from private.signup_ips s
      where s.ip_hash = address_hash and s.created_at > now() - interval '24 hours'
    ) >= 20 then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 429,
        'message', 'Too many accounts were made from this network today. Try again tomorrow.'
      ));
    end if;
    insert into private.signup_ips (ip_hash) values (address_hash);
  end if;

  return '{}'::jsonb;
end;
$$;

-- Only Supabase Auth calls it.
revoke execute on function public.before_user_created (jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created (jsonb) to supabase_auth_admin;

-- reports are kept (D4) ---------------------------------------------------------------

-- A report stays when either person deletes their account: the person's id becomes null, and
-- reported_hash (a SHA-256 of the reported id) still ties together every report about them.
alter table public.reports
  alter column reporter drop not null,
  alter column reported drop not null,
  drop constraint reports_reporter_fkey,
  drop constraint reports_reported_fkey,
  add constraint reports_reporter_fkey
    foreign key (reporter) references public.profiles (id) on delete set null,
  add constraint reports_reported_fkey
    foreign key (reported) references public.profiles (id) on delete set null,
  add column reported_hash text,
  -- whether the report counts towards the automatic hide (see report_user)
  add column counts_toward_hide boolean not null default false;

update public.reports set reported_hash = encode(sha256(convert_to(reported::text, 'UTF8')), 'hex');

alter table public.reports alter column reported_hash set not null;

create function private.set_reported_hash()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.reported_hash := encode(sha256(convert_to(new.reported::text, 'UTF8')), 'hex');
  return new;
end;
$$;

revoke execute on function private.set_reported_hash () from public, anon, authenticated;

create trigger reports_reported_hash
  before insert on public.reports
  for each row execute function private.set_reported_hash();

-- automatic hide (D2, D3) -------------------------------------------------------------

-- Ends everything `target` is in right now: their live session, waiting requests and chats
-- (the other person goes back on nearby lists, as when a chat ends), and their event
-- memberships, so they can't post in group chats either. Their last known position stays, so
-- coming back after a review can't skip the check against it.
create function private.end_activity(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.availability a set state = 'open'
  from public.chat_requests r
  where r.status = 'accepted' and target in (r.from_user, r.to_user)
    and a.user_id = case when r.from_user = target then r.to_user else r.from_user end
    and a.state = 'chatting';
  update public.chat_requests set status = 'cancelled', ended_at = now()
  where status in ('pending', 'accepted') and target in (from_user, to_user);

  delete from public.availability where user_id = target;
  delete from public.event_members where user_id = target;
end;
$$;

revoke execute on function private.end_activity (uuid) from public, anon, authenticated;

-- As before (20261022103744_break_it_hardening.sql), plus: a report counts towards the
-- automatic hide only when the reporter's account is active and either
--   * the two of you really interacted: a chat between you (accepted or met, or accepted and
--     then ended), a say-hi they sent you, or a message they posted in a group chat you are
--     both in, or
--   * the reporter's account is established: at least 3 days old with no open report against it.
-- A say-hi you sent that they never accepted, or only being in the same event, isn't enough.
-- Other reports go to the review queue without hiding anyone. When three different people's
-- counted reports that nobody has reviewed yet hide someone, everything they are in ends, as
-- with suspend_user.
create or replace function public.report_user(
  target uuid,
  reason text,
  details text default '',
  request_id uuid default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  linked_request uuid;
  counts boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if target = uid then raise exception 'cannot report yourself'; end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'not available';
  end if;
  if reason is null or reason not in
    ('inappropriate-photo', 'harassment', 'unsafe', 'spam-or-fake', 'under-18', 'other')
  then
    raise exception 'invalid reason';
  end if;
  details := coalesce(details, '');
  if char_length(details) > 500 or not private.is_clean_text(details, true) then
    raise exception 'invalid details';
  end if;

  -- one call at a time per reporter, so parallel calls can't all pass the checks below
  perform pg_advisory_xact_lock(hashtextextended('yap:report_user:' || uid::text, 0));
  -- already reported them today: that report stands
  if exists (
    select 1 from public.reports r
    where r.reporter = uid and r.reported = target and r.created_at > now() - interval '24 hours'
  ) then
    return;
  end if;
  -- rate limit: at most 10 people reported a day
  if (
    select count(*) from public.reports r
    where r.reporter = uid and r.created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'too many reports';
  end if;

  -- null unless the request is one between the two of you
  select r.id into linked_request
  from public.chat_requests r
  where r.id = report_user.request_id
    and ((r.from_user = uid and r.to_user = target) or (r.from_user = target and r.to_user = uid));

  counts := exists (
    select 1 from public.profiles p where p.id = uid and p.status = 'active'
  ) and (
    exists (
      select 1 from public.chat_requests r
      where (r.from_user = target and r.to_user = uid)
        or (
          r.from_user = uid and r.to_user = target
          and (r.status in ('accepted', 'met') or (r.status = 'cancelled' and r.responded_at is not null))
        )
    )
    or exists (
      select 1
      from public.messages m
      join public.event_members mine on mine.event_id = m.event_id and mine.user_id = uid
      join public.event_members theirs on theirs.event_id = m.event_id and theirs.user_id = target
      where m.sender = target
    )
    or (
      exists (
        select 1 from public.profiles p
        where p.id = uid and p.created_at <= now() - interval '3 days'
      )
      and not exists (
        select 1 from public.reports r where r.reported = uid and r.reviewed_at is null
      )
    )
  );

  insert into public.reports (reporter, reported, request_id, reason, details, counts_toward_hide)
  values (uid, target, linked_request, reason, details, counts);

  -- one hide check at a time per reported person, so three reports at once still hide them
  perform pg_advisory_xact_lock(hashtextextended('yap:reported:' || target::text, 0));
  -- three different reporters whose reports count, and aren't reviewed yet, hide the profile
  -- until a human reviews it
  update public.profiles
  set status = 'hidden'
  where id = target
    and status = 'active'
    and (
      select count(distinct r.reporter) from public.reports r
      where r.reported = target and r.counts_toward_hide and r.reviewed_at is null
    ) >= 3;
  if found then
    perform private.end_activity(target);
  end if;
end;
$$;

-- moderation --------------------------------------------------------------------------

-- As before (20261022100308_content_moderation.sql), plus: the person's email address goes on
-- the ban list, so deleting the account and signing up again with it is refused.
create or replace function private.suspend_user(target uuid, note text default 'suspended')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'no such profile';
  end if;

  update public.profiles set status = 'suspended' where id = target;
  perform private.end_activity(target);
  perform private.ban_email_of(target, 'suspended: ' || note);

  update public.reports set reviewed_at = now(), action = note
  where reported = target and reviewed_at is null;
end;
$$;

-- Undoes a suspension or an automatic hide after review: the account is active again, it is a
-- member of the events it still hosts again (end_activity took it out of them), its email
-- address comes off the ban list, and its open reports are marked reviewed, so they don't hide
-- it again. Run it from the SQL editor.
create function private.restore_user(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'no such profile';
  end if;

  update public.profiles set status = 'active' where id = target;
  insert into public.event_members (event_id, user_id)
  select e.id, target from public.events e where e.host = target
  on conflict do nothing;
  update public.reports set reviewed_at = now(), action = 'restored'
  where reported = target and reviewed_at is null;
  delete from private.banned_identities b
  using auth.users u
  where u.id = target and b.email_hash = private.email_hash(u.email);
end;
$$;

revoke execute on function private.restore_user (uuid) from public, anon, authenticated;

-- As before (20261022024832_server_rules.sql), plus: deleting an account while it is hidden or
-- suspended puts its email address on the ban list, so it can't come straight back.
-- Reports about the person are kept (reported becomes null).
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  restricted_as text;
begin
  if uid is null then raise exception 'not signed in'; end if;

  select status into restricted_as from public.profiles where id = uid and status <> 'active';
  if restricted_as is not null then
    perform private.ban_email_of(uid, 'deleted while ' || restricted_as);
  end if;

  update public.availability a set state = 'open'
  from public.chat_requests r
  where r.status = 'accepted' and uid in (r.from_user, r.to_user)
    and a.user_id = case when r.from_user = uid then r.to_user else r.from_user end
    and a.state = 'chatting';

  delete from auth.users where id = uid;
end;
$$;

-- map events (D5, D6, D10) ------------------------------------------------------------

-- Only the app's categories (EVENT_CATEGORIES in src/data/constants.ts). Anything else already
-- saved becomes the default.
update public.events
set emoji = '☕'
where emoji not in ('☕', '🍕', '🎲', '📚', '💻', '🏀', '🎸', '🚶', '🧘', '🎬', '🎨', '🍻');

alter table public.events
  add constraint events_emoji_category
    check (emoji in ('☕', '🍕', '🎲', '📚', '💻', '🏀', '🎸', '🚶', '🧘', '🎬', '🎨', '🍻'));

-- As before (20261005065920_functions.sql), plus: the host's photo only for the host and the
-- people who joined.
create or replace function private.event_card(ev uuid, viewer uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'emoji', e.emoji,
    'title', e.title,
    'description', e.description,
    'latitude', extensions.st_y(e.location::extensions.geometry),
    'longitude', extensions.st_x(e.location::extensions.geometry),
    'startsAt', (extract(epoch from e.starts_at) * 1000)::bigint,
    'host', jsonb_build_object(
      'id', h.id,
      'firstName', h.first_name,
      'lastInitial', upper(left(h.last_name, 1)),
      'photoPath', case when joined.yes then h.photo_path end
    ),
    'memberCount', (select count(*) from public.event_members m where m.event_id = e.id),
    'joined', joined.yes
  )
  from public.events e
  join public.profiles h on h.id = e.host
  cross join lateral (
    select exists (
      select 1 from public.event_members m where m.event_id = e.id and m.user_id = viewer
    ) as yes
  ) as joined
  where e.id = ev;
$$;

drop function public.events_near (double precision, double precision, double precision);

-- Events within `radius_m` (default 10 km, never more than 50 km) of where the server holds you
-- to be (private.my_position: the last position set_map_position or go_green stored). At most
-- 20 calls a minute. 'location needed' when the server has no position for you.
create function public.events_near(radius_m double precision default 10000)
returns setof jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  here extensions.geography;
begin
  if uid is null then raise exception 'not signed in'; end if;
  perform private.count_call(uid, 'events_near', 20, interval '1 minute');
  here := private.my_position(uid);
  if here is null then raise exception 'location needed'; end if;

  return query
    select private.event_card(e.id, uid)
    from public.events e
    join public.profiles h on h.id = e.host
    where extensions.st_dwithin(e.location, here, least(coalesce(radius_m, 10000), 50000))
      and e.starts_at > now() - interval '3 hours'   -- recently started events still show
      and h.status = 'active'
      and not private.blocked_between(uid, e.host)
    order by e.starts_at
    limit 50;
end;
$$;

revoke execute on function public.events_near (double precision) from public, anon;
grant execute on function public.events_near (double precision) to authenticated;

drop function public.join_event (uuid, double precision, double precision);

-- Joining an event, and with it reading its group chat, takes being within about 5 km of it,
-- measured from where the server holds you to be (private.my_position), never from
-- coordinates the app sends with the call.
create function public.join_event(event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ev public.events;
  here extensions.geography;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into ev from public.events e where e.id = join_event.event_id;
  if not found then raise exception 'no such event'; end if;
  if private.blocked_between(uid, ev.host) then raise exception 'not available'; end if;
  perform private.require_active(uid);
  here := private.my_position(uid);
  if here is null then raise exception 'location needed'; end if;
  if not extensions.st_dwithin(ev.location, here, 5000) then
    raise exception 'too far away';
  end if;

  insert into public.event_members (event_id, user_id) values (ev.id, uid)
  on conflict do nothing;
end;
$$;

revoke execute on function public.join_event (uuid) from public, anon;
grant execute on function public.join_event (uuid) to authenticated;

-- As before (20261022103744_break_it_hardening.sql), plus: a hidden or suspended account is
-- told 'account restricted'. The category is checked by events_emoji_category.
create or replace function public.create_event(
  emoji text,
  title text,
  description text,
  lat double precision,
  lng double precision,
  starts_at_ms bigint
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  ev uuid;
begin
  perform private.require_active(uid);
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then
    raise exception 'invalid location';
  end if;
  if title is null or char_length(title) not between 1 and 60
    or not private.has_visible_text(title) or not private.is_clean_text(title, false)
  then
    raise exception 'invalid title';
  end if;
  if char_length(coalesce(description, '')) > 200
    or not private.is_clean_text(coalesce(description, ''), true)
  then
    raise exception 'invalid details';
  end if;
  -- from 5 minutes ago (a slow network) up to 7 days ahead
  if starts_at_ms is null
    or starts_at_ms < now_ms - 5 * 60 * 1000
    or starts_at_ms > now_ms + 7 * 24 * 60 * 60 * 1000
  then
    raise exception 'invalid start time';
  end if;
  -- one call at a time per host, so parallel calls can't all pass the limit below
  perform pg_advisory_xact_lock(hashtextextended('yap:create_event:' || uid::text, 0));
  -- rate limit: at most 5 events a day per host, deleted ones included
  if (
    select count(*) from private.event_posts
    where user_id = uid and posted_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'too many events';
  end if;

  insert into public.events (host, emoji, title, description, location, starts_at)
  values (
    uid,
    coalesce(nullif(emoji, ''), '☕'),
    title,
    coalesce(description, ''),
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
    to_timestamp(starts_at_ms / 1000.0)
  )
  returning id into ev;

  insert into public.event_members (event_id, user_id) values (ev, uid);
  insert into private.event_posts (user_id) values (uid);
  return private.event_card(ev, uid);
end;
$$;

-- photos (D5, D7) ---------------------------------------------------------------------

-- As before (20261022024832_server_rules.sql), except the last case: a host's profile picture
-- is shown only to people who joined one of their events on the map, not to everyone.
create or replace function private.can_see_photo(object_name text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  viewer uuid := (select auth.uid());
  folder text := (storage.foldername(object_name))[1];
  owner public.profiles;
  is_picture boolean;  -- the profile picture or its small copy
begin
  if viewer is null or folder is null or folder !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  select * into owner from public.profiles where id = folder::uuid;
  if not found then return false; end if;
  if owner.id = viewer then return true; end if;

  is_picture := coalesce(
    object_name in (owner.photo_path, regexp_replace(owner.photo_path, '\.jpg$', '-small.jpg')),
    false
  );
  if not is_picture and not (object_name = any (owner.photo_paths)) then
    return false;
  end if;
  if private.blocked_between(viewer, owner.id) then return false; end if;

  -- on your nearby list (the same rules as nearby())
  if owner.status = 'active'
    and exists (
      select 1 from public.availability a
      where a.user_id = owner.id and a.state = 'open' and a.expires_at > now()
    )
    and private.near_each_other(viewer, owner.id)
  then
    return true;
  end if;

  -- a waiting request between you, or a chat or meeting
  if exists (
    select 1 from public.chat_requests r
    where ((r.from_user = viewer and r.to_user = owner.id) or (r.from_user = owner.id and r.to_user = viewer))
      and (r.status in ('accepted', 'met') or (r.status = 'pending' and r.expires_at > now()))
  ) then
    return true;
  end if;

  -- the host's picture, for someone who joined their event on the map
  if is_picture
    and owner.status = 'active'
    and exists (
      select 1 from public.events e
      join public.event_members m on m.event_id = e.id and m.user_id = viewer
      where e.host = owner.id and e.starts_at > now() - interval '3 hours'
    )
  then
    return true;
  end if;

  return false;
end;
$$;

-- The app saves JPEGs of at most 1080 x 1920 px, well under 1.5 MB.
update storage.buckets set file_size_limit = 1572864 where id = 'photos';

-- When each photo was uploaded, by person, for the 40-a-day limit. Only the time is kept.
-- Rows older than a day are removed by the cron job.
create table private.photo_uploads (
  user_id uuid not null,
  uploaded_at timestamptz not null default now()
);

create index photo_uploads_user_idx on private.photo_uploads (user_id, uploaded_at);

alter table private.photo_uploads enable row level security;
revoke all on private.photo_uploads from public, anon, authenticated;

-- Trigger: records an upload to the photos bucket under the folder's owner.
create function private.record_photo_upload()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  folder text := (storage.foldername(new.name))[1];
begin
  if folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    insert into private.photo_uploads (user_id) values (folder::uuid);
  end if;
  return null;
end;
$$;

revoke execute on function private.record_photo_upload () from public, anon, authenticated;

create trigger photos_record_upload
  after insert on storage.objects
  for each row when (new.bucket_id = 'photos')
  execute function private.record_photo_upload();

-- How many photos the signed-in user uploaded in the last day. Like my_photo_count, the insert
-- policy asks this function, which runs as its owner and only counts the caller's uploads.
create function private.my_uploads_today()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select count(*) from private.photo_uploads
  where user_id = (select auth.uid()) and uploaded_at > now() - interval '24 hours';
$$;

-- The insert policy runs it as the signed-in user, so `authenticated` must be able to execute it.
revoke execute on function private.my_uploads_today () from public, anon;
grant execute on function private.my_uploads_today () to authenticated;

-- As before (20261022103744_break_it_hardening.sql), with at most 16 files in your folder
-- (was 24) and 40 uploads a day. The app keeps up to 8 (the profile picture, its small copy
-- and 6 more), so 16 still leaves room to replace all of them in one save before the old ones
-- are tidied up. Both counts are best-effort, as before: uploads sent at the same moment can't
-- see each other.
drop policy photos_insert_own_folder on storage.objects;

create policy photos_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and cardinality(storage.foldername(name)) = 1
    and private.my_photo_count() < 16
    and private.my_uploads_today() < 40
  );

-- housekeeping ------------------------------------------------------------------------

-- As before, plus forgetting call counts from old windows, and sign-ups and photo uploads older
-- than the day their limits look at. Last known positions are kept (private.last_positions).
create or replace function private.expire_stale()
returns void
language sql security definer set search_path = ''
as $$
  delete from public.availability where expires_at <= now();
  update public.chat_requests r set status = 'expired'
  where r.status = 'pending'
    and (
      r.expires_at <= now()
      or not exists (
        select 1 from public.availability a
        where a.user_id = r.from_user and a.expires_at > now()
      )
    );
  update public.chat_requests r set status = 'cancelled', ended_at = now()
  where r.status = 'accepted'
    and not exists (
      select 1 from public.availability a
      where a.user_id in (r.from_user, r.to_user) and a.expires_at > now()
    );
  delete from private.location_changes where changed_at <= now() - interval '10 minutes';
  delete from private.event_posts where posted_at <= now() - interval '24 hours';
  delete from private.call_counts where window_start <= now() - interval '1 hour';
  delete from private.signup_ips where created_at <= now() - interval '24 hours';
  delete from private.photo_uploads where uploaded_at <= now() - interval '24 hours';
$$;
