# Moderation: how reports are handled

Apple (App Store Review Guideline 1.2) and Google Play (User Generated Content policy) require
an app where people post content and meet each other to have: a way to filter objectionable
content, a way to report it, a way to block abusive users, and a developer who acts on reports
**within 24 hours**. This is how Yap does each, and the owner's daily routine.

## What is in the app

| Requirement | Where |
| --- | --- |
| Terms with zero tolerance for objectionable content, agreed before use | Sign-up screen ("By creating an account, you agree to..."), `docs/legal/terms-of-service.md` section 2 |
| Community guidelines | Settings → Community guidelines, and the sign-up screen (`src/app/guidelines.tsx`) |
| Filter for objectionable words | Server side, on names, intro, interests, live note, event title and description, and every message (`supabase/migrations/20261022082408_content_moderation.sql`) |
| Report a person | The ··· menu on a profile, an incoming say-hi, a chat and an event; long-press a message in a group chat (`src/components/safety/safety-menu.tsx`, `src/app/(app)/report/[id].tsx`) |
| Block a person | The same places. Blocking is instant and mutual: neither sees the other, chats and requests between them end |
| Automatic hiding | A profile reported by 3 different people is hidden from everyone until reviewed (`report_user`) |
| Remove content and users | The SQL below, run by the owner |

## The word filter

`private.blocked_words` holds about 50 words: slurs, sexual terms and the strongest abuse. Text
containing one as a whole word (also with look-alike digits, like `h4te`) is refused with the
message "That has words Yap doesn't allow". Report details are not filtered, so people can
quote what was said to them. It is a first line only; reports catch the rest.

Change the list in the Supabase SQL editor (no migration or app update needed):

```sql
insert into private.blocked_words (word) values ('newword');   -- lowercase letters/digits only
delete from private.blocked_words where word = 'oldword';
select word from private.blocked_words order by word;
```

## Daily routine (at least once every 24 hours)

Open the Supabase dashboard → SQL editor for the hosted project.

### 1. See open reports

```sql
select r.created_at, r.reason, r.details,
       reporter.first_name || ' ' || reporter.last_name as reporter,
       reported.id as reported_id,
       reported.first_name || ' ' || reported.last_name as reported_name,
       reported.status as reported_status,
       (select count(distinct x.reporter) from public.reports x where x.reported = r.reported) as reporters
from public.reports r
join public.profiles reporter on reporter.id = r.reporter
join public.profiles reported on reported.id = r.reported
where r.reviewed_at is null
order by r.created_at;
```

### 2. Look at what the reported person posted

```sql
-- their profile
select first_name, last_name, intro, interests, photo_path, photo_paths, status, created_at
from public.profiles where id = '<reported_id>';

-- their latest messages (1:1 and group)
select created_at, request_id, event_id, body
from public.messages where sender = '<reported_id>'
order by created_at desc limit 100;

-- their events
select id, title, description, starts_at from public.events where host = '<reported_id>';
```

Photos are in Storage → `photos` → the folder named after their id.

### 3. Act

Pick one, and always finish with step 4.

- **Nothing wrong:** mark the reports reviewed. If they were hidden after 3 reports, show them
  again:

  ```sql
  update public.reports set reviewed_at = now(), action = 'no action'
  where reported = '<reported_id>' and reviewed_at is null;
  update public.profiles set status = 'active' where id = '<reported_id>' and status = 'hidden';
  ```

- **Remove one piece of content** (a message or an event) and keep the account:

  ```sql
  delete from public.messages where id = '<message_id>';
  delete from public.events where id = '<event_id>';   -- its members and group chat go too
  update public.reports set reviewed_at = now(), action = 'content removed'
  where reported = '<reported_id>' and reviewed_at is null;
  ```

  A photo: delete the file in Storage, then `update public.profiles set photo_paths =
  array_remove(photo_paths, '<path>') where id = '<reported_id>';` (for the profile picture,
  suspend instead: a profile can't be saved without one).

- **Suspend** (breaking the guidelines, harassment, a fake account):

  ```sql
  select private.suspend_user('<reported_id>', 'suspended: <short reason>');
  ```

  This hides them from everyone, ends their live session, requests, chats and event
  memberships, and marks their reports reviewed. To lift it later:
  `update public.profiles set status = 'active' where id = '<reported_id>';`

- **Remove completely** (under 18, threats, illegal content, repeated abuse): suspend first,
  then delete their photos in Storage (the `photos` bucket, their folder), then delete the user
  in **Authentication → Users**. Deleting the user removes their profile, messages, events,
  chats, blocks and reports.

  Report anyone who seems to be under 18 and any threat to someone's safety or illegal content
  to the police where appropriate. Sexual content involving a minor must be reported (in Canada,
  to Cybertip.ca) and must not be kept or shared.

### 4. Write it down

Every report you act on should end with `reviewed_at` set and a short `action`. The query in
step 1 then only shows what is still open.

## If someone emails

Emails to **support@samarxkx.dev** about safety are handled the same way, within 24 hours. Ask
for the person's first name and roughly when and where they met, and look them up in
`public.profiles`.
