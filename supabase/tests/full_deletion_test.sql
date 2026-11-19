-- Checks for 20261120000000_full_account_deletion.sql: deleting an account leaves no row and no
-- photo of the person anywhere in the database, removes their chats for both people, and works
-- for an account that never finished profile setup and for a suspended one, whose ban on their
-- email address goes too. The owner's private.delete_user, used for email requests and removals,
-- deletes the same way and can't be called by anyone signed in or signed out. A removal keeps a
-- 'removed' ban that deleting or restoring another account with the same address doesn't lift,
-- and a session left signed in after its account is gone can't upload a photo. Only safety
-- reports (and that removal ban) are kept, without the account linked. Run against
-- the local stack:
--
--   supabase start
--   supabase test db
--
-- Everything happens inside one transaction that is rolled back, so nothing is left behind.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(53);

-- 1 deletes their account. 2 chatted with 1 and joined the event 1 hosts. 3 hosts an event 1
-- joined. 4 signed up and uploaded photos but never saved a profile. 5 is suspended. 6 sent 1 a
-- say-hi, blocked 1 and was blocked by 1. 7 is suspended and asks by email to be deleted. 8 is
-- removed by the owner. 9 and 10 are 8 again, with a +tag on the same address.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000006' || lpad(n::text, 2, '0'))::uuid, 'gone' || n || '@example.test'
from generate_series(1, 8) as n;
insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000609', 'gone8+again@example.test'),
  ('00000000-0000-0000-0000-000000000610', 'gone8+other@example.test');

insert into public.profiles (id, first_name, last_name, gender, intro, interests, is_adult, photo_path, photo_paths)
select id, 'Person', 'Tester', 'prefer-not', 'Here to test.', array['Coffee', 'Books', 'Music'], true,
  id || '/profile-1.jpg', array[id || '/gallery-1.jpg', id || '/gallery-2.jpg']
from auth.users where email like 'gone%@example.test' and email <> 'gone4@example.test';

-- auth.uid() reads this setting, so it decides who is calling.
create function pg_temp.act_as(person int) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000006' || lpad(person::text, 2, '0'), true);
$$;

create function pg_temp.id_of(person int) returns uuid
language sql as $$
  select ('00000000-0000-0000-0000-0000000006' || lpad(person::text, 2, '0'))::uuid;
$$;

-- Every table in the app's and Supabase's own schemas whose rows still mention `needle`
-- anywhere (an id, a photo path, an email address, a sign-in record), with how many rows.
create function pg_temp.tables_mentioning(needle text) returns setof text
language plpgsql as $$
declare
  rel regclass;
  found bigint;
begin
  for rel in
    select c.oid::regclass from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where c.relkind in ('r', 'p') and s.nspname in ('public', 'private', 'auth', 'storage')
  loop
    execute format('select count(*) from %s x where to_jsonb(x)::text like %L', rel, '%' || needle || '%')
      into found;
    if found > 0 then
      return next rel::text || ': ' || found;
    end if;
  end loop;
end;
$$;

-- What the app does through the Storage API before it asks to delete the account: removes every
-- file in the person's folder. SQL can only do it with the setting the Storage API itself uses.
create function pg_temp.remove_photos(person int) returns void
language plpgsql as $$
begin
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects where bucket_id = 'photos' and name like pg_temp.id_of(person) || '/%';
  perform set_config('storage.allow_delete_query', 'false', true);
end;
$$;

-- Photos: the profile picture and its small copy, the gallery, a photo replaced earlier that
-- wasn't tidied up, and a file in a sub-folder (allowed before 20261022103744_break_it_hardening).
-- Each upload is also recorded in private.photo_uploads by the storage trigger.
insert into storage.objects (bucket_id, name)
select 'photos', pg_temp.id_of(p) || f.name
from (values (1), (2), (3), (4), (5), (6), (7), (8)) as people (p)
cross join (values ('/profile-1.jpg'), ('/profile-1-small.jpg'), ('/gallery-1.jpg'), ('/gallery-2.jpg')) as f (name);

insert into storage.objects (bucket_id, name)
values
  ('photos', pg_temp.id_of(1) || '/profile-0.jpg'),
  ('photos', pg_temp.id_of(1) || '/old/selfie.jpg');

-- Sign-in records Supabase Auth keeps for each person.
insert into auth.identities (provider_id, user_id, identity_data, provider)
select id::text, id, jsonb_build_object('sub', id, 'email', email), 'email'
from auth.users where email like 'gone%@example.test';

insert into auth.sessions (id, user_id)
select gen_random_uuid(), id from auth.users where email like 'gone%@example.test';

insert into auth.refresh_tokens (token, user_id, session_id)
select 'token-' || s.user_id, s.user_id::text, s.id
from auth.sessions s join auth.users u on u.id = s.user_id
where u.email like 'gone%@example.test';

insert into auth.flow_state (id, user_id, provider_type, authentication_method)
select gen_random_uuid(), id, 'email', 'otp' from auth.users where email like 'gone%@example.test';

insert into auth.audit_log_entries (id, payload, ip_address)
select gen_random_uuid(),
  json_build_object('action', 'login', 'actor_id', id, 'actor_username', email),
  '192.0.2.1'
from auth.users where email like 'gone%@example.test';

-- 1 is live, and has the history the limits keep.
insert into public.availability (user_id, location, note, expires_at)
values (pg_temp.id_of(1), 'SRID=4326;POINT(-97.1 49.9)', 'By the door', now() + interval '1 hour');
insert into private.last_positions (user_id, location)
values (pg_temp.id_of(1), 'SRID=4326;POINT(-97.1 49.9)');
insert into private.location_changes (user_id) values (pg_temp.id_of(1));
insert into private.call_counts (user_id, fn, window_start, calls)
values (pg_temp.id_of(1), 'nearby', now(), 3), (pg_temp.id_of(4), 'nearby', now(), 1);

-- 1 and 2 are chatting, and 6's say-hi to 1 is waiting.
create temp table requests (name text primary key, id uuid not null);
with made as (
  insert into public.chat_requests (from_user, to_user, status, responded_at)
  values
    (pg_temp.id_of(1), pg_temp.id_of(2), 'accepted', now()),
    (pg_temp.id_of(6), pg_temp.id_of(1), 'pending', null)
  returning id, from_user
)
insert into requests (name, id)
select case when from_user = pg_temp.id_of(1) then 'chat' else 'waiting' end, id from made;

update public.availability set state = 'chatting' where user_id = pg_temp.id_of(1);
insert into public.availability (user_id, location, state, expires_at)
values (pg_temp.id_of(2), 'SRID=4326;POINT(-97.1 49.9)', 'chatting', now() + interval '1 hour');

insert into public.messages (request_id, sender, sender_name, body)
select r.id, p.id, 'Person', 'Hi there'
from requests r cross join (values (pg_temp.id_of(1)), (pg_temp.id_of(2))) as p (id)
where r.name = 'chat';

-- 1 hosts an event 2 joined, and joined 3's event. Everyone writes in both group chats.
create temp table hosted (host int primary key, id uuid not null);
with made as (
  insert into public.events (host, title, location, starts_at)
  values
    (pg_temp.id_of(1), 'Board games', 'SRID=4326;POINT(-97.1 49.9)', now() + interval '1 hour'),
    (pg_temp.id_of(3), 'Coffee', 'SRID=4326;POINT(-97.1 49.9)', now() + interval '1 hour')
  returning id, host
)
insert into hosted (host, id)
select right(host::text, 1)::int, id from made;

insert into private.event_posts (user_id) values (pg_temp.id_of(1)), (pg_temp.id_of(3));

insert into public.event_members (event_id, user_id)
select h.id, pg_temp.id_of(m.person)
from hosted h
cross join lateral (values (h.host), (case when h.host = 1 then 2 else 1 end)) as m (person);

insert into public.messages (event_id, sender, sender_name, body)
select m.event_id, m.user_id, 'Person', 'See you there'
from public.event_members m join hosted h on h.id = m.event_id;

-- 1 and 6 blocked each other, and each reported the other.
insert into public.blocks (blocker, blocked)
values (pg_temp.id_of(1), pg_temp.id_of(6)), (pg_temp.id_of(6), pg_temp.id_of(1));

insert into public.reports (reporter, reported, reason)
values (pg_temp.id_of(6), pg_temp.id_of(1), 'spam-or-fake'), (pg_temp.id_of(1), pg_temp.id_of(6), 'harassment');

-- Before -------------------------------------------------------------------------------------

select isnt_empty(
  $$ select * from pg_temp.tables_mentioning(pg_temp.id_of(1)::text) $$,
  'before deleting, the database holds rows that mention 1'
);
select is(
  (select count(*) from storage.objects where name like pg_temp.id_of(1) || '/%')::int,
  6,
  '1 has six photo files, one of them in a sub-folder'
);

-- Photos first -------------------------------------------------------------------------------

select pg_temp.act_as(1);
select throws_ok(
  $$ select public.delete_account() $$,
  'photos not removed',
  'the account is not deleted while any photo file is still in the folder'
);
select ok(
  exists (select 1 from auth.users where id = pg_temp.id_of(1)),
  'a refused delete keeps the account, so the app can remove the photos and try again'
);

select pg_temp.remove_photos(1);
select lives_ok($$ select public.delete_account() $$, 'with the folder empty, 1 deletes their account');

-- Nothing of 1 is left ------------------------------------------------------------------------

select is_empty(
  $$ select * from pg_temp.tables_mentioning(pg_temp.id_of(1)::text) $$,
  'no row anywhere in public, private, auth or storage mentions 1''s id'
);
select is_empty(
  $$ select * from pg_temp.tables_mentioning('gone1@example.test') $$,
  'no row anywhere mentions 1''s email address'
);
select is(
  (select count(*) from storage.objects where name like pg_temp.id_of(1) || '/%')::int,
  0,
  'none of 1''s photo files are left'
);
select is((select count(*) from private.photo_uploads where user_id = pg_temp.id_of(1))::int, 0,
  '1''s upload times are gone');
select is((select count(*) from auth.flow_state where user_id = pg_temp.id_of(1))::int, 0,
  '1''s sign-in flows are gone');
select is((select count(*) from auth.audit_log_entries where payload ->> 'actor_id' = pg_temp.id_of(1)::text)::int, 0,
  '1''s sign-in audit records are gone');
select is((select count(*) from auth.sessions where user_id = pg_temp.id_of(1))::int, 0,
  '1''s sessions are gone');

-- Chats go for both people --------------------------------------------------------------------

select is(
  (select count(*) from public.chat_requests where id in (select id from requests))::int,
  0,
  'the chat with 2 and the waiting say-hi from 6 are gone'
);
select is(
  (select count(*) from public.messages where request_id in (select id from requests))::int,
  0,
  'the 1:1 messages are gone, including the ones 2 wrote'
);
select is(
  (select state from public.availability where user_id = pg_temp.id_of(2)),
  'open',
  '2 is back on nearby lists'
);
select is(
  (select count(*) from public.events where id = (select id from hosted where host = 1))::int,
  0,
  'the event 1 hosted is gone'
);
select is(
  (select count(*) from public.messages where event_id = (select id from hosted where host = 1))::int,
  0,
  'its group chat is gone, including what 2 wrote'
);
select is(
  (select count(*) from public.event_members where event_id = (select id from hosted where host = 1))::int,
  0,
  'its members are gone'
);
select results_eq(
  $$ select sender from public.messages where event_id = (select id from hosted where host = 3) $$,
  array[pg_temp.id_of(3)],
  'in 3''s event, 1''s group message is gone and 3''s stays'
);
select results_eq(
  $$ select user_id from public.event_members where event_id = (select id from hosted where host = 3) $$,
  array[pg_temp.id_of(3)],
  '3''s event stays, without 1'
);

-- Everyone else is untouched ------------------------------------------------------------------

select is(
  (select count(*) from storage.objects where name like pg_temp.id_of(2) || '/%')::int,
  4,
  '2''s photos are untouched'
);
select ok(exists (select 1 from public.profiles where id = pg_temp.id_of(6)), '6''s profile is untouched');

-- Reports are kept as before, without the account linked.
select is(
  (select count(*) from public.reports
   where reported_hash = encode(sha256(convert_to(pg_temp.id_of(1)::text, 'UTF8')), 'hex')
     and reported is null and reporter = pg_temp.id_of(6))::int,
  1,
  'the report about 1 is kept without 1 linked'
);
select is(
  (select count(*) from public.reports where reporter is null and reported = pg_temp.id_of(6))::int,
  1,
  'the report 1 made is kept without 1 linked'
);

-- Profile setup never finished ----------------------------------------------------------------

select pg_temp.act_as(4);
select throws_ok(
  $$ select public.delete_account() $$,
  'photos not removed',
  'without a profile, photos uploaded during setup are still checked'
);
select pg_temp.remove_photos(4);
select lives_ok($$ select public.delete_account() $$, '4 deletes an account that never had a profile');
select is_empty(
  $$ select * from pg_temp.tables_mentioning(pg_temp.id_of(4)::text) $$,
  'no row anywhere mentions 4''s id'
);
select is_empty(
  $$ select * from pg_temp.tables_mentioning('gone4@example.test') $$,
  'no row anywhere mentions 4''s email address'
);

-- Suspended ------------------------------------------------------------------------------------

-- Suspending 5 puts their email address on the ban list.
select private.suspend_user(pg_temp.id_of(5));
select ok(
  exists (select 1 from private.banned_identities where email_hash = private.email_hash('gone5@example.test')),
  '5 is suspended and their email address is on the ban list'
);

select pg_temp.act_as(5);
select pg_temp.remove_photos(5);
select lives_ok($$ select public.delete_account() $$, 'a suspended person deletes their account');
select is_empty(
  $$ select * from pg_temp.tables_mentioning(pg_temp.id_of(5)::text) $$,
  'no row anywhere mentions 5''s id'
);
select ok(
  not exists (select 1 from private.banned_identities where email_hash = private.email_hash('gone5@example.test')),
  'the ban on 5''s email address is deleted with the account'
);

-- An email request ------------------------------------------------------------------------------------

select pg_temp.act_as(7);
set local role authenticated;
select throws_ok(
  $$ select private.delete_user(pg_temp.id_of(7)) $$,
  '42501', null, 'a signed-in person can''t call private.delete_user, even for themselves'
);
reset role;
set local role anon;
select throws_ok(
  $$ select private.delete_user(pg_temp.id_of(7)) $$,
  '42501', null, 'a signed-out caller can''t call private.delete_user'
);
reset role;
select ok(exists (select 1 from auth.users where id = pg_temp.id_of(7)), 'the refused calls leave 7''s account');

select private.suspend_user(pg_temp.id_of(7));
select ok(
  exists (select 1 from private.banned_identities where email_hash = private.email_hash('gone7@example.test')),
  '7 is suspended and their email address is on the ban list'
);

set local role service_role;
select throws_ok(
  $$ select private.delete_user(pg_temp.id_of(7)) $$,
  'photos not removed',
  'the owner''s deletion also refuses while any photo file is still in the folder'
);
reset role;
select pg_temp.remove_photos(7);
set local role service_role;
select lives_ok($$ select private.delete_user(pg_temp.id_of(7)) $$, 'the owner deletes 7 with the service role');
reset role;
select is_empty(
  $$ select * from pg_temp.tables_mentioning(pg_temp.id_of(7)::text) $$,
  'no row anywhere mentions 7''s id'
);
select is_empty(
  $$ select * from pg_temp.tables_mentioning('gone7@example.test') $$,
  'no row anywhere mentions 7''s email address'
);
select ok(
  not exists (select 1 from private.banned_identities where email_hash = private.email_hash('gone7@example.test')),
  'the suspension ban on 7''s email address is deleted with the account'
);

-- The owner removes someone ---------------------------------------------------------------------

select private.suspend_user(pg_temp.id_of(8));
select pg_temp.remove_photos(8);
set local role service_role;
select lives_ok($$ select private.delete_user(pg_temp.id_of(8), true) $$, 'the owner removes 8, keeping the ban');
select throws_ok(
  $$ select private.delete_user('00000000-0000-0000-0000-000000000699') $$,
  'no such account',
  'an id with no account is refused, so a mistyped id doesn''t look like a deletion'
);
reset role;
select is_empty(
  $$ select * from pg_temp.tables_mentioning(pg_temp.id_of(8)::text) $$,
  'no row anywhere mentions 8''s id'
);
select is(
  (select reason from private.banned_identities where email_hash = private.email_hash('gone8@example.test')),
  'removed',
  '8''s email address stays on the ban list as removed'
);

select pg_temp.act_as(9);
select lives_ok($$ select public.delete_account() $$, '9, on the same address with a +tag, deletes their account');
select is(
  (select reason from private.banned_identities where email_hash = private.email_hash('gone8@example.test')),
  'removed',
  'deleting another account with the same address doesn''t lift the removal ban'
);
select is_empty(
  $$ select * from pg_temp.tables_mentioning(pg_temp.id_of(9)::text) $$,
  'no row anywhere mentions 9''s id'
);

select private.suspend_user(pg_temp.id_of(10));
select private.restore_user(pg_temp.id_of(10));
select is(
  (select reason from private.banned_identities where email_hash = private.email_hash('gone8@example.test')),
  'removed',
  'restoring another account with the same address doesn''t lift the removal ban'
);

-- A repeated delete ------------------------------------------------------------------------------

select pg_temp.act_as(1);
select lives_ok($$ select public.delete_account() $$, 'a repeated delete from 1''s old session does nothing and doesn''t fail');

-- A session still signed in after the account is gone ------------------------------------------

select pg_temp.act_as(1);
set local role authenticated;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('photos', pg_temp.id_of(1) || '/late.jpg') $$,
  '42501', null, 'a photo can''t be uploaded into the folder of a deleted account'
);
reset role;
select is(
  (select count(*) from storage.objects where name like pg_temp.id_of(1) || '/%')::int,
  0,
  '1''s folder stays empty'
);
select pg_temp.act_as(3);
set local role authenticated;
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('photos', pg_temp.id_of(3) || '/new.jpg') $$,
  'someone whose account exists still uploads photos'
);
reset role;

select * from finish();
rollback;
