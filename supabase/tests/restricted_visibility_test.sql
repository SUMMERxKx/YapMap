-- Checks for 20261119120000_restricted_visibility.sql: a person who is hidden or suspended
-- can't be looked at by the people they met, in either direction of the say-hi, and is seen
-- again once restored. Run against the local stack:
--
--   supabase start
--   supabase test db
--
-- Everything happens inside one transaction that is rolled back, so nothing is left behind.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(34);

-- 1 is hidden: 2 said hi to 1 and 1 said hi to 3, and both pairs met. 4 is suspended: 5 said
-- hi to 4 and 4 said hi to 6, and both pairs met. Everyone has a profile picture (and its small
-- copy) and one gallery photo.
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000004' || lpad(n::text, 2, '0'))::uuid, 'restricted' || n || '@example.test'
from generate_series(1, 6) as n;

insert into public.profiles (id, first_name, last_name, gender, intro, interests, is_adult, photo_path, photo_paths)
select id, 'Person', 'Tester', 'prefer-not', 'Here to test.', array['Coffee', 'Books', 'Music'], true,
  id || '/profile-1.jpg', array[id || '/gallery-1.jpg']
from auth.users where email like 'restricted%@example.test';

insert into storage.objects (bucket_id, name)
select 'photos', u.id || f.name
from auth.users u
cross join (values ('/profile-1.jpg'), ('/profile-1-small.jpg'), ('/gallery-1.jpg')) as f (name)
where u.email like 'restricted%@example.test';

-- auth.uid() reads this setting, so it decides who is calling.
create function pg_temp.act_as(person int) returns void
language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000004' || lpad(person::text, 2, '0'), true);
$$;

create function pg_temp.id_of(person int) returns uuid
language sql as $$
  select ('00000000-0000-0000-0000-0000000004' || lpad(person::text, 2, '0'))::uuid;
$$;

create temp table requests (name text primary key, id uuid not null);
with made as (
  insert into public.chat_requests (from_user, to_user, status, responded_at)
  values
    (pg_temp.id_of(2), pg_temp.id_of(1), 'met', now()),
    (pg_temp.id_of(1), pg_temp.id_of(3), 'met', now()),
    (pg_temp.id_of(5), pg_temp.id_of(4), 'met', now()),
    (pg_temp.id_of(4), pg_temp.id_of(6), 'met', now())
  returning id, from_user, to_user
)
insert into requests (name, id)
select right(from_user::text, 1) || ' to ' || right(to_user::text, 1), id from made;

-- The card `viewer` gets for a request, as the app asks for it.
create function pg_temp.card_for(viewer int, request text) returns uuid
language plpgsql as $$
begin
  perform pg_temp.act_as(viewer);
  return (public.request_person((select id from requests where name = request)) ->> 'id')::uuid;
end;
$$;

-- How many of `person`'s photo files `viewer` may read through the storage policy, which is what
-- signing a URL needs: 3 is the profile picture, its small copy and the gallery photo.
create function pg_temp.photos_seen(viewer int, person int) returns int
language plpgsql as $$
declare
  seen int;
begin
  perform pg_temp.act_as(viewer);
  set local role authenticated;
  select count(*) into seen from storage.objects
  where bucket_id = 'photos' and name like pg_temp.id_of(person) || '/%';
  reset role;
  return seen;
end;
$$;

-- Hidden after reports, as report_user does it ------------------------------------------------

select is(pg_temp.card_for(2, '2 to 1'), pg_temp.id_of(1), 'before the hide, the sender sees the card of the person they met');
select is(pg_temp.card_for(3, '1 to 3'), pg_temp.id_of(1), 'before the hide, the recipient sees the card of the person they met');
select is(pg_temp.photos_seen(2, 1), 3, 'before the hide, the sender may load all their photos');
select is(pg_temp.photos_seen(3, 1), 3, 'before the hide, the recipient may load all their photos');

update public.profiles set status = 'hidden' where id = pg_temp.id_of(1);
select private.end_activity(pg_temp.id_of(1));

select is(
  (select count(*) from public.chat_requests where status = 'met' and pg_temp.id_of(1) in (from_user, to_user))::int,
  2,
  'hiding someone keeps their meetings'
);
select is(pg_temp.card_for(2, '2 to 1'), null, 'a hidden person''s card is gone for someone who said hi to them');
select is(pg_temp.card_for(3, '1 to 3'), null, 'and for someone they said hi to');
select is(pg_temp.photos_seen(2, 1), 0, 'a hidden person''s photos can''t be loaded by someone who said hi to them');
select is(pg_temp.photos_seen(3, 1), 0, 'or by someone they said hi to');
select pg_temp.act_as(2);
select ok(
  not private.can_see_photo(pg_temp.id_of(1) || '/profile-1.jpg')
    and not private.can_see_photo(pg_temp.id_of(1) || '/profile-1-small.jpg')
    and not private.can_see_photo(pg_temp.id_of(1) || '/gallery-1.jpg'),
  'not the profile picture, its small copy or the gallery'
);
select is(pg_temp.photos_seen(1, 1), 3, 'a hidden person can still load their own photos');
select is(pg_temp.card_for(1, '1 to 3'), null, 'a hidden person gets no card of someone they met');
select is(pg_temp.photos_seen(1, 3), 0, 'or their photos');

select private.restore_user(pg_temp.id_of(1));

select is(pg_temp.card_for(2, '2 to 1'), pg_temp.id_of(1), 'after a restore, the sender sees the card again');
select is(pg_temp.card_for(3, '1 to 3'), pg_temp.id_of(1), 'and so does the recipient');
select is(pg_temp.photos_seen(2, 1), 3, 'after a restore, the sender may load the photos again');
select is(pg_temp.photos_seen(3, 1), 3, 'and so may the recipient');

-- Suspended by a moderator ----------------------------------------------------------------------

select is(pg_temp.card_for(5, '5 to 4'), pg_temp.id_of(4), 'before the suspension, the sender sees the card of the person they met');
select is(pg_temp.card_for(6, '4 to 6'), pg_temp.id_of(4), 'before the suspension, the recipient sees the card of the person they met');
select is(pg_temp.photos_seen(5, 4), 3, 'before the suspension, the sender may load all their photos');
select is(pg_temp.photos_seen(6, 4), 3, 'before the suspension, the recipient may load all their photos');

select private.suspend_user(pg_temp.id_of(4), 'test');

select is(
  (select count(*) from public.chat_requests where status = 'met' and pg_temp.id_of(4) in (from_user, to_user))::int,
  2,
  'suspending someone keeps their meetings'
);
select is(pg_temp.card_for(5, '5 to 4'), null, 'a suspended person''s card is gone for someone who said hi to them');
select is(pg_temp.card_for(6, '4 to 6'), null, 'and for someone they said hi to');
select is(pg_temp.photos_seen(5, 4), 0, 'a suspended person''s photos can''t be loaded by someone who said hi to them');
select is(pg_temp.photos_seen(6, 4), 0, 'or by someone they said hi to');
select pg_temp.act_as(6);
select ok(
  not private.can_see_photo(pg_temp.id_of(4) || '/profile-1.jpg')
    and not private.can_see_photo(pg_temp.id_of(4) || '/profile-1-small.jpg')
    and not private.can_see_photo(pg_temp.id_of(4) || '/gallery-1.jpg'),
  'not the profile picture, its small copy or the gallery'
);
select is(pg_temp.photos_seen(4, 4), 3, 'a suspended person can still load their own photos');
select is(pg_temp.card_for(4, '5 to 4'), null, 'a suspended person gets no card of someone they met');
select is(pg_temp.photos_seen(4, 5), 0, 'or their photos');

select private.restore_user(pg_temp.id_of(4));

select is(pg_temp.card_for(5, '5 to 4'), pg_temp.id_of(4), 'after a restore, the sender sees the card again');
select is(pg_temp.card_for(6, '4 to 6'), pg_temp.id_of(4), 'and so does the recipient');
select is(pg_temp.photos_seen(5, 4), 3, 'after a restore, the sender may load the photos again');
select is(pg_temp.photos_seen(6, 4), 3, 'and so may the recipient');

select * from finish();
rollback;
