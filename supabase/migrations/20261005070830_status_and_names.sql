-- Restart support and self-describing messages.

-- A message row carries its sender's display name, so a row arriving over Realtime can
-- be rendered as-is (clients can't read other people's profile rows to look it up).
alter table public.messages add column sender_name text not null default '';

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
  );
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

  insert into public.messages (event_id, sender, sender_name, body)
  values (
    send_event_message.event_id,
    uid,
    (select p.first_name || ' ' || upper(left(p.last_name, 1)) || '.' from public.profiles p where p.id = uid),
    body
  );
end;
$$;

-- Everything the app needs to restore itself after a restart: am I live, and do I have
-- an open chat?
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
      order by r.responded_at desc nulls last
      limit 1
    )
  );
$$;

-- The people I've blocked, with enough of a name for the Blocked screen.
create or replace function public.blocked_list()
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'firstName', p.first_name,
    'lastInitial', upper(left(p.last_name, 1))
  )
  from public.blocks b
  join public.profiles p on p.id = b.blocked
  where b.blocker = (select auth.uid())
  order by b.created_at desc;
$$;

revoke execute on function public.my_status (), public.blocked_list () from public, anon;
