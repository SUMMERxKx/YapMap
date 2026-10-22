-- Hardening from trying to break the app (October 2026). The app changes that use it ship together.
--
--   * Text people type has to show something: names, intros, interests, event titles and
--     messages can't be only spaces, line breaks or invisible characters (zero-width spaces
--     and the like).
--   * Text can't carry control characters, direction overrides that flip how the text around
--     them reads ("Bob" + U+202E + "gnp.exe" shows as "Bobexe.png"), or a pile of more than
--     three accents on one letter ("Zalgo" text that spills over the lines around it). Names,
--     interests, the live note and event titles are one line; intros, event details, messages
--     and report details may have line breaks.
--   * Interests: 3 to 5 different ones, each 1 to 30 characters, in a plain list (an empty
--     list used to get through).
--   * Saying hi again to the person you're already waiting on returns that same request, so a
--     double tap sends one request instead of an error.
--   * Reports: a second report of the same person within a day keeps the first one (a double
--     tap files one report), you can report at most 10 people a day, and the request a report
--     points at has to be one between the two of you.
--   * The 5-events-a-day limit counts events you deleted too, so deleting doesn't reset it.
--   * Photos: each person's folder holds at most 24 files, all directly inside it.
--   * my_status also returns the server's clock, so the app can correct for a phone whose
--     clock is wrong.
--
-- `create or replace` keeps the existing grants of every function changed here (executable by
-- `authenticated`, not by `anon` or `public`).
--
-- Applying this to the hosted project: the new rules are checked against every existing row,
-- and if one breaks a rule the whole migration fails and nothing changes. Run this read-only
-- query in the SQL editor first; every count must be 0 (fix or remove the rows it finds first).
--
--   with p (visible, bad, line_break, piled) as (values (
--     '[^[:space:]\u0085\u00a0\u00ad\u034f\u061c\u115f\u1160\u1680\u17b4\u17b5\u180b-\u180f\u2000-\u200f\u2028-\u202f\u205f-\u206f\u2800\u3000\u3164\ufe00-\ufe0f\ufeff\uffa0\U000e0000-\U000e007f]',
--     '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]',
--     '[\t\n\r\u2028\u2029]',
--     '[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{4,}'
--   ))
--   select 'profiles.first_name' as field, count(*) from public.profiles, p
--     where first_name !~ visible or first_name ~ bad or first_name ~ line_break or first_name ~ piled
--   union all select 'profiles.last_name', count(*) from public.profiles, p
--     where last_name !~ visible or last_name ~ bad or last_name ~ line_break or last_name ~ piled
--   union all select 'profiles.intro', count(*) from public.profiles, p
--     where intro !~ visible or intro ~ bad or intro ~ piled
--   union all select 'profiles.interests', count(*) from public.profiles, p
--     where coalesce(array_ndims(interests), 0) <> 1
--       or cardinality(interests) not between 3 and 5
--       or cardinality(interests) <> (select count(distinct i) from unnest(interests) i)
--       or exists (select 1 from unnest(interests) i
--                  where i is null or char_length(i) not between 1 and 30
--                     or i !~ visible or i ~ bad or i ~ line_break or i ~ piled)
--   union all select 'availability.note', count(*) from public.availability, p
--     where note ~ bad or note ~ line_break or note ~ piled
--   union all select 'events.title', count(*) from public.events, p
--     where title !~ visible or title ~ bad or title ~ line_break or title ~ piled
--   union all select 'events.description', count(*) from public.events, p
--     where description ~ bad or description ~ piled
--   union all select 'messages.body', count(*) from public.messages, p
--     where body !~ visible or body ~ bad or body ~ piled
--   union all select 'reports.details', count(*) from public.reports, p
--     where details ~ bad or details ~ piled;

-- text people type ----------------------------------------------------------------------

-- True when the text shows at least one character: not empty, and not only spaces, line
-- breaks or characters that draw nothing (zero-width spaces and joiners, direction marks,
-- Hangul and Braille blanks, variation selectors, tag characters).
-- The check constraints below run these helpers as whoever is saving the row, so they are
-- executable by `authenticated` (and `service_role`). They read no tables.
create function private.has_visible_text(value text)
returns boolean
language sql immutable set search_path = ''
as $$
  select value ~ '[^[:space:]\u0085\u00a0\u00ad\u034f\u061c\u115f\u1160\u1680\u17b4\u17b5\u180b-\u180f\u2000-\u200f\u2028-\u202f\u205f-\u206f\u2800\u3000\u3164\ufe00-\ufe0f\ufeff\uffa0\U000e0000-\U000e007f]';
$$;

-- True when the text has no control characters, no direction overrides or isolates (they flip
-- how the text around them reads), no more than three accents piled on one letter, and - unless
-- `multiline` - no line breaks or tabs. Emoji, accents and every alphabet are fine.
create function private.is_clean_text(value text, multiline boolean)
returns boolean
language sql immutable set search_path = ''
as $$
  select value !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]'
    and (multiline or value !~ '[\t\n\r\u2028\u2029]')
    and value !~ '[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{4,}';
$$;

-- True for 3 to 5 different interests, each one line of 1 to 30 characters, in a plain list.
create function private.valid_interests(interests text[])
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(array_ndims(interests) = 1, false)
    and cardinality(interests) between 3 and 5
    and cardinality(interests) = (select count(distinct item) from unnest(interests) as item)
    and (
      select bool_and(
        item is not null
        and char_length(item) between 1 and 30
        and private.has_visible_text(item)
        and private.is_clean_text(item, false)
      )
      from unnest(interests) as item
    );
$$;

revoke execute on function
  private.has_visible_text (text),
  private.is_clean_text (text, boolean),
  private.valid_interests (text[])
from public, anon;
grant execute on function
  private.has_visible_text (text),
  private.is_clean_text (text, boolean),
  private.valid_interests (text[])
to authenticated, service_role;

-- The lengths were already limited; these add what the text may contain.
alter table public.profiles
  add constraint profiles_first_name_text
    check (private.has_visible_text(first_name) and private.is_clean_text(first_name, false)),
  add constraint profiles_last_name_text
    check (private.has_visible_text(last_name) and private.is_clean_text(last_name, false)),
  add constraint profiles_intro_text
    check (private.has_visible_text(intro) and private.is_clean_text(intro, true)),
  add constraint profiles_interests_valid
    check (private.valid_interests(interests));

alter table public.availability
  add constraint availability_note_text check (private.is_clean_text(note, false));

alter table public.events
  add constraint events_title_text
    check (private.has_visible_text(title) and private.is_clean_text(title, false)),
  add constraint events_description_text check (private.is_clean_text(description, true));

alter table public.messages
  add constraint messages_body_text
    check (private.has_visible_text(body) and private.is_clean_text(body, true));

alter table public.reports
  add constraint reports_details_text check (private.is_clean_text(details, true));

-- say hi --------------------------------------------------------------------------------

-- As before, plus: saying hi again to the person you're already waiting on (a double tap)
-- returns that same request instead of refusing.
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

-- safety ------------------------------------------------------------------------------

-- As before (three different reporters hide a profile until a human reviews it), plus:
--   * a second report of the same person within a day keeps the first one, so a double tap
--     files one report;
--   * at most 10 people reported a day;
--   * the reason must be one of the app's, the details clean and at most 500 characters
--     (refused, no longer cut short);
--   * an attached request is only kept when it is one between the two of you.
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

  insert into public.reports (reporter, reported, request_id, reason, details)
  values (uid, target, linked_request, reason, details);

  -- three different reporters hide the profile until a human reviews it
  update public.profiles
  set status = 'hidden'
  where id = target
    and status = 'active'
    and (select count(distinct reporter) from public.reports where reported = target) >= 3;
end;
$$;

-- map events --------------------------------------------------------------------------

-- When each event was posted, kept for the 5-a-day limit even after the event is deleted (the
-- limit used to count the events table, so deleting an event gave its place back). Only the
-- time is kept. Rows older than the day the limit looks at are removed by the cron job.
create table private.event_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  posted_at timestamptz not null default now()
);

create index event_posts_user_idx on private.event_posts (user_id, posted_at);

-- Only the functions use it (as the owner). RLS with no policy denies everyone else.
alter table private.event_posts enable row level security;
revoke all on private.event_posts from public, anon, authenticated;

-- Events posted in the last day keep counting.
insert into private.event_posts (user_id, posted_at)
select host, created_at from public.events where created_at > now() - interval '24 hours';

-- As before, plus: the title and details are checked here so the app gets a clear answer, the
-- start time is checked before it is converted (a huge number used to fail with a database
-- error), and the 5-a-day limit counts deleted events too.
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
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (
    select 1 from public.profiles where id = uid and status = 'active' and is_adult
  ) then raise exception 'profile not ready'; end if;
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

-- photos ------------------------------------------------------------------------------

-- Uploads go directly inside your own folder ("<your id>/<file>", never a sub-folder, which
-- the app's tidy-up can't see), and the folder holds at most 24 files. The app keeps up to 8
-- (the profile picture, its small copy and 6 more) and tidies up before uploading new ones,
-- so 24 leaves room for a whole new set while a save is under way. Without a limit, a
-- modified app could fill the storage with 5 MB files.

-- How many files the signed-in user has in their folder of the photos bucket. A policy on
-- storage.objects can't read storage.objects itself (Postgres refuses that as recursion), so
-- the insert policy asks this function, which runs as its owner. It only ever counts the
-- caller's own folder.
create function private.my_photo_count()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select count(*) from storage.objects
  where bucket_id = 'photos' and name like (select auth.uid())::text || '/%';
$$;

-- The insert policy runs it as the signed-in user, so `authenticated` must be able to execute it.
revoke execute on function private.my_photo_count () from public, anon;
grant execute on function private.my_photo_count () to authenticated;

drop policy photos_insert_own_folder on storage.objects;

create policy photos_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and cardinality(storage.foldername(name)) = 1
    and private.my_photo_count() < 24
  );

-- restart and housekeeping ------------------------------------------------------------

-- As before, plus 'now': the server's clock in milliseconds, so the app can tell how far the
-- phone's clock is off and count down to the server's times correctly.
create or replace function public.my_status()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'now', (extract(epoch from now()) * 1000)::bigint,
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

-- As before, plus forgetting event posts older than the day the event limit looks at.
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
$$;
