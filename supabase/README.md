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

## 3. Regenerate the app's types

```bash
supabase gen types typescript --local > src/data/database.types.ts
```

Then `npx tsc --noEmit` and `npm run lint`, and open a PR with the migration and the types.

## 4. Apply it to the hosted project

```bash
supabase link --project-ref qiyipqpigacsljfdclql   # once per checkout
supabase db push                                   # applies migrations the hosted project doesn't have yet
```

`db push` asks for the database password (or reads `SUPABASE_DB_PASSWORD`). Where that
password is kept is the owner's decision; never commit it.

So far migrations have been applied with the Supabase MCP `apply_migration` tool, which
records each one under the time it ran rather than the file's timestamp. If you use it,
rename the file to the version it recorded (`list_migrations` shows it) so the repo and the
hosted history stay identical. `supabase db push` keeps the file's own version, so no
rename is needed.

Never run `supabase config push`: the hosted auth and email settings live in the dashboard
(see the main README), not in `config.toml`.
