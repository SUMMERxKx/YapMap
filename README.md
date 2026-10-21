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

## Tech

- React Native with Expo (SDK 57) and TypeScript
- Expo Router for navigation
- Backend: Supabase — Postgres (+PostGIS) with row-level security, database functions for
  every write, Realtime for requests and chat, and private photo storage. The SQL lives in
  `supabase/migrations/`.

## Run it

```bash
nvm use            # Node 22
npm install
npx expo start     # scan the QR code with Expo Go on an iPhone or Android phone
```

Testing against the real backend:
- Create an account with a real email address and a password (8+ characters). An 8-digit
  code is emailed to confirm the address; after that you sign in with email and password.
  Emails are sent through the custom SMTP sender configured on the Supabase project.
- Forgot your password? "Forgot password" on the sign-in screen emails an 8-digit code,
  then you choose a new password. Accounts created before passwords existed (when sign-in
  was by emailed code only) have no password yet: they use "Forgot password" once to set
  one. A signed-in user can change their password in Settings (the gear on the Profile tab).
- The core loop needs two phones signed in with different emails, within ~100 m of each
  other (same room counts), both live.

## Supabase dashboard setup (owner, one time)

Password sign-in needs these settings on the hosted Supabase project. The app can't open
email links, so every email shows an 8-digit code (`{{ .Token }}`) instead.

- **Authentication -> Sign In / Providers -> Email**: Email provider enabled (password
  sign-in), **Confirm email** ON, and minimum password length **8**.
- **Authentication -> Emails -> Templates -> Confirm signup**: keeps showing `{{ .Token }}`
  (the 8-digit code that confirms a new account).
- **Authentication -> Emails -> Templates -> Reset password**: show `{{ .Token }}` (an 8-digit
  code) instead of the link, with a subject such as "Reset your Yap password".
- **Magic link** template: no longer used by the app, since sign-in by emailed code alone
  was replaced by email and password.

## Code tour

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
  `safety`, `events`); colours, spacing and type come from `src/theme`. Feature switches and the
  Supabase project address are in `src/config/`.
- **Event icons:** `EVENT_CATEGORIES` in `src/data/constants.ts` maps the value stored on each
  event to its Ionicons icon and spoken name; `src/components/events/event-icon.tsx` draws it.
- **App icon, splash and favicon** are all generated from `assets/brand/yap-mark.svg`. After
  changing the SVG, run `npm run icons` (needs ImageMagick) and commit the new images.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
