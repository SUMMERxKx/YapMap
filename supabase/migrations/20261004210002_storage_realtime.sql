-- Photo storage and Realtime wiring.

-- A private bucket: photos are only reachable through signed URLs the client creates.
-- Anyone signed in may read (profiles are shown to nearby people and chat partners);
-- each user may write only inside their own folder (<their uid>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy photos_read_signed_in on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');

create policy photos_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy photos_update_own_folder on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy photos_delete_own_folder on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Realtime: the app listens for incoming requests (and answers to its own) and for new
-- messages. Delivery is gated by the SELECT policies on these tables, so each person
-- only ever receives rows they're part of. Full replica identity so those policies can
-- be evaluated for UPDATE events too.
alter table public.chat_requests replica identity full;
alter table public.messages replica identity full;

alter publication supabase_realtime add table public.chat_requests;
alter publication supabase_realtime add table public.messages;
