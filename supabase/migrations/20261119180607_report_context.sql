-- Reports keep what was reported (store readiness item C5).
--
-- Moderation is a person reading reports by hand. Until now a report kept only who was reported
-- and why, so the reviewer couldn't tell which message or event it was about, and lost it for
-- good once the person changed or deleted it. Now:
--   * Every report keeps `about` (person, message or event), `message_id` and `event_id`, and
--     `content`: a copy of what was reported, taken by the server from the real rows when the
--     report is filed. The app never sends that text. The ids are plain columns, not foreign
--     keys, so they stay after the message or event is deleted.
--   * report_message(message_id, reason, details) reports a message in a group chat, and
--     report_event(event_id, reason, details) reports an event. The server finds the sender or
--     host itself. Both refuse content the caller can't see ('content not available'): a group
--     message needs the caller in that event, and an event must be one they joined or one the
--     map would list for them (not blocked, within 50 km of where the server holds them to be,
--     started at most 3 hours ago). A 1:1 chat is reported through report_user with its
--     request_id, which keeps the chat.
--   * report_user keeps its arguments. It copies the person's profile as it is now (name,
--     intro, interests, live note, photo paths) and, when request_id is a say-hi or chat
--     between the two, the last 20 messages the reported person sent in it.
--   * A second report within a day is dropped only when it is about the same thing (the same
--     person, message or event), so reporting another message from the same person still
--     files. The daily limit is still 10 reports.
--
-- The reports table has row-level security and no policy, so the copies are never readable
-- through the API, only by the owner in the SQL editor (docs/legal/moderation.md).

alter table public.reports
  add column about text not null default 'person' check (about in ('person', 'message', 'event')),
  add column message_id uuid,
  add column event_id uuid,
  add column content jsonb;

create index reports_message_idx on public.reports (message_id) where message_id is not null;
create index reports_event_idx on public.reports (event_id) where event_id is not null;

-- The checks and the automatic hide every report goes through, as report_user did before
-- (20261026180208_safety_fixes.sql). The public functions below check that the caller can see
-- what they report, find the person and copy the content, then call this. `request_id` must
-- already be a request between the two people, or null.
create function private.file_report(
  uid uuid,
  target uuid,
  reason text,
  details text,
  request_id uuid,
  about text,
  message_id uuid,
  event_id uuid,
  content jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
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
  -- already reported the same thing today: that report stands
  if exists (
    select 1 from public.reports r
    where r.reporter = uid and r.reported = target and r.created_at > now() - interval '24 hours'
      and r.about = file_report.about
      and r.message_id is not distinct from file_report.message_id
      and r.event_id is not distinct from file_report.event_id
  ) then
    return;
  end if;
  -- rate limit: at most 10 reports a day
  if (
    select count(*) from public.reports r
    where r.reporter = uid and r.created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'too many reports';
  end if;

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

  insert into public.reports
    (reporter, reported, request_id, reason, details, counts_toward_hide, about, message_id, event_id, content)
  values
    (uid, target, file_report.request_id, reason, details, counts, file_report.about,
     file_report.message_id, file_report.event_id, file_report.content);

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

revoke execute on function private.file_report (uuid, uuid, text, text, uuid, text, uuid, uuid, jsonb)
  from public, anon, authenticated;

-- Report a person: from their profile, a say-hi, a 1:1 chat, an event they host or a group chat.
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
  content jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;

  -- null unless the request is one between the two of you
  select r.id into linked_request
  from public.chat_requests r
  where r.id = report_user.request_id
    and ((r.from_user = uid and r.to_user = target) or (r.from_user = target and r.to_user = uid));

  select jsonb_build_object(
    'first_name', p.first_name,
    'last_name', p.last_name,
    'intro', p.intro,
    'interests', to_jsonb(p.interests),
    'note', a.note,
    'photo_path', p.photo_path,
    'photo_paths', to_jsonb(p.photo_paths)
  )
  into content
  from public.profiles p
  left join public.availability a on a.user_id = p.id
  where p.id = target and p.id <> uid;

  if linked_request is not null then
    content := content || jsonb_build_object('chat', (
      select coalesce(jsonb_agg(jsonb_build_object('sent_at', m.created_at, 'body', m.body)
                                order by m.created_at), '[]'::jsonb)
      from (
        select x.created_at, x.body from public.messages x
        where x.request_id = linked_request and x.sender = target
        order by x.created_at desc
        limit 20
      ) m
    ));
  end if;

  perform private.file_report(uid, target, reason, details, linked_request, 'person', null, null, content);
end;
$$;

-- Report one message, from the group chat of an event you are in.
create function public.report_message(message_id uuid, reason text, details text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  msg public.messages;
  content jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;

  select * into msg from public.messages m where m.id = report_message.message_id;
  if not found or not exists (
    select 1 from public.event_members em where em.event_id = msg.event_id and em.user_id = uid
  ) then
    raise exception 'content not available';
  end if;

  content := jsonb_build_object(
    'body', msg.body,
    'sent_at', msg.created_at,
    'event_title', (select e.title from public.events e where e.id = msg.event_id)
  );

  perform private.file_report(
    uid, msg.sender, reason, details, null, 'message', msg.id, msg.event_id, content
  );
end;
$$;

-- Report an event: one you joined, or one the map would list for you.
create function public.report_event(event_id uuid, reason text, details text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ev public.events;
  can_see boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;

  select * into ev from public.events e where e.id = report_event.event_id;
  if found then
    can_see := exists (
      select 1 from public.event_members em where em.event_id = ev.id and em.user_id = uid
    ) or coalesce(
      not private.blocked_between(uid, ev.host)
      and ev.starts_at > now() - interval '3 hours'
      and extensions.st_dwithin(ev.location, private.my_position(uid), 50000),
      false
    );
  end if;
  if not coalesce(can_see, false) then raise exception 'content not available'; end if;

  perform private.file_report(
    uid, ev.host, reason, details, null, 'event', null, ev.id,
    jsonb_build_object(
      'emoji', ev.emoji,
      'title', ev.title,
      'description', ev.description,
      'starts_at', ev.starts_at,
      'created_at', ev.created_at
    )
  );
end;
$$;

revoke execute on function
  public.report_message (uuid, text, text),
  public.report_event (uuid, text, text)
from public, anon;
grant execute on function
  public.report_message (uuid, text, text),
  public.report_event (uuid, text, text)
to authenticated;
