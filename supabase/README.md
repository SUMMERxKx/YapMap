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
(typed text, double say-hi, reports, the event limit, photo uploads). Each file runs in a
transaction that is rolled back. `parallel_limits_test.sql` also sends calls at the same moment
from separate connections (dblink) to show the daily event and report limits hold; the people it
signs up there are saved for real, so it deletes them at its start and end. CI doesn't run these
checks yet, so run them after changing those rules.

The 24-files-per-person photo limit is best-effort: the storage policy counts the folder, and
uploads sent at the same moment can't see each other, so together they can go a little past it.
Each file is still at most 5 MB and only in the person's own folder. The event and report limits
are exact, because `create_event` and `report_user` take a per-person lock before counting.

## 3. Regenerate the app's types

```bash
npm run db:types     # writes src/data/database.types.ts from the local database
```

Use the same Supabase CLI version as CI (see `docs/RELEASING.md`), or the generated file can
come out formatted differently. Then `npm run typecheck` and `npm run lint`, and open a PR with
the migration and the types. CI rebuilds the database from every migration, lints the SQL
functions and fails if the types file doesn't match.

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
SQL editor first (for example `20261022083815_break_it_hardening.sql`). Every count it returns
must be 0; otherwise the push fails on the existing rows (and changes nothing) until they are fixed.

So far migrations have been applied with the Supabase MCP `apply_migration` tool, which
records each one under the time it ran rather than the file's timestamp. If you use it,
rename the file to the version it recorded (`list_migrations` shows it) so the repo and the
hosted history stay identical. `supabase db push` keeps the file's own version, so no
rename is needed.

Never run `supabase config push`: the hosted auth and email settings live in the dashboard
(see the main README), not in `config.toml`.

## Moderation tools

`20261022082408_content_moderation.sql` adds two things the app stores require, both used from
the SQL editor rather than the app: the banned-word list `private.blocked_words` (a short list
of slurs and abuse; intros, interests, notes, event text and messages are refused when they
contain one, names are not) and `private.suspend_user(id, note)` for acting on a report.
[`docs/legal/moderation.md`](../docs/legal/moderation.md) has the daily review queries. The
word list is data, so changing it needs no migration.
