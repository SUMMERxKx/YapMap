# Shipping changes

How a code or database change gets from a branch to people's phones, what checks it on the
way, and how to undo it.

## Branch flow

1. Branch from `main` (`feat/...`, `fix/...`, `chore/...`).
2. Open a pull request. The template asks what changed, how it was tested, and whether it
   has a migration.
3. Run the checks (below) locally against the branch and fix any failure before you merge.
4. Squash-merge into `main`, with a title like the existing history
   (`feat(events): let the host delete their event`).
5. If the PR has a migration, apply it to the hosted project (see "Database changes").

Nobody pushes to `main` directly.

## Checks before merging

This repository has no GitHub Actions workflows. Code is reviewed locally, so before you merge a
pull request, run these checks yourself against the branch.

| Check | What it does | Commands |
| --- | --- | --- |
| **App** | `npm ci`, then TypeScript (it generates the Expo Router route types first, so a link to a missing route fails), ESLint (with security rules; warnings fail), `expo-doctor`, and builds the iOS and Android bundles with `expo export`. An `npm audit` report is printed too, but it never fails the run. | `npm ci`, `npm run typecheck`, `npm run lint -- --max-warnings 0`, `npx expo-doctor`, `npx expo export --platform ios --platform android --output-dir dist`, `npm audit --omit=dev --audit-level=high` |
| **Migration files** | New migration files are named `<14-digit version>_<name>.sql` and are later than every migration on `main`; existing migrations were not edited, renamed or deleted. The one exception is a rename that keeps the file byte-for-byte the same, for matching the version the hosted project recorded (`supabase/README.md`, step 4). | `npm run db:check-migrations` |
| **Database** | Starts Supabase in Docker, applies every migration from an empty database, lints the SQL functions in `public` and `private`, runs the pgTAP checks in `supabase/tests`, and checks `src/data/database.types.ts` matches the migrations. | `supabase start -x studio,imgproxy,vector,logflare,supavisor,edge-runtime,realtime,mailpit,postgres-meta`, `supabase db reset`, `supabase db lint --schema public,private --level warning --fail-on error`, `supabase test db`, `npm run db:types:check`, `supabase stop --no-backup` |

Run the database checks with Docker running. Use Supabase CLI **2.121.0** for them and for
`npm run db:types` (`brew upgrade supabase`, or `npx supabase@2.121.0 ...`): a different CLI can
format the generated types differently and the types check would fail.

When the types check fails, the log shows the difference. Run `supabase start` (or
`supabase db reset`), then `npm run db:types`, and commit the updated file.

## Recommended branch protection for `main`

Set these once in **Settings -> Branches -> Add branch ruleset** (or classic branch protection)
for `main`:

- Require a pull request before merging. Approvals: 0 while one person works on the repo
  (GitHub won't let you approve your own PR); raise it to 1 when a second developer joins.
  CODEOWNERS already asks the owner to review every PR.
- Require conversation resolution before merging.
- Block force pushes and deletion of `main`.

Don't add required status checks: there are no GitHub Actions, so GitHub has no checks to wait
for, and a required check that never reports blocks every merge. The checks in "Checks before
merging" are the gate, and they run on your machine.

## Versioning

- **The version people see** is `expo.version` in `app.json` (now `1.0.0`). Raise it for each
  store release: patch (`1.0.1`) for fixes, minor (`1.1.0`) for new features.
- **Build numbers** (iOS `buildNumber`, Android `versionCode`) are kept by EAS, not in the repo:
  `eas.json` sets `"appVersionSource": "remote"`, and production builds use `autoIncrement`, so
  every store build gets a higher number on its own. `eas build:version:get` shows the current
  ones; `eas build:version:set` changes them.

## Building and submitting with EAS

One time, on the owner's machine (needs an Expo account; store submission also needs an Apple
Developer account and a Google Play Console account):

```bash
npm install -g eas-cli
eas login
eas init                      # links the project and adds its ID to app.json; commit that
```

`app.json` sets `ios.bundleIdentifier` and `android.package` to `ca.samarxkx.yapmap`. Change
them before the first store upload if you want something else; after that they can never
change. Android builds also need the Google Maps key (`GOOGLE_MAPS_ANDROID_API_KEY`), and the
stores need the legal pages published first: [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md) has
that one-time setup and the answers for every store form.

Builds (`eas.json` has the profiles):

```bash
eas build --platform ios --profile development  # a development build (expo-dev-client) for the iOS Simulator
eas build --platform all --profile preview      # installable test builds for your own phones
eas build --platform all --profile production   # store builds, build number raised automatically
eas submit --platform ios --latest              # upload the newest iOS build to App Store Connect
eas submit --platform android --latest          # upload the newest Android build to Google Play
```

Build from a clean, up-to-date `main` after the checks in "Checks before merging" pass.

### Before each store build

1. The checks in "Checks before merging" pass on the commit you build from.
2. `version` in `app.json` is raised if this is a new release (see "Versioning").
3. Every migration is applied to the hosted project: after `supabase link`,
   `supabase migration list` shows the same versions in the Local and Remote columns.
4. `npm run licenses` gives no change (or you commit the change), so the Acknowledgements
   screen lists what ships.
5. The privacy policy and terms open in a browser at the addresses in `src/config/links.ts`.
6. The build was tried on a real iPhone and a real Android phone (`--profile preview`).

## Database changes

A database change ships like this:

1. **Migration.** `supabase migration new <name>`, write the SQL, `supabase db reset` to try
   it, then `npm run db:types`. `supabase/README.md` has the details.
2. **Pull request** with the migration and the regenerated types.
3. **Checks** run locally: the database checks apply every migration to an empty database, lint
   the functions and check the types, and the migration files check covers the file name. A
   migration that fails here would also fail on the hosted project.
4. **Merge** into `main`.
5. **Apply to the hosted project**, from an up-to-date `main`:

   ```bash
   supabase link --project-ref qiyipqpigacsljfdclql   # once per checkout
   supabase db push --dry-run                         # lists what would be applied
   supabase db push
   ```

   `supabase migration list` afterwards shows the same versions locally and remotely.

Rules that keep this safe:

- **Never edit a migration that is on `main`.** It may already be applied to the hosted
  database, where editing the file changes nothing. Add a new migration. The migration files
  check (`npm run db:check-migrations`) enforces this.
- **Apply the migration before releasing app code that needs it**, and keep each migration
  working with the app version already on people's phones. Old builds stay installed for
  weeks. To rename or remove a column or function: add the new one, ship an app that uses
  it, and drop the old one in a later migration.
- **A migration that adds check constraints can pass the database checks and still fail on the
  hosted project**, because they start from an empty database. Such a migration says so at the top
  with a read-only query to run in the SQL editor first; every count must be 0. If one isn't,
  the push fails without changing anything until those rows are fixed.
- Never run `supabase config push`; hosted auth and email settings live in the dashboard.

## Rolling back

**App.** A store build can't be taken back from phones that installed it.

- Stop it from reaching more people: pause the phased release in App Store Connect, or halt
  the staged rollout in the Play Console.
- Fix forward: revert the bad PR on `main` (`git revert`, through a PR like any change), then
  build and submit again. EAS gives the new build a higher build number.

**Database.** Migrations only run forward.

- To undo a change, write a new migration that reverses it (re-create the dropped function,
  restore the old policy) and ship it like any other.
- Before a risky migration (dropping or rewriting data), save a copy first:
  `supabase db dump --data-only -f backup.sql` (keep it out of the repo). Check
  **Database -> Backups** in the Supabase dashboard for the backups your plan keeps.

## Dependency updates

Nothing opens dependency update PRs automatically. Check for outdated packages yourself with
`npm outdated` now and then, and make each update its own branch and PR. Merge it once the
checks in "Checks before merging" pass locally.

Packages whose version the Expo SDK decides (`react`, `react-native`, `react-native-*`,
`expo-*`) are never bumped past what the SDK allows, because `expo-doctor` would fail. They
move together in an SDK upgrade:

```bash
npx expo install expo@^58.0.0   # the next SDK
npx expo install --fix          # every SDK package to the version that SDK expects
npx expo-doctor
```

Read Expo's SDK release notes first, then open the upgrade as its own PR.

Any dependency change can change what ships in the app, so after one run `npm run licenses`
and commit `src/data/third-party-licenses.json` (the Acknowledgements screen in Settings).
