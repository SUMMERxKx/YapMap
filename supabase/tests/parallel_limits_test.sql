-- Checks that calls sent at the same moment by one person can't get past the daily limits in
-- create_event and report_user (20261022103744_break_it_hardening.sql). Run against the local
-- stack:
--
--   supabase start
--   supabase test db
--
-- The calls have to run in separate sessions at once, so this file opens its own connections
-- with dblink, and the people it signs up there are saved for real. It deletes them at the
-- start and at the end. Each call keeps its transaction open for a moment after it returns, so
-- without the per-person lock every call would count before any of them had saved anything.

begin;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set local search_path = public, extensions;
set local client_min_messages = warning;

select plan(3);

create function pg_temp.id_of(person int) returns uuid
language sql as $$
  select ('00000000-0000-0000-0000-0000000001' || lpad(person::text, 2, '0'))::uuid;
$$;

-- The local stack's database at the address this session reached it on: dblink needs a
-- connection that asks for the password, and the database trusts its own loopback without one.
create function pg_temp.database() returns text
language sql as $$
  select format('host=%s dbname=%s user=postgres password=postgres', host(inet_server_addr()), current_database());
$$;

-- Sends every call at once, each in its own session signed in as `person`, and waits for all
-- of them. A refused call just counts for nothing.
create function pg_temp.call_together(person int, calls text[]) returns void
language plpgsql as $$
begin
  for i in 1 .. cardinality(calls) loop
    perform dblink_connect('call' || i, pg_temp.database());
    perform dblink_exec('call' || i, format('set request.jwt.claim.sub = %L', pg_temp.id_of(person)));
    perform dblink_exec('call' || i, 'set role authenticated');
  end loop;
  for i in 1 .. cardinality(calls) loop
    perform dblink_send_query('call' || i, format('select (%s)::text, pg_sleep(0.2)::text', calls[i]));
  end loop;
  for i in 1 .. cardinality(calls) loop
    perform * from dblink_get_result('call' || i, false) as t(answer text, slept text);
    perform * from dblink_get_result('call' || i, false) as t(answer text, slept text);
    perform dblink_disconnect('call' || i);
  end loop;
end;
$$;

-- Fourteen people: 0 posts events and reports 1 to 12, 13 reports 1 over and over.
select dblink_connect('setup', pg_temp.database());
select dblink_exec('setup', $$
  delete from auth.users where email like 'parallel%@example.test';
  insert into auth.users (id, email)
  select ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid, 'parallel' || n || '@example.test'
  from generate_series(0, 13) as n;
  insert into public.profiles (id, first_name, last_name, gender, intro, interests, is_adult)
  select id, 'Person', 'Tester', 'prefer-not', 'Here to test.', array['Coffee', 'Books', 'Music'], true
  from auth.users where email like 'parallel%@example.test';
$$);

select pg_temp.call_together(0, array(
  select format('public.create_event(%L, %L, %L, 49.9, -97.1, %s)',
    '☕', 'Coffee ' || n, '', (extract(epoch from now()) * 1000)::bigint)
  from generate_series(1, 10) as n
));
select is(
  (select count(*) from public.events where host = pg_temp.id_of(0))::int,
  5,
  'ten events posted at once make five, the daily limit'
);

select pg_temp.call_together(0, array(
  select format('public.report_user(%L, %L)', pg_temp.id_of(n), 'other')
  from generate_series(1, 12) as n
));
select is(
  (select count(*) from public.reports where reporter = pg_temp.id_of(0))::int,
  10,
  'twelve people reported at once make ten reports, the daily limit'
);

select pg_temp.call_together(13, array(
  select format('public.report_user(%L, %L)', pg_temp.id_of(1), 'spam-or-fake')
  from generate_series(1, 5)
));
select is(
  (select count(*) from public.reports where reporter = pg_temp.id_of(13))::int,
  1,
  'reporting the same person five times at once files one report'
);

select dblink_exec('setup', $$ delete from auth.users where email like 'parallel%@example.test' $$);
select dblink_disconnect('setup');

select * from finish();
rollback;
