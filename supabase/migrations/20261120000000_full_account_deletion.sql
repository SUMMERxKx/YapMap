-- Deleting an account removes everything that belongs to the person. Deleting the auth user
-- already cascades through the profile and every table keyed to it: the live session and
-- location, the last known area, the session and lookup history, every say-hi request and 1:1
-- chat with all its messages (for both people), the events the person hosts with their members
-- and group chats, their event memberships, every group message they sent and every block made by
-- them or against them.
--
-- Three things were left behind before this:
--   * private.photo_uploads, the upload times kept for the 40-a-day limit, which has no link to
--     the account, so the rows stayed until the daily cleanup.
--   * auth.flow_state and auth.audit_log_entries, the sign-in records Supabase Auth keeps under
--     the user's id without a link that deletes them with the user.
--   * Photo files. Supabase doesn't let SQL delete storage files (deleting the row would leave the
--     file itself behind), so the app removes every file in the person's folder through the
--     Storage API first. Now the server checks that the folder is empty and refuses to delete the
--     account while any file is left, so a failed removal can be tried again instead of leaving
--     photos with no account to reach them.
--
-- Only safety reports are kept: reports made by or about the person stay, without the account
-- linked, as before. Nothing else is. Deleting a hidden or suspended account no longer puts its
-- email address on the ban list, and a ban already on the list for the person's email address from
-- a suspension is removed with the account. A ban with the reason 'removed' stays: it is the
-- owner's, from removing an account for safety (or added by hand), not the person's own data.
--
-- The cleanup lives in private.delete_user, so the owner runs the same deletion for an email
-- request (select private.delete_user('<id>')) or a removal (select private.delete_user('<id>',
-- true), which leaves a 'removed' ban on the email address), in the SQL editor or with the service
-- role (docs/legal/moderation.md). public.delete_account calls it for the signed-in person.

create function private.delete_user(target uuid, keep_ban boolean default false)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  hash text;
begin
  select private.email_hash(u.email) into hash from auth.users u where u.id = target;
  if not found then raise exception 'no such account'; end if;

  if exists (
    select 1 from storage.objects o
    where o.bucket_id = 'photos' and o.name like target::text || '/%'
  ) then
    raise exception 'photos not removed';
  end if;

  update public.availability a set state = 'open'
  from public.chat_requests r
  where r.status = 'accepted' and target in (r.from_user, r.to_user)
    and a.user_id = case when r.from_user = target then r.to_user else r.from_user end
    and a.state = 'chatting';

  if keep_ban then
    insert into private.banned_identities (email_hash, reason) values (hash, 'removed')
    on conflict (email_hash) do update set reason = 'removed';
  else
    delete from private.banned_identities where email_hash = hash and reason <> 'removed';
  end if;
  delete from private.photo_uploads where user_id = target;
  delete from auth.flow_state where user_id = target;
  delete from auth.audit_log_entries where payload ->> 'actor_id' = target::text;

  delete from auth.users where id = target;
end;
$$;

revoke execute on function private.delete_user (uuid, boolean) from public, anon, authenticated;
grant execute on function private.delete_user (uuid, boolean) to service_role;

create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from auth.users where id = uid) then
    perform private.delete_user(uid);
  end if;
end;
$$;

comment on table private.banned_identities is
  'Hashes (private.email_hash) of email addresses refused at sign-up by public.before_user_created: '
  'suspended people, and people the owner removed (reason ''removed'', also used for bans added by '
  'hand). A suspension ban goes when it is lifted (private.restore_user) or when an account with that '
  'email address is deleted (private.delete_user); a ''removed'' ban stays until the owner lifts it.';
