-- Supabase no longer allows deleting rows from storage tables directly, so the old
-- delete_account() failed before it reached auth.users. The app now removes the user's
-- photos through the Storage API first; this function only deletes the auth user, which
-- cascades through profiles and everything referencing it.
-- create or replace keeps the existing grants (execute revoked from public and anon).
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = uid;
end;
$$;
