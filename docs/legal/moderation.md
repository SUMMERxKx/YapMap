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
| Filter for objectionable words | Server side, on intro, interests, live note, event title and description, and every message (`supabase/migrations/20261022100308_content_moderation.sql`) |
| Report a person, a message or an event | The ··· menu on a profile, an incoming say-hi, a chat and an event, or a long-press on a message in a group chat (`src/components/safety/safety-menu.tsx`, `src/app/(app)/report/[id].tsx`). On an event the menu offers "Report this event" and a report about the host, and a long-press in a group chat offers the message or its sender. The server saves a copy of what was reported with each report (`report_message`, `report_event` and `report_user` in `supabase/migrations/20261119180607_report_context.sql`) |
| Block a person | The same places. Blocking is instant and mutual: neither sees the other, chats and requests between them end |
| Automatic hiding | A profile reported by 3 different people whose reports count and are not reviewed yet is hidden from everyone until reviewed, and everything it is in ends (`private.file_report`, which every report goes through). A report counts when the two really interacted (a chat between them that was accepted or met, or accepted and later ended, a say-hi the reported person sent the reporter, or a message the reported person posted in a group chat both are in) or the reporter's account is at least 3 days old with no open report against it. A say-hi the reporter sent that was never accepted, or only being in the same event, isn't enough. Other reports only go to the queue |
| Keeping banned people out | Suspended people can't sign up again with that email until the ban is lifted or an account with that email is deleted. A person deleting their own account removes their own suspension ban. Only bans with the reason `removed` survive a deletion. Owner removals and bans added by hand use that reason, so they stay until the owner lifts them (`private.banned_identities`, checked by the Before User Created hook, which also refuses throwaway email domains) |
| Remove content and users | The SQL below, run by the owner |

## The word filter

`private.blocked_words` holds about 20 words: unambiguous slurs and explicit abuse aimed at a
person (such as "kys"). Text containing one as a whole word (also with look-alike digits, like `h4te`)
is refused with the message "That has words Yap doesn't allow". It checks the intro, interests,
live note, event text and messages. Names are not checked, and report details are not
filtered, so people can quote what was said to them.

The list is intentionally narrow. It leaves out general swearing and sexual words (adults may
use them in a chat, and sexual content is handled through reports), words people use to
describe harm or ask for help (such as "rape"), and words that are also names or ordinary words
in another language (such as "kike", a Spanish nickname for Enrique), because refusing those
blocks the people the filter is meant to protect. Keep it that way when adding words. Reports and blocking are the
main moderation tool; the filter is only a first line.

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
select r.created_at, r.reason, r.details, r.counts_toward_hide,
       r.about, r.content, r.message_id, r.event_id, r.request_id,
       reporter.first_name || ' ' || reporter.last_name as reporter,
       r.reported as reported_id,
       reported.first_name || ' ' || reported.last_name as reported_name,
       reported.status as reported_status,
       (select count(distinct x.reporter) from public.reports x where x.reported_hash = r.reported_hash) as reporters,
       r.reported_hash
from public.reports r
left join public.profiles reporter on reporter.id = r.reporter
left join public.profiles reported on reported.id = r.reported
where r.reviewed_at is null
order by r.created_at;
```

Reports stay when either person deletes their account: the deleted person's name and id are
empty, and `reported_hash` still groups every report about the same person. `counts_toward_hide`
is false for a report from a new account that never really interacted with the person; three
of those don't hide anyone, so read them with that in mind (they can be a pile-on by throwaway
accounts). Reviewed reports no longer count towards the automatic hide.

`about` says what the report is about, and `content` is a copy of it, saved by the server from
the real rows when the report was filed. It still shows what was reported after the person
edits or deletes it, or deletes their account. The app never sends this text, and the server
only saves it when the reporter could see that message or event.

| `about` | Reported from | `content` holds | Also set |
| --- | --- | --- | --- |
| `message` | Long-press on a message in a group chat, then "This message" | `body`, `sent_at`, `event_title` | `message_id`, `event_id` |
| `event` | "Report this event" in the ··· menu on an event | `emoji`, `title`, `description`, `starts_at`, `created_at` | `event_id` |
| `person` | The ··· menu on a profile, a say-hi, a chat or an event (the host), or a long-press on a group message, then the sender's name | `first_name`, `last_name`, `intro`, `interests`, `note`, `photo_path`, `photo_paths`, and `chat` (the last 20 messages they sent in it) when the report came from a say-hi or chat | `request_id` for a say-hi or chat |

Photo reports store the path only. A photo the person replaced or deleted may no longer be
viewable. Reports filed before `20261119180607_report_context.sql` was applied
have `about` = `person` and no `content`.

### 2. Look at what the reported person posted

Start with the report's `content` (step 1). The queries below show what the person has now,
which may have changed since the report.

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
  again (this also puts them back in the events they still host, takes their email off the ban
  list unless the ban's reason is `removed`, and marks any report still open as reviewed, so those
  reports can't hide them again):

  ```sql
  update public.reports set reviewed_at = now(), action = 'no action'
  where reported = '<reported_id>' and reviewed_at is null;
  select private.restore_user('<reported_id>');
  ```

  A hidden or suspended person sees an "account on hold" screen with the support email instead
  of the app.

- **Remove one piece of content** (a message or an event) and keep the account. The report's
  `message_id` or `event_id` is the id to use. If nothing is deleted, the person already deleted it:

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
  memberships, puts their email address on the ban list (so they can't sign up again with it while
  the account exists), and marks their reports reviewed. The ban ends if they later delete any
  account with the same email address, like everything else but the reports. To keep them out
  for good, remove them completely instead. To lift it later:
  `select private.restore_user('<reported_id>');`

- **Remove completely** (under 18, threats, illegal content, repeated abuse): suspend first,
  then delete their photos in Storage (the `photos` bucket, their folder), then delete the
  account:

  ```sql
  select private.delete_user('<reported_id>', true);
  ```

  It refuses (`photos not removed`) while any file is left in their folder, and `no such account`
  for an id with no account. It deletes the account the same way as **Delete account** in the app:
  their profile, messages, events, chats, blocks, sign-in flows and upload times. The records of
  when they signed in go within 7 days, as everyone's do (`private.prune_audit_log`, run daily). The `true`
  keeps their email address on the ban list with the reason `removed`, replacing the suspension
  ban. A `removed` ban stays even if they later delete another account with the same address, so
  they can't sign up again with it. The reports about them stay too, without the account linked,
  as the record of why. Don't delete the user in **Authentication → Users**: that skips the photo
  check and leaves sign-in flows behind.

  To ban an address by hand, use the reason `removed`, so deleting an account doesn't lift it.
  Any other reason is lifted when an account with that address is deleted. Bans from before
  November 2026 were tidied once: bans whose reason starts with `deleted while`, kept from deleting
  a hidden or suspended account, were deleted, and every other ban was left as it is. Any ban from
  before then that should be permanent (an earlier owner removal or a ban added by hand) must be
  relabelled `removed` by hand with the update below. To lift a `removed` ban, delete the row:

  ```sql
  -- ban an address by hand
  insert into private.banned_identities (email_hash, reason)
  values (private.email_hash('<email address>'), 'removed');
  -- make a ban from before November 2026 permanent
  update private.banned_identities set reason = 'removed'
  where email_hash = private.email_hash('<email address>');
  -- lift a ban
  delete from private.banned_identities where email_hash = private.email_hash('<email address>');
  ```

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

An email asking to delete an account ("Delete my account") is handled within 30 days. Check it
came from the address the account signed up with, then find the account and delete it the same
way as **Delete account** in the app: delete the files in Storage (the `photos` bucket, the folder
named after the id), then run `private.delete_user` without `true`, which also lifts a suspension
ban on the address but not a `removed` one. Reply to say it's done.

```sql
select id from auth.users where email = '<their email address>';
select private.delete_user('<id>');
```

## Removing a beta tester

Within 30 days of a tester asking to be removed, or telling us they left the beta, remove their
email address from both tester lists. In App Store Connect, open the app, then **TestFlight**,
find the tester and remove them. In Play Console, open the closed test, then **Testers**, and take
the address off the email list or the Google Group.
