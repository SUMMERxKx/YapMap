-- Checks for the rules added in 20261022103744_break_it_hardening.sql: each test is something a
-- modified app did successfully before that migration. (The photo limit is 16 files since
-- 20261026180208_safety_fixes.sql.) Run against the local stack:
--
--   supabase start
--   supabase test db
--
-- Everything happens inside one transaction that is rolled back, so nothing is left behind.
-- Unusual characters are written with chr() so they stay visible here: chr(8203) is a zero-width
-- space, chr(8238) a right-to-left override, chr(822) an accent that stacks on the letter before.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

-- Ada and Bo, live at the same café; ten more people for Ada to report.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'person' || n || '@example.test'
from generate_series(1, 12) as n;

insert into public.profiles (id, first_name, last_name, gender, intro, interests, is_adult)
select id, 'Person', 'Tester', 'prefer-not', 'Here to test.', array['Coffee', 'Books', 'Music'], true
from auth.users where email like 'person%@example.test';

-- auth.uid() reads this setting, so it decides who is calling.
create function pg_temp.act_as(person int) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000' || lpad(person::text, 2, '0'), true);
$$;

create function pg_temp.id_of(person int) returns uuid
language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || lpad(person::text, 2, '0'))::uuid;
$$;

-- Text people type -------------------------------------------------------------------------

select throws_ok(
  $$ update public.profiles set first_name = '   ' where id = pg_temp.id_of(1) $$,
  '23514', null, 'a first name of only spaces is refused'
);
select throws_ok(
  $$ update public.profiles set first_name = 'Bob' || chr(8238) || 'gnp.exe' where id = pg_temp.id_of(1) $$,
  '23514', null, 'a name with a right-to-left override is refused'
);
select throws_ok(
  $$ update public.profiles set intro = chr(8203) || chr(8203) where id = pg_temp.id_of(1) $$,
  '23514', null, 'an intro of only zero-width spaces is refused'
);
select throws_ok(
  $$ update public.profiles set interests = '{}' where id = pg_temp.id_of(1) $$,
  '23514', null, 'an empty list of interests is refused'
);
select throws_ok(
  $$ update public.profiles set interests = array['Coffee', 'Books', repeat('x', 31)] where id = pg_temp.id_of(1) $$,
  '23514', null, 'an interest longer than 30 characters is refused'
);
select lives_ok(
  $$ update public.profiles set first_name = 'José 🌙', intro = 'مرحبا! Line one' || chr(10) || 'line two'
     where id = pg_temp.id_of(1) $$,
  'accents, emoji, Arabic and line breaks in an intro are fine'
);

-- The dashboard and admin scripts write as service_role, and the checks above call private helpers.
set local role service_role;
select lives_ok(
  $$ update public.profiles set first_name = 'Edited by an admin'
     where id = '00000000-0000-0000-0000-000000000003' $$,
  'service_role can still edit a profile'
);
reset role;

-- Say hi -------------------------------------------------------------------------------------

select pg_temp.act_as(1);
select public.go_green(49.8951, -97.1384, 5, 60, '');
select pg_temp.act_as(2);
select public.go_green(49.8951, -97.1384, 5, 60, '');

select pg_temp.act_as(1);
create temp table first_hi as select public.send_request(pg_temp.id_of(2)) as answer;
select is(
  public.send_request(pg_temp.id_of(2)) ->> 'id',
  (select answer ->> 'id' from first_hi),
  'saying hi twice to the same person returns the same request'
);
select is(
  (select count(*) from public.chat_requests where from_user = pg_temp.id_of(1))::int,
  1,
  'and only one request exists'
);

-- Messages ----------------------------------------------------------------------------------

select pg_temp.act_as(2);
select public.respond((select (answer ->> 'id')::uuid from first_hi), true);
select pg_temp.act_as(1);

select throws_ok(
  $$ select public.send_chat_message((select (answer ->> 'id')::uuid from first_hi), chr(8203) || chr(8203)) $$,
  '23514', null, 'a message of only zero-width spaces is refused'
);
select throws_ok(
  $$ select public.send_chat_message((select (answer ->> 'id')::uuid from first_hi), 'h' || repeat(chr(822), 10) || 'i') $$,
  '23514', null, 'a message with a pile of stacked accents is refused'
);
select lives_ok(
  $$ select public.send_chat_message((select (answer ->> 'id')::uuid from first_hi), 'hi 👋 see you by the window') $$,
  'a normal message with an emoji is sent'
);

-- Reports -----------------------------------------------------------------------------------

select public.report_user(pg_temp.id_of(2), 'spam-or-fake', '');
select public.report_user(pg_temp.id_of(2), 'spam-or-fake', '');
select is(
  (select count(*) from public.reports where reporter = pg_temp.id_of(1))::int,
  1,
  'reporting the same person twice files one report'
);

select public.report_user(pg_temp.id_of(n), 'other', '') from generate_series(3, 11) as n;
select throws_ok(
  $$ select public.report_user(pg_temp.id_of(12), 'other', '') $$,
  'too many reports', 'an 11th person reported in a day is refused'
);

-- Events ------------------------------------------------------------------------------------

select throws_ok(
  $$ select public.create_event('☕', '   ', '', 49.9, -97.1, (extract(epoch from now()) * 1000)::bigint) $$,
  'invalid title', 'an event titled with only spaces is refused'
);

-- Five events, each deleted straight away: the sixth is still over the daily limit.
select public.delete_event(
  (public.create_event('☕', 'Coffee ' || n, '', 49.9, -97.1, (extract(epoch from now()) * 1000)::bigint) ->> 'id')::uuid
)
from generate_series(1, 5) as n;
select throws_ok(
  $$ select public.create_event('☕', 'One more', '', 49.9, -97.1, (extract(epoch from now()) * 1000)::bigint) $$,
  'too many events', 'deleting events does not reset the 5-a-day limit'
);

-- Restart ------------------------------------------------------------------------------------

select ok(public.my_status() ? 'now', 'my_status includes the server clock');

-- Photos ------------------------------------------------------------------------------------

set local role authenticated;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('photos', pg_temp.id_of(1) || '/a/deep.jpg') $$,
  '42501', null, 'a photo in a sub-folder of your own folder is refused'
);
insert into storage.objects (bucket_id, name)
select 'photos', pg_temp.id_of(1) || '/photo-' || n || '.jpg' from generate_series(1, 16) as n;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('photos', pg_temp.id_of(1) || '/photo-17.jpg') $$,
  '42501', null, 'a 17th file in your folder is refused'
);
reset role;

select * from finish();
rollback;
