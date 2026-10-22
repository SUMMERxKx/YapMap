## What and why

<!-- What does this change, and why is it needed? Link the issue if there is one. -->

## How it was tested

<!-- Commands run, devices or simulators tried, and what you saw. CI covers types, lint,
expo-doctor, the iOS/Android bundles and the database; say what you checked by hand. -->

- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] Tried on a phone or simulator (say which)

## Database

- [ ] No database change
- [ ] Adds a migration in `supabase/migrations/` (never edits an existing one), and
      `src/data/database.types.ts` was regenerated with `npm run db:types`
- [ ] After merge, the migration must be applied to the hosted project (docs/RELEASING.md)

## Screenshots

<!-- For UI changes: before and after, light and dark mode if it matters. Delete if none. -->
