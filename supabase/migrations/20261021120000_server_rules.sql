-- Server rules from the October 2026 audit. The app changes that use them ship together.
--
--   * "Cancel request" withdraws the request on the server too (cancel_request), and
--     my_status also returns the request you're waiting on, so a restart restores it.
--   * Getting off (go_offline) withdraws the request you're waiting on as well.
--   * One chat at a time: send_request refuses while you're in a chat, and accepting refuses
--     if you're already in one and withdraws the request you're waiting on.
--   * block_user only puts people back on nearby lists when it ended a chat between the two.
--   * request_person shows nothing once either person has blocked the other.
--   * Deleting your account puts the person you were chatting with back on nearby lists
--     (delete_account).
--   * Profile photo paths must point at files in your own folder, with at most 6 extra photos.
--   * Photos can only be loaded by people who can see you right now (nearby while live, a
--     waiting request or a chat or meeting between you, or your event on the map).
--   * go_green limits how often and how fast your live location can change.
--   * A chat nobody ended stops once neither person is live any more.
--   * Joining an event takes being within about 5 km of it.
--   * go_green returns the live session's times, and sending a message returns the saved row.
--
-- Functions whose arguments or return type change are dropped and created again, then given
-- the same grants as before: executable by `authenticated`, not by `anon` or `public`.
-- `create or replace` keeps the existing grants of every other function changed here.

-- say hi: cancelling ------------------------------------------------------------------

-- Only the sender can cancel. A request that was accepted a moment before the cancel arrived
-- is ended as well, so nobody is left in a chat the other person never sees. Anything already
-- declined, expired or ended has nothing left to cancel.
create function public.cancel_request(request_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
begin
  if uid is null then raise exception 'not signed in'; end if;

  select * into req
  from public.chat_requests
  where id = request_id and from_user = uid and status in ('pending', 'accepted')
  for update;
  if not found then return; end if;

  update public.chat_requests
  set status = 'cancelled', ended_at = now()
  where id = req.id;

  if req.status = 'accepted' then
    -- back on the nearby lists, as when a chat is ended
    update public.availability set state = 'open'
    where user_id in (req.from_user, req.to_user) and state = 'chatting';
  end if;
end;
$$;

revoke execute on function public.cancel_request (uuid) from public, anon;
grant execute on function public.cancel_request (uuid) to authenticated;

-- say hi: one chat at a time ----------------------------------------------------------

-- Accepted chats are looked up by person (my_status, the one-chat checks, the cron job).
-- Only a few are ever open at once, so a partial index keeps those lookups tiny.
create index chat_requests_accepted_idx on public.chat_requests (from_user, to_user)
  where status = 'accepted';

create or replace function public.send_request(target uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if target = uid then raise exception 'cannot request yourself'; end if;
  if private.blocked_between(uid, target) then raise exception 'not available'; end if;
  if not exists (
    select 1 from public.profiles where id = target and status = 'active'
  ) then raise exception 'not available'; end if;
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

create or replace function public.respond(request_id uuid, accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
begin
  select * into req
  from public.chat_requests
  where id = request_id and to_user = uid and status = 'pending'
  for update;
  if not found then raise exception 'no such pending request'; end if;
  -- (the cron job marks it expired within a minute)
  if req.expires_at <= now() then raise exception 'request expired'; end if;

  if not accept then
    update public.chat_requests
    set status = 'declined', responded_at = now()
    where id = req.id;
    return;
  end if;

  -- The sender has to still be live, or they'd be in a chat they never see.
  if not exists (
    select 1 from public.availability
    where user_id = req.from_user and expires_at > now()
  ) then
    raise exception 'not available';
  end if;

  -- Accepting starts your one chat, so the request you're waiting on (if any) is withdrawn.
  -- Doing this first also waits for an answer to that request that is landing right now,
  -- so the check below sees it.
  update public.chat_requests
  set status = 'cancelled', ended_at = now()
  where from_user = uid and status = 'pending';

  -- one chat at a time, for both people
  if exists (
    select 1 from public.chat_requests
    where status = 'accepted' and uid in (from_user, to_user)
  ) then
    raise exception 'already chatting';
  end if;
  if exists (
    select 1 from public.chat_requests
    where status = 'accepted' and req.from_user in (from_user, to_user)
  ) then
    raise exception 'not available';
  end if;

  update public.chat_requests
  set status = 'accepted', responded_at = now()
  where id = req.id;
  -- both disappear from other people's nearby lists while they chat
  update public.availability set state = 'chatting'
  where user_id in (req.from_user, req.to_user);
end;
$$;

-- The other participant's card: the recipient may look at any stage (it's shown on the
-- incoming screen); the sender only if the request was accepted at some point (a cancelled
-- request keeps responded_at when a chat ended, not when it was withdrawn unanswered).
-- Nothing at all once either person has blocked the other, and the live note (which says
-- where to find someone) only while the request or chat is still going.
create or replace function public.request_person(request_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
  card jsonb;
begin
  select * into req from public.chat_requests where id = request_id;
  if not found or private.blocked_between(req.from_user, req.to_user) then
    return null;
  end if;

  if req.to_user = uid then
    card := private.person_card(req.from_user);
  elsif req.from_user = uid and (
    req.status in ('accepted', 'met')
    or (req.status = 'cancelled' and req.responded_at is not null)
  ) then
    card := private.person_card(req.to_user);
  else
    return null;
  end if;

  if req.status not in ('pending', 'accepted') then
    card := card || jsonb_build_object('note', '');
  end if;
  return card;
end;
$$;

-- safety ------------------------------------------------------------------------------

-- Blocking is instant and mutual: it also cancels anything in flight between the two.
-- Only ending a chat between them puts them back on nearby lists; a chat either one is
-- having with someone else carries on.
create or replace function public.block_user(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ended_chat boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if target = uid then raise exception 'cannot block yourself'; end if;

  insert into public.blocks (blocker, blocked) values (uid, target)
  on conflict do nothing;

  update public.chat_requests
  set status = 'cancelled', ended_at = now()
  where status = 'accepted'
    and ((from_user = uid and to_user = target) or (from_user = target and to_user = uid));
  ended_chat := found;

  update public.chat_requests
  set status = 'cancelled', ended_at = now()
  where status = 'pending'
    and ((from_user = uid and to_user = target) or (from_user = target and to_user = uid));

  if ended_chat then
    update public.availability set state = 'open'
    where user_id in (uid, target) and state = 'chatting';
  end if;
end;
$$;

-- Deleting your account ends your chat with it (the request row goes with your profile), so
-- the other person goes back on nearby lists and can say hi again. The app removes your
-- photos through the Storage API first; this only deletes the auth user, which cascades
-- through profiles and everything referencing it.
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;

  update public.availability a set state = 'open'
  from public.chat_requests r
  where r.status = 'accepted' and uid in (r.from_user, r.to_user)
    and a.user_id = case when r.from_user = uid then r.to_user else r.from_user end
    and a.state = 'chatting';

  delete from auth.users where id = uid;
end;
$$;

-- photos ------------------------------------------------------------------------------

-- True when every path is a file directly inside the owner's folder: "<owner id>/<file>".
-- The check constraints below run it as whoever is saving the profile, so it is executable by
-- `authenticated` (and `service_role`). It reads no tables.
create function private.in_own_folder(paths text[], owner uuid)
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(
    bool_and(
      path is not null
      and path like owner::text || '/%'
      and path not like '%/%/%'
      and path not like '%..%'
    ),
    true
  )
  from unnest(paths) as path;
$$;

revoke execute on function private.in_own_folder (text[], uuid) from public, anon;
grant execute on function private.in_own_folder (text[], uuid) to authenticated, service_role;

-- A profile can only show its own photos (no pointing at someone else's face), and at most 6
-- extra ones, the most the app lets you pick.
alter table public.profiles
  add constraint profiles_photo_path_own_folder
    check (photo_path is null or private.in_own_folder(array[photo_path], id)),
  add constraint profiles_photo_paths_own_folder
    check (private.in_own_folder(photo_paths, id)),
  add constraint profiles_photo_paths_max
    check (cardinality(photo_paths) <= 6);

-- Whether the signed-in user may load this photo of someone else: only the photos on the
-- owner's profile right now and the small copy of their profile picture that avatars use
-- (<name>-small.jpg; never older files left in their folder), never between people who
-- blocked each other, and only while one of these holds:
--   * the owner is on your nearby list (both live, near each other, the owner open);
--   * a request between you is waiting, or you chatted or met;
--   * it's the owner's profile picture and they host an event on the map.
create function private.can_see_photo(object_name text)
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

  -- the host's picture on an event the map shows (the same rules as events_near())
  if is_picture
    and owner.status = 'active'
    and exists (
      select 1 from public.events e
      where e.host = owner.id and e.starts_at > now() - interval '3 hours'
    )
  then
    return true;
  end if;

  return false;
end;
$$;

-- The read policy runs it as the signed-in user, so `authenticated` must be able to execute it.
-- It only answers for the caller (auth.uid()) and returns nothing but true or false.
revoke execute on function private.can_see_photo (text) from public, anon;
grant execute on function private.can_see_photo (text) to authenticated;

-- Replaces "anyone signed in may read every photo". Signing a URL and listing a folder both
-- need this permission, so other people's photos can only be loaded while you can see them.
drop policy photos_read_signed_in on storage.objects;

create policy photos_read_visible on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.can_see_photo(name)
    )
  );

-- going live --------------------------------------------------------------------------

-- When each live session started or moved somewhere new, for the go_green limit. Only the
-- time is kept, never the place: your location is still deleted the moment you get off.
-- Rows older than the 10 minutes the limit looks at are removed by the cron job.
create table private.location_changes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  changed_at timestamptz not null default now()
);

create index location_changes_user_idx on private.location_changes (user_id, changed_at);

-- Only the functions use it (as the owner). RLS with no policy denies everyone else.
alter table private.location_changes enable row level security;
revoke all on private.location_changes from public, anon, authenticated;

drop function public.go_green (double precision, double precision, double precision, integer, text);

-- Goes live, or updates your live session. So that a modified app can't hop around to find out
-- who is live where, a location change (starting a session, or moving more than 150 m) can
-- happen at most 3 times in 10 minutes, and while you're live a move can't be faster than
-- about 10 km/h (walking pace, with 150 m to spare for GPS wobble). A move of 150 m or less is
-- just GPS wobble: it isn't counted, and your live position and started_at stay as they were,
-- so small steps can't add up and started_at always says when your live position was set.
-- Only the times of location changes are kept, never the places. Returns the session's times.
create function public.go_green(
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
  previous public.availability;
  moved_m double precision;  -- how far from your live position; null when you're not live
  allowed_m double precision;
  set_at timestamptz := now();  -- when the stored live position was set
  new_state text := 'open';
  saved public.availability;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if minutes not in (30, 60, 120) then raise exception 'invalid duration'; end if;
  if char_length(coalesce(note, '')) > 60 then raise exception 'note too long'; end if;
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then
    raise exception 'invalid location';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = uid and p.status = 'active' and p.is_adult
  ) then
    raise exception 'profile not ready';
  end if;

  here := extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;

  -- a session that has run out (the cron job just hasn't removed it yet) isn't a live position
  select * into previous from public.availability where user_id = uid;
  if found and previous.expires_at > now() then
    moved_m := extensions.st_distance(previous.location, here);
  end if;

  if moved_m is not null and moved_m <= 150 then
    -- GPS wobble: stay where you were
    here := previous.location;
    set_at := previous.started_at;
  else
    if moved_m is not null then
      -- 10 km/h is 10000 m per 3600 s, counted from when your live position was set
      allowed_m := 150 + 10000.0 / 3600 * extract(epoch from now() - previous.started_at);
      if moved_m > allowed_m then raise exception 'moving too fast'; end if;
    end if;
    if (
      select count(*) from private.location_changes
      where user_id = uid and changed_at > now() - interval '10 minutes'
    ) >= 3 then
      raise exception 'too many location changes';
    end if;
    insert into private.location_changes (user_id) values (uid);
  end if;

  -- Someone still in a chat stays off the nearby lists.
  if exists (
    select 1 from public.chat_requests
    where status = 'accepted' and uid in (from_user, to_user)
  ) then
    new_state := 'chatting';
  end if;

  insert into public.availability (user_id, location, accuracy_m, note, state, started_at, expires_at)
  values (uid, here, accuracy, coalesce(note, ''), new_state, set_at, now() + make_interval(mins => minutes))
  on conflict (user_id) do update set
    location = excluded.location,
    accuracy_m = excluded.accuracy_m,
    note = excluded.note,
    state = excluded.state,
    started_at = excluded.started_at,
    expires_at = excluded.expires_at
  returning * into saved;

  return jsonb_build_object(
    'startedAt', (extract(epoch from saved.started_at) * 1000)::bigint,
    'expiresAt', (extract(epoch from saved.expires_at) * 1000)::bigint
  );
end;
$$;

revoke execute on function
  public.go_green (double precision, double precision, double precision, integer, text)
from public, anon;
grant execute on function
  public.go_green (double precision, double precision, double precision, integer, text)
to authenticated;

-- Getting off means you're no longer waiting on anyone, so the request you sent is withdrawn
-- before your live session is deleted: nobody can accept you into a chat you'll never see.
create or replace function public.go_offline()
returns void
language sql security definer set search_path = ''
as $$
  update public.chat_requests
  set status = 'cancelled', ended_at = now()
  where from_user = (select auth.uid()) and status = 'pending';

  delete from public.availability where user_id = (select auth.uid());
$$;

-- messages ----------------------------------------------------------------------------

-- Both send functions now return the saved message (the same row Realtime delivers), so the
-- sender sees it straight away even when Realtime is slow.
drop function public.send_chat_message (uuid, text);

create function public.send_chat_message(request_id uuid, body text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
  saved public.messages;
begin
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

drop function public.send_event_message (uuid, text);

create function public.send_event_message(event_id uuid, body text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  saved public.messages;
begin
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

revoke execute on function
  public.send_chat_message (uuid, text),
  public.send_event_message (uuid, text)
from public, anon;
grant execute on function
  public.send_chat_message (uuid, text),
  public.send_event_message (uuid, text)
to authenticated;

-- map events --------------------------------------------------------------------------

drop function public.join_event (uuid);

-- Anyone can see events on the map (events_near, up to 50 km around where they look), but
-- joining one, and with it reading its group chat, takes being within about 5 km of it.
-- The app sends the phone's position.
create function public.join_event(event_id uuid, lat double precision, lng double precision)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ev public.events;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into ev from public.events e where e.id = join_event.event_id;
  if not found then raise exception 'no such event'; end if;
  if private.blocked_between(uid, ev.host) then raise exception 'not available'; end if;
  if not exists (
    select 1 from public.profiles where id = uid and status = 'active' and is_adult
  ) then raise exception 'profile not ready'; end if;
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then
    raise exception 'invalid location';
  end if;
  if not extensions.st_dwithin(
    ev.location,
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
    5000
  ) then
    raise exception 'too far away';
  end if;

  insert into public.event_members (event_id, user_id) values (ev.id, uid)
  on conflict do nothing;
end;
$$;

revoke execute on function public.join_event (uuid, double precision, double precision) from public, anon;
grant execute on function public.join_event (uuid, double precision, double precision) to authenticated;

-- restart and housekeeping ------------------------------------------------------------

-- Everything the app needs to restore itself after a restart: am I live, do I have an open
-- chat, and am I waiting on a request? A chat where neither person is live any more is
-- skipped: the cron job is about to end it.
create or replace function public.my_status()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'live', (
      select jsonb_build_object(
        'note', a.note,
        'startedAt', (extract(epoch from a.started_at) * 1000)::bigint,
        'expiresAt', (extract(epoch from a.expires_at) * 1000)::bigint
      )
      from public.availability a
      where a.user_id = (select auth.uid()) and a.expires_at > now()
    ),
    'chatId', (
      select r.id from public.chat_requests r
      where r.status = 'accepted' and (select auth.uid()) in (r.from_user, r.to_user)
        and exists (
          select 1 from public.availability a
          where a.user_id in (r.from_user, r.to_user) and a.expires_at > now()
        )
      order by r.responded_at desc nulls last
      limit 1
    ),
    'outgoing', (
      select jsonb_build_object(
        'id', r.id,
        'expiresAt', (extract(epoch from r.expires_at) * 1000)::bigint,
        'to', private.person_card(r.to_user)
      )
      from public.chat_requests r
      where r.from_user = (select auth.uid()) and r.status = 'pending' and r.expires_at > now()
      limit 1
    )
  );
$$;

-- Runs every minute via pg_cron: live sessions end on time even if the app is closed,
-- unanswered requests expire into the same silent "not this time" (also once the sender
-- isn't live any more), and a chat nobody ended stops once neither person is live any more.
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
$$;
