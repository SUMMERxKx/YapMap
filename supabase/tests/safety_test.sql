-- Checks for the rules added in 20261026083000_safety_fixes.sql: each test is something the
-- October 2026 QA report did successfully before that migration. Run against the local stack:
--
--   supabase start
--   supabase test db
--
-- Everything happens inside one transaction that is rolled back, so nothing is left behind.
-- now() stays the same for the whole transaction, so every limit below is counted in one window.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(50);

-- 40 people; who does what is written next to each section.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000002' || lpad(n::text, 2, '0'))::uuid, 'safety' || n || '@example.test'
from generate_series(1, 40) as n;

insert into public.profiles (id, first_name, last_name, gender, intro, interests, is_adult)
select id, 'Person', 'Tester', 'prefer-not', 'Here to test.', array['Coffee', 'Books', 'Music'], true
from auth.users where email like 'safety%@example.test';

-- auth.uid() reads this setting, so it decides who is calling.
create function pg_temp.act_as(person int) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000002' || lpad(person::text, 2, '0'), true);
$$;

create function pg_temp.id_of(person int) returns uuid
language sql as $$
  select ('00000000-0000-0000-0000-0000000002' || lpad(person::text, 2, '0'))::uuid;
$$;

-- Calls a list `times` times, as a loop in a modified app would.
create function pg_temp.call_nearby(times int) returns void
language plpgsql as $$
begin
  for i in 1 .. times loop
    perform * from public.nearby();
  end loop;
end;
$$;

create function pg_temp.call_events_near(times int) returns void
language plpgsql as $$
begin
  for i in 1 .. times loop
    perform * from public.events_near(10000);
  end loop;
end;
$$;

-- What Supabase Auth sends the Before User Created hook.
create function pg_temp.sign_up(email text, ip text) returns jsonb
language sql as $$
  select public.before_user_created(jsonb_build_object(
    'metadata', jsonb_build_object('name', 'before-user-created', 'ip_address', ip),
    'user', jsonb_build_object('email', email)
  ));
$$;

-- Nearby (D1) ------------------------------------------------------------------------------
-- 1 and 2 are live at the same café, 3 about 140 m east of them, 4 about 1 km east, 5 asks a lot.

select pg_temp.act_as(1);
select public.go_green(49.8951, -97.1384, 5, 60, '');
select pg_temp.act_as(2);
select public.go_green(49.8951, -97.1384, -500, 60, '');
select pg_temp.act_as(3);
select public.go_green(49.8951, -97.1384 + 0.00195, 5, 60, '');
select pg_temp.act_as(4);
select public.go_green(49.8951, -97.1384 + 0.0139, 5, 60, '');

select is(
  (select extensions.st_astext(location::extensions.geometry) from public.availability where user_id = pg_temp.id_of(1)),
  extensions.st_astext(private.cell_center(49.8951, -97.1384)::extensions.geometry),
  'a live position is stored as the centre of its cell, never the exact point'
);
select is(
  (select accuracy_m from public.availability where user_id = pg_temp.id_of(2)),
  0::double precision,
  'a negative accuracy is stored as 0'
);

select pg_temp.act_as(1);
select ok(
  pg_temp.id_of(2) in (select (card ->> 'id')::uuid from public.nearby() as card),
  'two people in the same cell see each other'
);
select ok(
  pg_temp.id_of(4) not in (select (card ->> 'id')::uuid from public.nearby() as card),
  'someone 1 km away is not nearby'
);

-- 2 sends every accuracy it likes from the same spot; who it sees never changes.
select pg_temp.act_as(2);
create temp table seen_with (people text);
create function pg_temp.go_live_and_look(accuracy double precision) returns void
language sql as $$
  select public.go_green(49.8951, -97.1384, accuracy, 60, '');
  insert into seen_with
  select coalesce(string_agg(card ->> 'id', ',' order by card ->> 'id'), '') from public.nearby() as card;
$$;
select pg_temp.go_live_and_look(-1000);
select pg_temp.go_live_and_look(0);
select pg_temp.go_live_and_look(50);
select pg_temp.go_live_and_look(1000000);
select is(
  (select count(distinct people) from seen_with)::int,
  1,
  'changing only the accuracy never changes who is nearby'
);
select is(
  (select accuracy_m from public.availability where user_id = pg_temp.id_of(2)),
  50::double precision,
  'an accuracy above 50 m is stored as 50'
);

select pg_temp.act_as(5);
select public.go_green(49.8951, -97.1384, 5, 60, '');
select lives_ok($$ select pg_temp.call_nearby(12) $$, 'twelve nearby lookups in a minute are fine');
select throws_ok($$ select pg_temp.call_nearby(1) $$, 'too many lookups', 'a 13th in the same minute is refused');

-- Reports (D2) and restricted accounts (D3, D9) ----------------------------------------------
-- 10 is reported. 11 is waiting on 10's say-hi. 12 said hi to 10 and got no answer, 13 is only
-- in 10's event, 14 never met 10. 15 chatted with 10, 16 met 10, and 17 is in 10's event, where
-- 10 posted. 18 is an established account and reports 19. 32 is hidden, then restored, by
-- reports from the established accounts 33-36. 37 said hi to 38, who accepted and then ended the
-- chat; 39 said hi to 38 and took it back before an answer.

select pg_temp.act_as(10);
select public.go_green(49.8951, -97.1384, 5, 60, '');
create temp table ten_event as
select (public.create_event('☕', 'Coffee', '', 49.8951, -97.1384, (extract(epoch from now()) * 1000)::bigint) ->> 'id')::uuid as id;
insert into public.chat_requests (from_user, to_user) values (pg_temp.id_of(10), pg_temp.id_of(11));
insert into public.chat_requests (from_user, to_user) values (pg_temp.id_of(12), pg_temp.id_of(10));
insert into public.event_members (event_id, user_id) select id, pg_temp.id_of(13) from ten_event;

select pg_temp.act_as(n), public.report_user(pg_temp.id_of(10), 'spam-or-fake', '') from generate_series(12, 14) as n;
select is(
  (select status from public.profiles where id = pg_temp.id_of(10)),
  'active',
  'three brand-new accounts that only said hi, shared an event or never met someone can''t hide them'
);
select is(
  (select count(*) from public.reports where reported = pg_temp.id_of(10) and not counts_toward_hide)::int,
  3,
  'their reports still go to the review queue'
);

insert into public.chat_requests (from_user, to_user, status)
values (pg_temp.id_of(15), pg_temp.id_of(10), 'accepted'), (pg_temp.id_of(16), pg_temp.id_of(10), 'met');
insert into public.event_members (event_id, user_id) select id, pg_temp.id_of(17) from ten_event;
select pg_temp.act_as(10);
select public.send_event_message((select id from ten_event), 'Welcome!');
select pg_temp.act_as(n), public.report_user(pg_temp.id_of(10), 'harassment', '') from unnest(array[11, 15, 17, 16]) as n;
select is(
  (select count(*) from public.reports where reported = pg_temp.id_of(10) and counts_toward_hide)::int,
  4,
  'a say-hi from someone, a chat or meeting with them, or their message in a shared group chat makes a report count'
);
select is(
  (select status from public.profiles where id = pg_temp.id_of(10)),
  'hidden',
  'three people who really interacted with someone hide them'
);
select ok(
  not exists (select 1 from public.availability where user_id = pg_temp.id_of(10))
    and not exists (select 1 from public.event_members where user_id = pg_temp.id_of(10))
    and (select status from public.chat_requests where from_user = pg_temp.id_of(10)) = 'cancelled',
  'the hide ends their live session, their waiting say-hi and their event memberships'
);

select pg_temp.act_as(10);
select throws_ok(
  $$ select public.send_request(pg_temp.id_of(11)) $$,
  'account restricted', 'a hidden account can''t say hi'
);
select throws_ok(
  $$ select public.send_chat_message((select id from public.chat_requests where from_user = pg_temp.id_of(10)), 'hi') $$,
  'account restricted', 'a hidden account can''t send a chat message'
);
select throws_ok(
  $$ select public.send_event_message((select id from ten_event), 'hi all') $$,
  'account restricted', 'a hidden account can''t post in a group chat'
);
select throws_ok(
  $$ select public.update_note('by the window') $$,
  'account restricted', 'a hidden account can''t change its note'
);
select throws_ok(
  $$ select public.go_green(49.8951, -97.1384, 5, 60, '') $$,
  'account restricted', 'a hidden account is told its account is restricted, not to finish its profile'
);

update public.profiles set created_at = now() - interval '4 days' where id = pg_temp.id_of(18);
select pg_temp.act_as(18);
select public.report_user(pg_temp.id_of(19), 'other', '');
select ok(
  (select counts_toward_hide from public.reports where reporter = pg_temp.id_of(18)),
  'a report from an account older than 3 days counts towards the hide'
);

update public.profiles set created_at = now() - interval '4 days' where id in (select pg_temp.id_of(n) from generate_series(33, 36) as n);
select pg_temp.act_as(n), public.report_user(pg_temp.id_of(32), 'other', '') from generate_series(33, 35) as n;
select is(
  (select status from public.profiles where id = pg_temp.id_of(32)),
  'hidden',
  'three counted reports hide someone'
);
select private.restore_user(pg_temp.id_of(32));
select pg_temp.act_as(36);
select public.report_user(pg_temp.id_of(32), 'other', '');
select is(
  (select status from public.profiles where id = pg_temp.id_of(32)),
  'active',
  'after a review restores them, one more report doesn''t hide them again'
);

insert into public.chat_requests (from_user, to_user, status, responded_at, ended_at)
values (pg_temp.id_of(37), pg_temp.id_of(38), 'cancelled', now(), now()),
       (pg_temp.id_of(39), pg_temp.id_of(38), 'cancelled', null, now());
select pg_temp.act_as(n), public.report_user(pg_temp.id_of(38), 'harassment', '') from unnest(array[37, 39]) as n;
select ok(
  (select counts_toward_hide from public.reports where reporter = pg_temp.id_of(37)),
  'a report about a chat the other person accepted and then ended counts towards the hide'
);
select ok(
  not (select counts_toward_hide from public.reports where reporter = pg_temp.id_of(39)),
  'a say-hi taken back before an answer doesn''t'
);

-- Coming back after a ban (D4) ---------------------------------------------------------------
-- 30 is suspended. 10 (hidden above) deletes their account.

select private.suspend_user(pg_temp.id_of(30), 'test');
select is(
  pg_temp.sign_up('Safety30+again@example.test', '198.51.100.1') -> 'error' ->> 'http_code',
  '403',
  'a suspended person''s email (with a +tag) can''t sign up again'
);
select is(
  array[private.normalised_email(' S.a.m+yap@GoogleMail.com'), private.normalised_email('sam.k+yap@example.test')],
  array['sam@gmail.com', 'sam.k@example.test'],
  'the ban list ignores case, +tags and (for Gmail only) dots'
);
select is(
  pg_temp.sign_up('someone@sub.mailinator.com', '198.51.100.1') -> 'error' ->> 'http_code',
  '403',
  'an address at a throwaway domain (or a subdomain of one) is refused'
);
select is(
  pg_temp.sign_up('new.person@example.test', '198.51.100.1'),
  '{}'::jsonb,
  'an ordinary address is let through'
);

select pg_temp.sign_up('student' || n || '@example.test', '203.0.113.7') from generate_series(1, 20) as n;
select is(
  pg_temp.sign_up('student21@example.test', '203.0.113.7') -> 'error' ->> 'http_code',
  '429',
  'a 21st sign-up in a day from one IP address is refused'
);

select private.restore_user(pg_temp.id_of(30));
select is(
  pg_temp.sign_up('safety30@example.test', '198.51.100.2'),
  '{}'::jsonb,
  'restoring a suspended person takes their email off the ban list'
);

select pg_temp.act_as(10);
select public.delete_account();
select ok(
  exists (select 1 from private.banned_identities where email_hash = private.email_hash('safety10@example.test')),
  'deleting an account while it is hidden puts its email on the ban list'
);
select is(
  (select count(*) from public.reports
   where reported is null and reported_hash = encode(sha256(convert_to(pg_temp.id_of(10)::text, 'UTF8')), 'hex'))::int,
  7,
  'reports about a deleted account are kept'
);

-- Events (D5, D6) ----------------------------------------------------------------------------
-- 20 hosts in Winnipeg, 21 in Vancouver. 22 looks from Winnipeg, 23 from Toronto. 24 moves a
-- lot, 25 asks a lot. 27 tries to jump to other cities, 28 commutes.

update public.profiles set photo_path = pg_temp.id_of(20) || '/profile-1.jpg' where id = pg_temp.id_of(20);
select pg_temp.act_as(20);
create temp table winnipeg_event as
select (public.create_event('🎲', 'Board games', '', 49.8960, -97.1380, (extract(epoch from now()) * 1000)::bigint) ->> 'id')::uuid as id;
select pg_temp.act_as(21);
select public.create_event('☕', 'Coffee', '', 49.2827, -123.1207, (extract(epoch from now()) * 1000)::bigint);

select pg_temp.act_as(22);
select throws_ok(
  $$ select * from public.events_near(10000) $$,
  'location needed', 'the map needs a position the server holds before it lists events'
);
select public.set_map_position(49.8951, -97.1384);
select is(
  (select array_agg((card ->> 'id')::uuid) from public.events_near(50000) as card),
  array[(select id from winnipeg_event)],
  'the map lists events around your own position, not another city''s'
);
select is(
  (select card -> 'host' ->> 'photoPath' from public.events_near(10000) as card),
  null,
  'the host''s photo is hidden from people who haven''t joined'
);
select ok(
  not private.can_see_photo(pg_temp.id_of(20) || '/profile-1.jpg'),
  'and so is the photo file itself'
);
select lives_ok($$ select public.join_event((select id from winnipeg_event)) $$, 'joining from nearby works');
select ok(
  private.can_see_photo(pg_temp.id_of(20) || '/profile-1.jpg')
    and (select card -> 'host' ->> 'photoPath' from public.events_near(10000) as card) is not null,
  'after joining, the host''s photo shows'
);

select pg_temp.act_as(23);
select public.set_map_position(43.6532, -79.3832);
select throws_ok(
  $$ select public.set_map_position(49.8951, -97.1384) $$,
  'location jumped', 'the map position can''t jump to another city'
);
select throws_ok(
  $$ select public.join_event((select id from winnipeg_event)) $$,
  'too far away', 'joining is checked against the position the server holds'
);

-- Each move made 3 hours after the last one, so only the 3-in-10-minutes limit applies.
select pg_temp.act_as(24);
select public.set_map_position(49.8951, -97.1384);
update private.last_positions set set_at = now() - interval '3 hours' where user_id = pg_temp.id_of(24);
select public.set_map_position(49.9951, -97.1384);
update private.last_positions set set_at = now() - interval '3 hours' where user_id = pg_temp.id_of(24);
select public.set_map_position(50.0951, -97.1384);
update private.last_positions set set_at = now() - interval '3 hours' where user_id = pg_temp.id_of(24);
select throws_ok(
  $$ select public.set_map_position(50.1951, -97.1384) $$,
  'too many location changes', 'a 4th map position in 10 minutes is refused'
);

select pg_temp.act_as(27);
select public.go_green(49.8951, -97.1384, 5, 60, '');
select public.go_offline();
select throws_ok(
  $$ select public.go_green(43.6532, -79.3832, 5, 60, '') $$,
  'location jumped', 'going offline and live again can''t jump to another city'
);
update private.last_positions set set_at = now() - interval '3 hours' where user_id = pg_temp.id_of(27);
select throws_ok(
  $$ select public.set_map_position(51.5072, -0.1276) $$,
  'location jumped', 'nor can the map position once the last one is older than 2 hours'
);

-- Home, then 30 minutes later 15 km away on campus, then live 15 km further 30 minutes after that.
select pg_temp.act_as(28);
select public.set_map_position(49.8951, -97.1384);
update private.last_positions set set_at = now() - interval '30 minutes' where user_id = pg_temp.id_of(28);
select lives_ok($$ select public.set_map_position(50.0301, -97.1384) $$, 'a commute by bus or car moves the map position');
update private.last_positions set set_at = now() - interval '30 minutes' where user_id = pg_temp.id_of(28);
select public.go_green(50.1651, -97.1384, 5, 60, '');
select is(
  extensions.st_astext(private.my_position(pg_temp.id_of(28))::extensions.geometry),
  extensions.st_astext(private.cell_center(50.1651, -97.1384)::extensions.geometry),
  'going live moves the position the server holds, past an older map position'
);

select pg_temp.act_as(25);
select public.set_map_position(49.8951, -97.1384);
select lives_ok($$ select pg_temp.call_events_near(20) $$, 'twenty event lookups in a minute are fine');
select throws_ok($$ select pg_temp.call_events_near(1) $$, 'too many lookups', 'a 21st in the same minute is refused');

-- Photos (D7) and event categories (D10) -------------------------------------------------------

select is(
  (select file_size_limit from storage.buckets where id = 'photos'),
  1572864::bigint,
  'photos are at most 1.5 MB'
);

insert into private.photo_uploads (user_id, uploaded_at)
select pg_temp.id_of(31), now() - interval '1 hour' from generate_series(1, 40);
select pg_temp.act_as(31);
set local role authenticated;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('photos', pg_temp.id_of(31) || '/photo-41.jpg') $$,
  '42501', null, 'a 41st upload in a day is refused, even with an empty folder'
);
reset role;

select pg_temp.act_as(26);
select throws_ok(
  $$ select public.create_event('kys', 'Coffee', '', 49.9, -97.1, (extract(epoch from now()) * 1000)::bigint) $$,
  '23514', null, 'an event category that isn''t one of the app''s is refused'
);
select lives_ok(
  $$ select public.create_event('🍕', 'Pizza', '', 49.9, -97.1, (extract(epoch from now()) * 1000)::bigint) $$,
  'one of the app''s categories is fine'
);

select * from finish();
rollback;
