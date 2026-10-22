-- The host can delete their event.
--
--   * delete_event: only the event's host can call it. Deleting the event also deletes who
--     joined it (event_members) and its group chat (messages), through the foreign keys'
--     `on delete cascade`.
--   * Realtime announces the deletion, so anyone who has the event or its group chat open
--     sees "This event was deleted" straight away.

-- map events --------------------------------------------------------------------------

create function public.delete_event(event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.events e where e.id = delete_event.event_id) then
    raise exception 'no such event';
  end if;
  if not exists (
    select 1 from public.events e where e.id = delete_event.event_id and e.host = uid
  ) then
    raise exception 'not the host';
  end if;

  -- event_members and messages go with it (on delete cascade)
  delete from public.events e where e.id = delete_event.event_id;
end;
$$;

revoke execute on function public.delete_event (uuid) from public, anon;
grant execute on function public.delete_event (uuid) to authenticated;

-- Realtime: the app listens for deleted events. Nobody can read public.events directly
-- (no SELECT policy), so Realtime never sends its new or changed rows; for a DELETE it sends
-- only the primary key, the event's id, which the map already shows to everyone.
alter publication supabase_realtime add table public.events;
