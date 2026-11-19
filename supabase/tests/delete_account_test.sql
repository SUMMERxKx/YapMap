-- Checks that an account can be deleted before its profile exists: someone who signs up and
-- stops at the 18+ question or during the photo steps has an Auth account but no profile row.
-- Run against the local stack:
--
--   supabase start
--   supabase test db
--
-- Everything happens inside one transaction that is rolled back, so nothing is left behind.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

-- Three people who signed up but never saved a profile. 1 stopped at the 18+ question, 2 stopped
-- after a few calls that were counted, 3 stopped during the photo steps with photos uploaded.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000003' || lpad(n::text, 2, '0'))::uuid, 'setup' || n || '@example.test'
from generate_series(1, 3) as n;

-- auth.uid() reads this setting, so it decides who is calling.
create function pg_temp.act_as(person int) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000003' || lpad(person::text, 2, '0'), true);
$$;

create function pg_temp.id_of(person int) returns uuid
language sql as $$
  select ('00000000-0000-0000-0000-0000000003' || lpad(person::text, 2, '0'))::uuid;
$$;

insert into private.call_counts (user_id, fn, window_start, calls)
values (pg_temp.id_of(2), 'nearby', now(), 1);

-- Stopped at the 18+ question ---------------------------------------------------------------

select pg_temp.act_as(1);
set local role authenticated;
select lives_ok($$ select public.delete_account() $$, 'an account with no profile can be deleted');
reset role;
select ok(not exists (select 1 from auth.users where id = pg_temp.id_of(1)), 'its Auth account is gone');

-- The app retries when the sign-out after the deletion fails: the second call must not fail.
set local role authenticated;
select lives_ok($$ select public.delete_account() $$, 'deleting an already deleted account again does not fail');
reset role;

-- Rows linked to the Auth account ----------------------------------------------------------

select pg_temp.act_as(2);
set local role authenticated;
select lives_ok($$ select public.delete_account() $$, 'a second account with no profile can be deleted');
reset role;
select ok(not exists (select 1 from auth.users where id = pg_temp.id_of(2)), 'its Auth account is gone too');
select ok(
  not exists (select 1 from private.call_counts where user_id = pg_temp.id_of(2)),
  'rows linked to the Auth account go with it'
);
select ok(
  not exists (
    select 1 from private.banned_identities
    where email_hash in (private.email_hash('setup1@example.test'), private.email_hash('setup2@example.test'))
  ),
  'an account deleted during setup is not put on the ban list'
);

-- Stopped during the photo steps -------------------------------------------------------------
-- The app removes photos through the Storage API before it deletes the account, which needs
-- the person to see their own folder. That must not depend on having a profile.

select pg_temp.act_as(3);
set local role authenticated;
insert into storage.objects (bucket_id, name)
select 'photos', pg_temp.id_of(3) || '/photo-' || n || '.jpg' from generate_series(1, 2) as n;
select is(
  (select count(*) from storage.objects
   where bucket_id = 'photos' and (storage.foldername(name))[1] = pg_temp.id_of(3)::text)::int,
  2,
  'someone with no profile can list the photos in their own folder, so the app can remove them'
);
reset role;

select * from finish();
rollback;
