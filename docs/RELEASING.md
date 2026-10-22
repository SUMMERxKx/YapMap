# Shipping changes

How a code or database change gets from a branch to people's phones, what checks it on the
way, and how to undo it.

## Branch flow

1. Branch from `main` (`feat/...`, `fix/...`, `chore/...`).
2. Open a pull request. The template asks what changed, how it was tested, and whether it
   has a migration.
3. CI runs (below). Fix it until every check is green.
4. Squash-merge into `main`, with a title like the existing history
   (`feat(events): let the host delete their event`).
5. If the PR has a migration, apply it to the hosted project (see "Database changes").

Nobody pushes to `main` directly.

## What CI checks

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. A new push to
the same branch cancels the older run.

| Check (job name) | What it does | Run it yourself |
| --- | --- | --- |
| **App (types, lint, doctor, export)** | `npm ci`, TypeScript, ESLint (with security rules; warnings fail), `expo-doctor`, and builds the iOS and Android bundles with `expo export`. Also prints an `npm audit` report that never fails the run. | `npm run typecheck`, `npm run lint`, `npx expo-doctor`, `npx expo export --platform ios --platform android` |
| **Migration files** | New migration files are named `<14-digit version>_<name>.sql` and are later than every migration on `main`; existing migrations were not edited, renamed or deleted. | `npm run db:check-migrations` |
| **Database (reset, lint, types)** | Starts Supabase in Docker, applies every migration from an empty database, lints the SQL functions in `public` and `private`, and checks `src/data/database.types.ts` matches the migrations. | `supabase start`, `supabase db reset`, `supabase db lint --schema public,private`, `npm run db:types:check` |

CI uses Supabase CLI **2.121.0**. Use the same version locally when you run `npm run db:types`
(`brew upgrade supabase`, or `npx supabase@2.121.0 ...`): a different CLI can format the
generated types differently and the types check would fail.

When the types check fails, the log shows the difference. Run `supabase start` (or
`supabase db reset`), then `npm run db:types`, and commit the updated file.

## Recommended branch protection for `main`

Set these once in **Settings -> Branches -> Add branch ruleset** (or classic branch protection)
for `main`:

- Require a pull request before merging. Approvals: 0 while one person works on the repo
  (GitHub won't let you approve your own PR); raise it to 1 when a second developer joins.
  CODEOWNERS already asks the owner to review every PR.
- Require status checks to pass, and require branches to be up to date before merging.
  Required checks: `App (types, lint, doctor, export)`, `Migration files`,
  `Database (reset, lint, types)`. They appear in the search box after CI has run once.
- Require conversation resolution before merging.
- Block force pushes and deletion of `main`.

Don't add `PR-Agent` as a required check: it is optional and skipped until it is turned on.

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

Build from a clean, up-to-date `main` with green CI.

## Database changes

A database change ships like this:

1. **Migration.** `supabase migration new <name>`, write the SQL, `supabase db reset` to try
   it, then `npm run db:types`. `supabase/README.md` has the details.
2. **Pull request** with the migration and the regenerated types.
3. **CI** applies every migration to an empty database, lints the functions, checks the types
   and the file name. A migration that fails here would also fail on the hosted project.
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
  database, where editing the file changes nothing. Add a new migration. CI enforces this.
- **Apply the migration before releasing app code that needs it**, and keep each migration
  working with the app version already on people's phones. Old builds stay installed for
  weeks. To rename or remove a column or function: add the new one, ship an app that uses
  it, and drop the old one in a later migration.
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

Dependabot (`.github/dependabot.yml`) opens update PRs every Monday: one grouped PR for npm
minor and patch updates, one for Expo SDK patch updates, one for GitHub Actions. Merge them
when CI is green.

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

## AI code review (optional, free)

`.github/workflows/pr-agent.yml` runs [PR-Agent](https://github.com/the-pr-agent/pr-agent)
(open source, MIT) inside GitHub Actions. It posts a review and code suggestions on each new
pull request, and replies to `/review`, `/improve` or `/ask <question>` comments. It is off
until the owner turns it on, and the workflow is skipped (not failed) until then.

Why this tool (checked October 2026; these change often):

- CodeRabbit reviews only public repositories for free; private repositories need a paid plan.
- The free (consumer) Gemini Code Assist GitHub app shut down on July 17, 2026.
- Qodo Merge (the hosted PR-Agent) no longer has a free plan, only a trial.
- GitHub Copilot Free doesn't include code review, and GitHub Models was retired.
- PR-Agent itself is free. With a Google AI Studio key on Gemini's free tier, the whole
  setup costs nothing, within Google's free-tier rate limits.

One-time setup, with the owner's own logins:

1. Create an API key at <https://aistudio.google.com/apikey>.
2. In the GitHub repo: **Settings -> Secrets and variables -> Actions**.
   - **Secrets** tab: new repository secret `GEMINI_API_KEY` = the key.
   - **Variables** tab: new repository variable `PR_AGENT_ENABLED` = `true`.
   - Optional variable `PR_AGENT_MODEL` to pick another model (default
     `gemini/gemini-3.8-flash`).
3. Open a pull request. A "PR Reviewer Guide" comment from `github-actions` appears within a
   few minutes.

**Privacy:** the review sends the PR's diff and the README files to Google. On the free tier,
Google may use that content to improve its products, and people at Google may read it. Yap is
proprietary, so decide whether that is acceptable. Turning on billing for the key's Google
Cloud project moves it to the paid tier, where content is not used that way; a few reviews a
week cost very little. Set `PR_AGENT_ENABLED` to `false` to turn reviews off again.

What it reviews for (Supabase security, append-only migrations, privacy, React Native leaks)
is set in `.pr_agent.toml`.
