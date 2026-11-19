-- A hidden or suspended person stays out of sight of everyone they chatted or met with
-- (store readiness item C4). Hiding someone cancels their waiting requests and chats
-- (private.end_activity) but keeps the ones that ended in a meeting, so before this a past
-- partner could still fetch their card with request_person and sign fresh URLs for their
-- photos. Now the card and every photo path that goes through a relationship need both people
-- to be active. Nothing is deleted: once a person is restored to active, the people who could
-- see them before can see them again. The person's own photos stay readable to them (the
-- storage policy's own-folder rule and the owner check below), so deleting an account works
-- while it is restricted.
--
-- Copies the app already downloaded and signed URLs issued before the hide are not affected.

-- As before (20261005065920_functions.sql), plus: nothing for a person who isn't active.
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
  where p.id = target and p.status = 'active';
$$;

revoke execute on function private.person_card (uuid) from public, anon, authenticated;

-- As before (20261022024832_server_rules.sql), plus: nothing unless both people are active.
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
  if (
    select count(*) from public.profiles
    where id in (req.from_user, req.to_user) and status = 'active'
  ) < 2 then
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

-- As before (20261026180208_safety_fixes.sql), plus: someone else's photo only while both of
-- you are active. The owner still reads their own photos whatever their status.
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

  if owner.status <> 'active'
    or not exists (select 1 from public.profiles where id = viewer and status = 'active')
  then
    return false;
  end if;

  is_picture := coalesce(
    object_name in (owner.photo_path, regexp_replace(owner.photo_path, '\.jpg$', '-small.jpg')),
    false
  );
  if not is_picture and not (object_name = any (owner.photo_paths)) then
    return false;
  end if;
  if private.blocked_between(viewer, owner.id) then return false; end if;

  -- on your nearby list (the same rules as nearby())
  if exists (
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

revoke execute on function private.can_see_photo (text) from public, anon;
grant execute on function private.can_see_photo (text) to authenticated;
