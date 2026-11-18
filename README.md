# Yap

**The app that gets you off the app.**

Yap is a mobile app for iOS and Android that helps people in the same place, like a café or a campus lounge, have a spontaneous conversation in person. You turn green when you're up for a chat, see who nearby is up for one too, say hi, and if they accept, you go and talk.

This is the final project for **COMP 2160 (Section 01), Mobile App Development 1**.

**Team:** Samar Khajuria and Manik Singh

## How it works

1. Sign in and set up a short profile.
2. Press the green button to go live for 30, 60 or 120 minutes, with an optional "How to find me" note.
3. See other people nearby who are live too. Nobody sees exact locations or distances.
4. Say hi to one person. They have 5 minutes to accept or decline.
5. If they accept, you both see each other's photo and note, and meet in person.

Block and report are always two taps away.

This release has no selfie or face verification, and profiles are not verified. The earlier
selfie code is parked on the `future/face-verification` branch and tracked on the backlog (see
[issue 17](https://github.com/SUMMERxKx/YapMap/issues/17)).

## Tech

- React Native with Expo (SDK 57) and TypeScript
- Expo Router for navigation
- Backend: Supabase — Postgres (+PostGIS) with row-level security, database functions for
  every write, Realtime for requests and chat, and private photo storage. The SQL lives in
  `supabase/migrations/`; `supabase/README.md` explains how to change it.

## Run it

```bash
nvm use            # Node 22
npm install
npm start          # scan the QR code with Expo Go on an iPhone or Android phone
```

`npm start` runs `expo start --go`. Plain `npx expo start` would open in development-build mode
(the project includes `expo-dev-client` for EAS development builds), which Expo Go can't load;
press `s` in the terminal to switch, or use `npm start`.

Testing against the real backend:
- Create an account with a real email address and a password (8+ characters). An 8-digit
  code is emailed to confirm the address; after that you sign in with email and password.
  Emails are sent through the custom SMTP sender configured on the Supabase project.
- Forgot your password? "Forgot password" on the sign-in screen emails an 8-digit code,
  then you choose a new password. Accounts created before passwords existed (when sign-in
  was by emailed code only) have no password yet: they use "Forgot password" once to set
  one. A signed-in user can change their password in Settings (the gear on the Profile tab).
- The core loop needs two phones signed in with different emails, close to each other (the
  same room always counts: the server compares squares of about 100 m), both live.

## Supabase dashboard setup (owner, one time)

Password sign-in needs these settings on the hosted Supabase project. The app can't open
email links, so every email shows an 8-digit code (`{{ .Token }}`) instead.

- **Authentication -> Sign In / Providers -> Email**: Email provider enabled (password
  sign-in), **Confirm email** ON, and minimum password length **8**.
- **Authentication -> Emails -> Templates -> Confirm signup**: keeps showing `{{ .Token }}`
  (the 8-digit code that confirms a new account).
- **Authentication -> Emails -> Templates -> Reset password**: show `{{ .Token }}` (an 8-digit
  code) instead of the link, with a subject such as "Reset your Yap password".
- For both templates, paste the body of `supabase/templates/confirmation.html` and
  `recovery.html`: they put the code on its own large line, so it is easy to copy and paste
  into the app's code screen.
- **Magic link** template: no longer used by the app, since sign-in by emailed code alone
  was replaced by email and password.
- **Authentication -> Hooks -> Before User Created**: enabled, type **Postgres**, function
  `public.before_user_created` (from `20261026180208_safety_fixes.sql`). It refuses banned and
  throwaway email addresses and more than 20 sign-ups a day from one IP address. The local stack
  switches it on in `supabase/config.toml`.

## Code tour

- **Technical report:** [`docs/technical-report/yapmap-technical-report.pdf`](docs/technical-report/yapmap-technical-report.pdf) describes the architecture, data model, data flows and every feature in depth.
- **Entry point:** `src/app/_layout.tsx` (Expo Router). It routes people through sign-in, profile
  setup and into the app with guarded stacks.
- **Screens** live in `src/app/` — a file is a route, a `_layout.tsx` is a navigator. The signed-in
  tabs are Go live, Nearby, Map and Profile.
- **State** lives in `src/state/store.ts`: one small store; screens read slices with
  `useStore(selector)` and call its exported actions. `src/state/profile-draft.tsx` holds the
  answers while someone moves through profile setup.
- **Backend** calls go through `src/data/api.ts`, which wraps the Supabase client in
  `src/data/supabase-client.ts`; screens never talk to Supabase directly. `src/data/types.ts` holds
  the data shapes, `src/data/constants.ts` the fixed lists and limits, and
  `src/data/database.types.ts` the types generated from the database.
- **Hooks** for the clock, countdowns, location and the Nearby list are in `src/hooks/`; small pure
  helpers for wording (times, names) are in `src/lib/`.
- **Components** are grouped by purpose in `src/components/` (`ui`, `profile`, `live`, `chat`,
  `safety`, `events`, `account`, `mascot`); colours, spacing and type come from `src/theme`. Feature switches, the
  Supabase project address and the legal and support links are in `src/config/`.
- **Event icons:** `EVENT_CATEGORIES` in `src/data/constants.ts` maps the value stored on each
  event to its Ionicons icon and spoken name; `src/components/events/event-icon.tsx` draws it.
- **App icon, splash and favicon** are all generated from `assets/brand/yap-mark.svg`. After
  changing the SVG, run `npm run icons` (needs ImageMagick) and commit the new images.
- **The Yap cat** (the mascot on empty, waiting and error screens) is drawn in
  `assets/mascot/*.svg`, one file per pose. After changing a drawing, run `npm run mascot` to
  regenerate `src/components/mascot/mascot-art.ts` and commit both; `<Mascot pose="dizzy" />`
  draws it. Pass `mascot="..."` to `EmptyState` to use it there.
- **Press feedback, loading placeholders:** tappable surfaces use `usePressFeedback`
  (`src/components/ui/press-feedback.ts`) so they all shrink and darken the same way, and
  loading lists show `Skeleton` blocks (`src/components/ui/skeleton.tsx`) instead of a spinner.
- **Double taps and odd input:** buttons, rows and cards ignore a second tap while the first
  one's action runs (`useGuardedPress` in the same file); give a `Button` the async function
  itself (`onPress={save}`) so it can wait for it. Typed text goes through `src/lib/clean-text.ts`
  before it is saved, matching the database's check constraints, and picked photos through
  `src/lib/picked-photo.ts`. Deadlines from the server are compared with `serverNow()`
  (`src/lib/server-clock.ts`), so a phone with a wrong clock still counts down correctly.

## Releasing

- **Store builds** are made with EAS Build (`eas.json`: `development`, `preview` and `production`
  profiles). [`docs/STORE_SUBMISSION.md`](docs/STORE_SUBMISSION.md) has the commands, the one-time
  setup (Apple and Google accounts, the Android Google Maps key, publishing the legal pages) and
  the answers for every store form.
- **Identifiers:** `ca.samarxkx.yapmap` for the iOS bundle and the Android package (`app.json`).
- **Legal:** the privacy policy, terms, account-deletion page, child safety standards and the
  moderation process are in [`docs/legal/`](docs/legal/). The public pages are the static site in
  [`site/`](site/), deployed on Vercel. The app links to the published privacy policy and terms at the
  addresses in `src/config/links.ts`; Community guidelines and Acknowledgements are screens
  inside the app (`src/app/guidelines.tsx`, `src/app/acknowledgements.tsx`).
- **Open-source licences:** after adding, removing or updating a dependency, run `npm run licenses`
  and commit `src/data/third-party-licenses.json` (the Acknowledgements list).
- **Moderation:** slurs and abusive words are refused by the database (`private.blocked_words`), and
  reports are reviewed daily as described in [`docs/legal/moderation.md`](docs/legal/moderation.md).

## Checks

```bash
npm run typecheck    # generates the Expo Router route types, then runs TypeScript
npm run lint
npx expo-doctor
```

With Docker running, the database checks are:

```bash
supabase start && supabase db reset   # every migration from an empty database
supabase test db                      # the pgTAP checks in supabase/tests
npm run db:types:check                # src/data/database.types.ts matches the migrations
```

There are no GitHub Actions. Run all of these yourself before merging a pull request, along with
the iOS and Android bundle builds (`npx expo export`) and the migration file names check
(`npm run db:check-migrations`). `docs/RELEASING.md` lists every check with its command, and
covers branch protection, versioning, EAS builds, shipping database changes and rollback.
