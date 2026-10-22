-- Content moderation for the app stores (App Store guideline 1.2, Google Play's
-- user-generated content policy): a simple filter for objectionable words, and
-- private.suspend_user for acting on reports (see the end of this file).
--
-- Text that other people see is refused when it contains a word from private.blocked_words:
-- the profile intro and interests, the live note, event titles and descriptions, and chat and
-- group messages. The refusal is 'objectionable text', which the app shows as a sentence
-- (SERVER_REFUSALS in src/data/api.ts). Names are not filtered, since a real name can match a
-- listed word, and report details are not filtered, so people can quote what was said to them.
--
-- How a word is matched: the text is lowercased and split into words at anything that isn't
-- a letter or digit, and each word is compared with the list exactly. The same is done once
-- more with common look-alike characters swapped back (0 -> o, 1 -> i, 3 -> e, 4 -> a,
-- 5 -> s, 7 -> t, @ -> a, $ -> s), so "h4te" is checked as "hate". Whole words only, so a
-- longer word that merely contains a listed one is never refused.
--
-- It is deliberately narrow: only unambiguous slurs and explicit abuse, never words people use
-- to describe harm or ask for help, or that are also names or ordinary words in another
-- language. It is a first line, not the moderation itself: reports and blocks
-- (docs/legal/moderation.md) handle everything a word list can't. The list is a table,
-- so the owner can change it without a migration:
--
--   insert into private.blocked_words (word) values ('newword');
--   delete from private.blocked_words where word = 'oldword';
--
-- Rows that already exist are not checked again; only new text and edits are.

create table private.blocked_words (
  word text primary key check (word ~ '^[a-z0-9]+$')
);

comment on table private.blocked_words is
  'Words refused in user text that others see. Lowercase letters and digits only, one word per row.';

-- Only the functions below read it (as the owner). RLS with no policy denies everyone else.
alter table private.blocked_words enable row level security;
revoke all on private.blocked_words from public, anon, authenticated;

insert into private.blocked_words (word) values
  -- slurs
  ('faggot'), ('faggots'), ('gook'), ('gooks'), ('nigga'), ('niggas'), ('nigger'),
  ('niggers'), ('raghead'), ('ragheads'), ('spic'), ('spics'), ('tranny'), ('trannies'),
  ('wetback'), ('wetbacks'),
  -- sexual
  ('blowjob'), ('blowjobs'), ('cumshot'), ('handjob'), ('porn'), ('porno'), ('slut'),
  ('sluts'), ('whore'), ('whores'),
  -- the strongest swearing and abuse
  ('cunt'), ('cunts'), ('fuck'), ('fucked'), ('fucker'), ('fuckers'), ('fucking'),
  ('fucks'), ('motherfucker'), ('kys');

-- True when the text contains a listed word, matched as described at the top.
create function private.has_blocked_word(input text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from unnest(array[
      lower(coalesce(input, '')),
      translate(lower(coalesce(input, '')), '013457@$', 'oieastas')
    ]) as variant (lowered)
    cross join lateral regexp_split_to_table(variant.lowered, '[^[:alnum:]]+') as word (token)
    join private.blocked_words b on b.word = word.token
  );
$$;

revoke execute on function private.has_blocked_word (text) from public, anon, authenticated;

-- Trigger: refuses the row when any of the columns named in the trigger's arguments holds a
-- listed word. A text[] column (interests) is checked as its JSON text, which splits the same way.
create function private.refuse_blocked_words()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(new);
  column_name text;
begin
  foreach column_name in array tg_argv loop
    if private.has_blocked_word(row_data ->> column_name) then
      raise exception 'objectionable text';
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function private.refuse_blocked_words () from public, anon, authenticated;

-- Profile text is written by the app directly (row-level security limits it to your own row),
-- so the check runs on the table rather than in a function.
create trigger profiles_word_filter
  before insert or update of intro, interests on public.profiles
  for each row execute function private.refuse_blocked_words('intro', 'interests');

create trigger availability_word_filter
  before insert or update of note on public.availability
  for each row execute function private.refuse_blocked_words('note');

create trigger events_word_filter
  before insert or update of title, description on public.events
  for each row execute function private.refuse_blocked_words('title', 'description');

create trigger messages_word_filter
  before insert or update of body on public.messages
  for each row execute function private.refuse_blocked_words('body');

-- moderation --------------------------------------------------------------------------

-- Suspends someone after a report review (docs/legal/moderation.md). Run it from the SQL
-- editor; it is not callable from the app. A suspended person can't go live, say hi, join or
-- post events (those functions require status 'active') and nobody sees their profile, photos
-- or events. This also ends what they are in right now: their live session, waiting requests
-- and chats (the other person goes back on nearby lists, as when a chat ends), and their event
-- memberships, so they can't post in group chats either. Their open reports are marked
-- reviewed with `note` as the action. To undo it, set their status back to 'active'.
create function private.suspend_user(target uuid, note text default 'suspended')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'no such profile';
  end if;

  update public.profiles set status = 'suspended' where id = target;

  update public.availability a set state = 'open'
  from public.chat_requests r
  where r.status = 'accepted' and target in (r.from_user, r.to_user)
    and a.user_id = case when r.from_user = target then r.to_user else r.from_user end
    and a.state = 'chatting';
  update public.chat_requests set status = 'cancelled', ended_at = now()
  where status in ('pending', 'accepted') and target in (from_user, to_user);

  delete from public.availability where user_id = target;
  delete from public.event_members where user_id = target;

  update public.reports set reviewed_at = now(), action = note
  where reported = target and reviewed_at is null;
end;
$$;

revoke execute on function private.suspend_user (uuid, text) from public, anon, authenticated;
