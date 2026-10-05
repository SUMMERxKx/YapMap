-- Yap server-side rules. Every write the app makes goes through one of these functions,
-- so a modified client can't cheat: proximity, blocks, rate limits and statuses are all
-- checked here, in the database.
--
-- Conventions:
--   * public.* functions are the API the app calls via supabase.rpc(...).
--     They are SECURITY DEFINER (they bypass RLS), always derive the caller from
--     auth.uid(), and are executable by `authenticated` only.
--   * private.* helpers are not callable from outside at all.
--   * Functions that return people return a "person card" as jsonb with camelCase
--     keys matching the app's NearbyPerson type - and never coordinates.

-- helpers -------------------------------------------------------------------------------

create or replace function private.blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

-- What another person is allowed to know about `target`. The single source of truth
-- for profile visibility: first name + last initial, gender only if shown, photos as
-- storage paths (the client turns them into signed URLs), the live note - no location.
create or replace function private.person_card(target uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'firstName', p.first_name,
    'lastInitial', upper(left(p.last_name, 1)),
    'gender', case when p.show_gender and p.gender <> 'prefer-not' then p.gender end,
    'intro', p.intro,
    'interests', to_jsonb(p.interests),
    'photoPath', p.photo_path,
    'photoPaths', to_jsonb(p.photo_paths),
    'note', coalesce(a.note, ''),
    'verified', p.verified
  )
  from public.profiles p
  left join public.availability a on a.user_id = p.id
  where p.id = target;
$$;

-- "Near" means within 100 m, stretched up to 150 m when the caller's GPS fix is poor.
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
      and extensions.st_dwithin(
        av_a.location, av_b.location,
        least(150, 100 + coalesce(av_a.accuracy_m, 0))
      )
  );
$$;

revoke execute on function
  private.blocked_between (uuid, uuid),
  private.person_card (uuid),
  private.near_each_other (uuid, uuid)
from public, anon, authenticated;

-- going live ----------------------------------------------------------------------------

create or replace function public.go_green(
  lat double precision,
  lng double precision,
  accuracy double precision,
  minutes integer,
  note text default ''
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
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

  insert into public.availability (user_id, location, accuracy_m, note, state, started_at, expires_at)
  values (
    uid,
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
    accuracy,
    coalesce(note, ''),
    'open',
    now(),
    now() + make_interval(mins => minutes)
  )
  on conflict (user_id) do update set
    location = excluded.location,
    accuracy_m = excluded.accuracy_m,
    note = excluded.note,
    started_at = now(),
    expires_at = excluded.expires_at;
end;
$$;

create or replace function public.update_note(note text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if char_length(coalesce(note, '')) > 60 then raise exception 'note too long'; end if;
  update public.availability
  set note = coalesce(update_note.note, '')
  where user_id = (select auth.uid());
end;
$$;

create or replace function public.go_offline()
returns void
language sql security definer set search_path = ''
as $$
  delete from public.availability where user_id = (select auth.uid());
$$;

-- People who are live near the caller: cards only, never positions or distances.
create or replace function public.nearby()
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  with me as (
    select user_id, location, accuracy_m
    from public.availability
    where user_id = (select auth.uid()) and expires_at > now()
  )
  select private.person_card(a.user_id)
  from public.availability a
  join public.profiles p on p.id = a.user_id
  cross join me
  where a.user_id <> me.user_id
    and a.state = 'open'
    and a.expires_at > now()
    and p.status = 'active'
    and extensions.st_dwithin(a.location, me.location, least(150, 100 + coalesce(me.accuracy_m, 0)))
    and not private.blocked_between(me.user_id, a.user_id)
  limit 50;
$$;

-- say hi --------------------------------------------------------------------------------

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

  if req.expires_at <= now() then
    update public.chat_requests set status = 'expired' where id = req.id;
    raise exception 'request expired';
  end if;

  if accept then
    update public.chat_requests
    set status = 'accepted', responded_at = now()
    where id = req.id;
    -- both disappear from other people's nearby lists while they chat
    update public.availability set state = 'chatting'
    where user_id in (req.from_user, req.to_user);
  else
    update public.chat_requests
    set status = 'declined', responded_at = now()
    where id = req.id;
  end if;
end;
$$;

-- The other participant's card: the recipient may look at any stage (it's shown on the
-- incoming screen); the sender only once the request was accepted.
create or replace function public.request_person(request_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case
    when r.to_user = (select auth.uid()) then private.person_card(r.from_user)
    when r.from_user = (select auth.uid()) and r.status in ('accepted', 'met', 'cancelled')
      then private.person_card(r.to_user)
  end
  from public.chat_requests r
  where r.id = request_id;
$$;

create or replace function public.end_chat(request_id uuid, outcome text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
begin
  if outcome not in ('met', 'cancelled') then raise exception 'invalid outcome'; end if;
  select * into req
  from public.chat_requests
  where id = request_id and uid in (from_user, to_user) and status = 'accepted'
  for update;
  if not found then raise exception 'no such chat'; end if;

  update public.chat_requests
  set status = outcome, ended_at = now()
  where id = req.id;
  -- back on the nearby lists, if they're still live
  update public.availability set state = 'open'
  where user_id in (req.from_user, req.to_user) and state = 'chatting';
end;
$$;

create or replace function public.send_chat_message(request_id uuid, body text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.chat_requests;
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

  insert into public.messages (request_id, sender, body) values (req.id, uid, body);
end;
$$;

-- safety --------------------------------------------------------------------------------

-- Blocking is instant and mutual: it also cancels anything in flight between the two.
create or replace function public.block_user(target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;
  if target = uid then raise exception 'cannot block yourself'; end if;

  insert into public.blocks (blocker, blocked) values (uid, target)
  on conflict do nothing;

  update public.chat_requests
  set status = 'cancelled', ended_at = now()
  where status in ('pending', 'accepted')
    and ((from_user = uid and to_user = target) or (from_user = target and to_user = uid));

  update public.availability set state = 'open'
  where user_id in (uid, target) and state = 'chatting';
end;
$$;

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
begin
  if uid is null then raise exception 'not signed in'; end if;
  if target = uid then raise exception 'cannot report yourself'; end if;

  insert into public.reports (reporter, reported, request_id, reason, details)
  values (uid, target, request_id, reason, left(coalesce(details, ''), 500));

  -- three different reporters hide the profile until a human reviews it
  update public.profiles
  set status = 'hidden'
  where id = target
    and status = 'active'
    and (select count(distinct reporter) from public.reports where reported = target) >= 3;
end;
$$;

-- Deleting the auth user cascades through profiles and everything referencing it;
-- the user's photos are removed from storage too.
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from storage.objects
  where bucket_id = 'photos' and (storage.foldername(name))[1] = uid::text;
  delete from auth.users where id = uid;
end;
$$;

-- map events ----------------------------------------------------------------------------

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
      'photoPath', h.photo_path
    ),
    'memberCount', (select count(*) from public.event_members m where m.event_id = e.id),
    'joined', exists (
      select 1 from public.event_members m where m.event_id = e.id and m.user_id = viewer
    )
  )
  from public.events e
  join public.profiles h on h.id = e.host
  where e.id = ev;
$$;

revoke execute on function private.event_card (uuid, uuid) from public, anon, authenticated;

create or replace function public.events_near(
  lat double precision,
  lng double precision,
  radius_m double precision default 10000
)
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  select private.event_card(e.id, (select auth.uid()))
  from public.events e
  join public.profiles h on h.id = e.host
  where extensions.st_dwithin(
      e.location,
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
      least(coalesce(radius_m, 10000), 50000)
    )
    and e.starts_at > now() - interval '3 hours'   -- recently started events still show
    and h.status = 'active'
    and not private.blocked_between((select auth.uid()), e.host)
  order by e.starts_at
  limit 50;
$$;

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
  starts timestamptz := to_timestamp(starts_at_ms / 1000.0);
  ev uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (
    select 1 from public.profiles where id = uid and status = 'active' and is_adult
  ) then raise exception 'profile not ready'; end if;
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then
    raise exception 'invalid location';
  end if;
  if starts < now() - interval '5 minutes' or starts > now() + interval '7 days' then
    raise exception 'invalid start time';
  end if;
  -- rate limit: at most 5 events a day per host
  if (
    select count(*) from public.events
    where host = uid and created_at > now() - interval '24 hours'
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
    starts
  )
  returning id into ev;

  insert into public.event_members (event_id, user_id) values (ev, uid);
  return private.event_card(ev, uid);
end;
$$;

create or replace function public.join_event(event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  host_id uuid;
begin
  select host into host_id from public.events where id = event_id;
  if host_id is null then raise exception 'no such event'; end if;
  if private.blocked_between(uid, host_id) then raise exception 'not available'; end if;
  if not exists (
    select 1 from public.profiles where id = uid and status = 'active' and is_adult
  ) then raise exception 'profile not ready'; end if;

  insert into public.event_members (event_id, user_id) values (event_id, uid)
  on conflict do nothing;
end;
$$;

-- Leaving your own event deletes it (and its chat); leaving someone else's removes you.
create or replace function public.leave_event(event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if exists (select 1 from public.events where id = event_id and host = uid) then
    delete from public.events where id = event_id;
  else
    delete from public.event_members m where m.event_id = leave_event.event_id and m.user_id = uid;
  end if;
end;
$$;

create or replace function public.send_event_message(event_id uuid, body text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
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

  insert into public.messages (event_id, sender, body)
  values (send_event_message.event_id, uid, body);
end;
$$;

-- housekeeping --------------------------------------------------------------------------

-- Runs every minute via pg_cron: live sessions end on time even if the app is closed,
-- and unanswered requests expire into the same silent "not this time".
create or replace function private.expire_stale()
returns void
language sql security definer set search_path = ''
as $$
  delete from public.availability where expires_at <= now();
  update public.chat_requests set status = 'expired'
  where status = 'pending' and expires_at <= now();
$$;

revoke execute on function private.expire_stale () from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('yap-expire-stale', '* * * * *', 'select private.expire_stale()');

-- lock down the public API --------------------------------------------------------------

revoke execute on function
  public.go_green (double precision, double precision, double precision, integer, text),
  public.update_note (text),
  public.go_offline (),
  public.nearby (),
  public.send_request (uuid),
  public.respond (uuid, boolean),
  public.request_person (uuid),
  public.end_chat (uuid, text),
  public.send_chat_message (uuid, text),
  public.block_user (uuid),
  public.report_user (uuid, text, text, uuid),
  public.delete_account (),
  public.events_near (double precision, double precision, double precision),
  public.create_event (text, text, text, double precision, double precision, bigint),
  public.join_event (uuid),
  public.leave_event (uuid),
  public.send_event_message (uuid, text)
from public, anon;
