# How to change the database

If you know Prisma: `supabase/migrations/` is the `prisma/migrations` folder, but each
migration is plain SQL you write yourself, and there is no `schema.prisma`. The steps
below are the `prisma migrate dev` / `prisma migrate deploy` loop.

You need Docker and a current Supabase CLI (the local database is Postgres 17, like the
hosted one; very old CLIs can't run it).

## 1. Create a migration

```bash
supabase migration new add_something   # creates supabase/migrations/<timestamp>_add_something.sql
```

Write the SQL in that file. Never edit a migration that has already been applied to the
hosted project; add a new one instead.

## 2. Try it locally

```bash
supabase start        # first time: starts the local stack and applies every migration
supabase db reset     # after each edit: rebuilds the local database from all migrations
```

Studio is at http://127.0.0.1:54323. Emails (8-digit codes) are not sent; read them at
http://127.0.0.1:54324. `supabase/config.toml` configures only this local stack.

```bash
supabase test db      # runs the pgTAP checks in supabase/tests against the local database
```

`supabase/tests/` holds SQL checks for server rules a modified app could otherwise get around
(typed text, double say-hi, reports, the event limit, photo uploads, and in `safety_test.sql`
the nearby cells, report trust, restricted accounts, the sign-up hook and the event position, and
in `restricted_visibility_test.sql` the cards and photos of hidden or suspended people). Each file runs in a
transaction that is rolled back. `parallel_limits_test.sql` also sends calls at the same moment
from separate connections (dblink) to show the daily event and report limits hold; the people it
signs up there are saved for real, so it deletes them at its start and end. They are one of the checks in `docs/RELEASING.md`), so run them yourself after changing those rules.

The photo limits (16 files in a person's folder, 40 uploads a day) are best-effort: the storage
policy counts them, and uploads sent at the same moment can't see each other, so together they
can go a little past. Each file is still at most 1.5 MB and only in the person's own folder. The
event, report, location-change and lookup limits (`nearby` 12 and `events_near` 20 a minute) are
exact, because those functions take a per-person lock or row before counting.

`supabase/config.toml` switches on the Before User Created auth hook
(`public.before_user_created`) for the local stack, so local sign-ups are checked against the
ban list, the throwaway-domain list and the 20-a-day limit per IP address like hosted ones.

## 3. Regenerate the app's types

```bash
npm run db:types     # writes src/data/database.types.ts from the local database
```

Use Supabase CLI 2.121.0, the version the checks in `docs/RELEASING.md` use, or the generated file
can come out formatted differently. Then `npm run typecheck` and `npm run lint`, and open a PR with
the migration and the types. The database checks in `docs/RELEASING.md` rebuild the database from
every migration, lint the SQL functions and fail if the types file doesn't match.

## 4. Apply it to the hosted project

After the PR is merged, from an up-to-date `main`:

```bash
supabase link --project-ref qiyipqpigacsljfdclql   # once per checkout
supabase db push --dry-run                         # lists what would be applied
supabase db push                                   # applies migrations the hosted project doesn't have yet
```

`db push` asks for the database password (or reads `SUPABASE_DB_PASSWORD`). Where that
password is kept is the owner's decision; never commit it.

A migration that adds check constraints says so at the top, with a read-only query to run in the
SQL editor first (for example `20261022103744_break_it_hardening.sql`). Every count it returns
must be 0; otherwise the push fails on the existing rows (and changes nothing) until they are fixed.

So far migrations have been applied with the Supabase MCP `apply_migration` tool, which
records each one under the time it ran rather than the file's timestamp. If you use it,
rename the file to the version it recorded (`list_migrations` shows it) so the repo and the
hosted history stay identical. Rename it with `git mv` and change nothing inside: the
Migration files check (`npm run db:check-migrations`) accepts a rename only when the contents are
byte-for-byte the same. `supabase db push` keeps the file's own version, so no rename is needed.

Some migrations also need a one-time dashboard step, which the hosted project doesn't get from
`db push`. `20261026180208_safety_fixes.sql` needs **Authentication -> Hooks -> Before User
Created** switched on, as a Postgres function, `public.before_user_created` (see the main
README).

As of October 22, 2026 the hosted project has all eleven migrations, under exactly the
versions the files in `supabase/migrations/` are named with. After linking,
`supabase migration list` shows the same versions in the Local and Remote columns.

Never run `supabase config push`: the hosted auth and email settings live in the dashboard
(see the main README), not in `config.toml`.

## Moderation tools

`20261022100308_content_moderation.sql` adds two things the app stores require, both used from
the SQL editor rather than the app: the banned-word list `private.blocked_words` (a short list
of slurs and abuse; intros, interests, notes, event text and messages are refused when they
contain one, names are not) and `private.suspend_user(id, note)` for acting on a report.
[`docs/legal/moderation.md`](../docs/legal/moderation.md) has the daily review queries. The
word list is data, so changing it needs no migration.

`20261026180208_safety_fixes.sql` adds the rest of the moderation tools:

- `private.suspend_user` also puts the person's email address on `private.banned_identities`
  (as a hash of the normalised address), and so does deleting an account while it is hidden or
  suspended. `private.restore_user(id)` makes an account active again, takes it off the list and
  marks its open reports reviewed.
- `private.disposable_email_domains` (loaded by `20261026180218_disposable_email_domains.sql`
  from the public-domain disposable-email-domains list) holds the throwaway domains the sign-up
  hook refuses. Both tables are data, so adding or removing a row needs no migration.
- Reports are kept when either person deletes their account (`reporter` or `reported` becomes
  null; `reported_hash` still ties together the reports about one person), and
  `counts_toward_hide` says whether a report counted towards the automatic hide.
