-- Checks for 20261119180607_report_context.sql: a report keeps the message, event or profile it
-- is about, copied by the server, and only for content the reporter can see. Run against the
-- local stack:
--
--   supabase start
--   supabase test db
--
-- Everything happens inside one transaction that is rolled back, so nothing is left behind.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(37);

-- 1 hosts an event in Winnipeg, where 2 posts a message and 3 is a member. 4 is in no event and
-- has no position. 5 is near the event, 6 is far from it. 7 and 8 are in a 1:1 chat. 9 is a
-- stranger to everyone.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000005' || lpad(n::text, 2, '0'))::uuid, 'context' || n || '@example.test'
from generate_series(1, 9) as n;

insert into public.profiles (id, first_name, last_name, gender, intro, interests, is_adult)
select id, 'Person', 'Tester', 'prefer-not', 'Here to test.', array['Coffee', 'Books', 'Music'], true
from auth.users where email like 'context%@example.test';

-- auth.uid() reads this setting, so it decides who is calling.
create function pg_temp.act_as(person int) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000005' || lpad(person::text, 2, '0'), true);
$$;

create function pg_temp.id_of(person int) returns uuid
language sql as $$
  select ('00000000-0000-0000-0000-0000000005' || lpad(person::text, 2, '0'))::uuid;
$$;

create function pg_temp.place(lat double precision, lng double precision) returns extensions.geography
language sql as $$
  select extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;
$$;

insert into public.events (id, host, title, description, location, starts_at)
values ('00000000-0000-0000-0000-000000000e01', pg_temp.id_of(1), 'Board games', 'Bring a game.',
        pg_temp.place(49.8951, -97.1384), now() + interval '1 hour');
insert into public.event_members (event_id, user_id)
values ('00000000-0000-0000-0000-000000000e01', pg_temp.id_of(1)),
       ('00000000-0000-0000-0000-000000000e01', pg_temp.id_of(2)),
       ('00000000-0000-0000-0000-000000000e01', pg_temp.id_of(3));
insert into public.messages (id, event_id, sender, body)
values ('00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000e01', pg_temp.id_of(2), 'Something nasty');

insert into private.last_positions (user_id, location)
values (pg_temp.id_of(5), pg_temp.place(49.90, -97.14)),   -- about 1 km away
       (pg_temp.id_of(6), pg_temp.place(43.65, -79.38));   -- Toronto

insert into public.chat_requests (id, from_user, to_user, status, responded_at)
values ('00000000-0000-0000-0000-000000000c01', pg_temp.id_of(7), pg_temp.id_of(8), 'accepted', now());
insert into public.messages (id, request_id, sender, body, created_at)
values ('00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000c01', pg_temp.id_of(8), 'First thing', now() - interval '2 minutes'),
       ('00000000-0000-0000-0000-000000000a03', '00000000-0000-0000-0000-000000000c01', pg_temp.id_of(8), 'Second thing', now() - interval '1 minute'),
       ('00000000-0000-0000-0000-000000000a04', '00000000-0000-0000-0000-000000000c01', pg_temp.id_of(7), 'My own reply', now());

-- A group message ------------------------------------------------------------------------------

select pg_temp.act_as(3);
select lives_ok(
  $$ select public.report_message('00000000-0000-0000-0000-000000000a01', 'harassment', 'Aimed at me') $$,
  'a member of the event can report a message in its group chat'
);
select is(
  (select row(reported, about, message_id, event_id, request_id, details)::text from public.reports where reporter = pg_temp.id_of(3)),
  row(pg_temp.id_of(2), 'message', '00000000-0000-0000-0000-000000000a01'::uuid,
      '00000000-0000-0000-0000-000000000e01'::uuid, null::uuid, 'Aimed at me')::text,
  'the report is about the sender, and keeps the message and event ids'
);
select is(
  (select content from public.reports where reporter = pg_temp.id_of(3)) - 'sent_at',
  '{"body": "Something nasty", "event_title": "Board games"}'::jsonb,
  'the report keeps the message text and the event title, copied by the server'
);
select ok(
  (select (content ->> 'sent_at') is not null from public.reports where reporter = pg_temp.id_of(3)),
  'the report keeps when the message was sent'
);

select public.report_message('00000000-0000-0000-0000-000000000a01', 'harassment', 'Again');
select is(
  (select count(*) from public.reports where reporter = pg_temp.id_of(3))::int,
  1,
  'reporting the same message twice files one report'
);
select public.report_user(pg_temp.id_of(2), 'harassment', '');
select is(
  (select count(*) from public.reports where reporter = pg_temp.id_of(3))::int,
  2,
  'reporting the person as well files a second report, about the person'
);

select pg_temp.act_as(2);
select throws_ok(
  $$ select public.report_message('00000000-0000-0000-0000-000000000a01', 'other', '') $$,
  'cannot report yourself', 'you can''t report your own message'
);

select pg_temp.act_as(4);
select throws_ok(
  $$ select public.report_message('00000000-0000-0000-0000-000000000a01', 'other', '') $$,
  'content not available', 'someone not in the event can''t report its messages'
);
select throws_ok(
  $$ select public.report_message('00000000-0000-0000-0000-00000000dead', 'other', '') $$,
  'content not available', 'a message that doesn''t exist is refused the same way'
);
select is(
  (select count(*) from public.reports where reporter = pg_temp.id_of(4))::int,
  0,
  'a refused report saves nothing'
);

-- An event -------------------------------------------------------------------------------------

select pg_temp.act_as(5);
select lives_ok(
  $$ select public.report_event('00000000-0000-0000-0000-000000000e01', 'unsafe', '') $$,
  'someone the map would show the event to can report it'
);
select is(
  (select row(reported, about, message_id, event_id)::text from public.reports where reporter = pg_temp.id_of(5)),
  row(pg_temp.id_of(1), 'event', null::uuid, '00000000-0000-0000-0000-000000000e01'::uuid)::text,
  'the report is about the host and keeps the event id'
);
select is(
  (select content - 'starts_at' - 'created_at' from public.reports where reporter = pg_temp.id_of(5)),
  '{"emoji": "☕", "title": "Board games", "description": "Bring a game."}'::jsonb,
  'the report keeps the event text, copied by the server'
);

select public.report_user(pg_temp.id_of(1), 'inappropriate-photo', '');
select is(
  (select row(about, event_id, content ->> 'first_name')::text from public.reports
   where reporter = pg_temp.id_of(5) and about = 'person'),
  row('person', null::uuid, 'Person')::text,
  'reporting the host from the event screen files a person report with their profile'
);

select pg_temp.act_as(3);
select lives_ok(
  $$ select public.report_event('00000000-0000-0000-0000-000000000e01', 'other', '') $$,
  'a member of the event can report it'
);

select pg_temp.act_as(4);
select throws_ok(
  $$ select public.report_event('00000000-0000-0000-0000-000000000e01', 'other', '') $$,
  'content not available', 'someone with no position who isn''t in the event can''t report it'
);
select pg_temp.act_as(6);
select throws_ok(
  $$ select public.report_event('00000000-0000-0000-0000-000000000e01', 'other', '') $$,
  'content not available', 'someone too far away to see the event can''t report it'
);
insert into public.blocks (blocker, blocked) values (pg_temp.id_of(1), pg_temp.id_of(5));
select pg_temp.act_as(5);
select throws_ok(
  $$ select public.report_event('00000000-0000-0000-0000-000000000e01', 'spam-or-fake', '') $$,
  'content not available', 'someone the host blocked no longer sees the event and can''t report it'
);
delete from public.blocks where blocker = pg_temp.id_of(1);

-- A person, and a 1:1 chat ---------------------------------------------------------------------

select pg_temp.act_as(7);
select lives_ok(
  $$ select public.report_user(pg_temp.id_of(8), 'harassment', '', '00000000-0000-0000-0000-000000000c01') $$,
  'someone in a chat can report the other person with the chat'
);
select is(
  (select row(about, request_id, message_id, event_id)::text from public.reports where reporter = pg_temp.id_of(7)),
  row('person', '00000000-0000-0000-0000-000000000c01'::uuid, null::uuid, null::uuid)::text,
  'the report keeps the chat'
);
select is(
  (select content - 'chat' from public.reports where reporter = pg_temp.id_of(7)),
  '{"first_name": "Person", "last_name": "Tester", "intro": "Here to test.", "interests": ["Coffee", "Books", "Music"],
    "note": null, "photo_path": null, "photo_paths": []}'::jsonb,
  'the report keeps the person''s profile as it was'
);
select is(
  (select array_agg(m.value ->> 'body' order by m.n) from public.reports r,
     jsonb_array_elements(r.content -> 'chat') with ordinality as m(value, n)
   where r.reporter = pg_temp.id_of(7)),
  array['First thing', 'Second thing'],
  'the report keeps the messages the reported person sent in the chat, oldest first, and not the reporter''s'
);

select throws_ok(
  $$ select public.report_message('00000000-0000-0000-0000-000000000a03', 'harassment', '') $$,
  'content not available', 'a 1:1 chat message is reported with the person and the chat, not on its own'
);

select pg_temp.act_as(9);
select throws_ok(
  $$ select public.report_message('00000000-0000-0000-0000-000000000a02', 'other', '') $$,
  'content not available', 'someone outside a chat can''t report its messages'
);
select public.report_user(pg_temp.id_of(8), 'other', '', '00000000-0000-0000-0000-000000000c01');
select is(
  (select row(request_id, content ? 'chat')::text from public.reports where reporter = pg_temp.id_of(9)),
  row(null::uuid, false)::text,
  'a chat the reporter isn''t in is neither linked nor copied'
);

-- Later edits, deletion and removal ------------------------------------------------------------

update public.profiles set intro = 'Changed my intro.' where id = pg_temp.id_of(8);
update public.messages set body = 'Edited to look harmless' where id = '00000000-0000-0000-0000-000000000a01';
update public.events set title = 'Renamed' where id = '00000000-0000-0000-0000-000000000e01';
select is(
  (select array_agg(x order by x) from (
     select content ->> 'intro' as x from public.reports where reporter = pg_temp.id_of(7) and about = 'person'
     union all
     select content ->> 'body' from public.reports where reporter = pg_temp.id_of(3) and about = 'message'
     union all
     select content ->> 'title' from public.reports where reporter = pg_temp.id_of(5) and about = 'event'
   ) edited),
  array['Board games', 'Here to test.', 'Something nasty'],
  'later changes to the profile, message or event don''t change what the report kept'
);

-- the owner removes the group message, as in docs/legal/moderation.md
delete from public.messages where id = '00000000-0000-0000-0000-000000000a01';
select is(
  (select row(message_id, content ->> 'body')::text from public.reports where reporter = pg_temp.id_of(3) and about = 'message'),
  row('00000000-0000-0000-0000-000000000a01'::uuid, 'Something nasty')::text,
  'a removed message is still in the report, with its id'
);

select pg_temp.act_as(1);
select public.delete_event('00000000-0000-0000-0000-000000000e01');
select is(
  (select count(*) from public.reports
   where event_id = '00000000-0000-0000-0000-000000000e01' and content ->> 'title' = 'Board games')::int,
  2,
  'an event the host deleted is still in the reports about it'
);
select is(
  (select content ->> 'event_title' from public.reports where reporter = pg_temp.id_of(3) and about = 'message'),
  'Board games',
  'a message report still names the deleted event'
);

select private.suspend_user(pg_temp.id_of(8), 'suspended: harassment');
select ok(
  (select bool_and(reviewed_at is not null and content is not null) from public.reports where reported = pg_temp.id_of(8)),
  'suspending someone marks their reports reviewed and keeps what was reported'
);

select pg_temp.act_as(2);
select public.delete_account();
select is(
  (select row(reported, content ->> 'body')::text from public.reports where reporter = pg_temp.id_of(3) and about = 'message'),
  row(null::uuid, 'Something nasty')::text,
  'when the reported person deletes their account, the report keeps what they posted'
);

-- Nobody reads reports through the API -----------------------------------------------------------

select pg_temp.act_as(3);
set local role authenticated;
select is(
  (select count(*) from public.reports)::int,
  0,
  'a signed-in person can''t read any report, their own included'
);
select throws_ok(
  $$ select private.file_report(pg_temp.id_of(3), pg_temp.id_of(1), 'other', '', null, 'person', null, null, '{"body": "made up"}') $$,
  '42501', null, 'the app can''t call the function that files a report with its own copy of the content'
);
reset role;

select has_function('public', 'report_message', array['uuid', 'text', 'text'], 'report_message takes only a message id, a reason and details');
select has_function('public', 'report_event', array['uuid', 'text', 'text'], 'report_event takes only an event id, a reason and details');
select has_function('public', 'report_user', array['uuid', 'text', 'text', 'uuid'], 'report_user keeps the arguments the app already sends');
select ok(
  not has_function_privilege('anon', 'public.report_message(uuid, text, text)', 'execute')
    and not has_function_privilege('anon', 'public.report_event(uuid, text, text)', 'execute'),
  'signed-out callers can''t report content'
);

select * from finish();
rollback;
