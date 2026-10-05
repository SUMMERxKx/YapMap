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
- Sign in with a real email address: a 6-digit code is sent to it. The built-in email
  sender only allows a few codes per hour, so use it sparingly until custom SMTP is set up.
- The core loop needs two phones signed in with different emails, within ~100 m of each
  other (same room counts), both live.

## Code tour

- **Entry point:** `src/app/_layout.tsx` (Expo Router). It routes people through sign-in, profile
  setup and into the app with guarded stacks.
- **Screens** live in `src/app/` — a file is a route, a `_layout.tsx` is a navigator. The signed-in
  tabs are Go live, Nearby, Map and Profile.
- **State** lives in `src/state/store.ts`: one small store; screens read slices with
  `useStore(selector)` and call its exported actions.
- **Backend** calls go through `src/data/api.ts` — currently a mock whose functions mirror the
  planned Supabase functions, so swapping in the real backend touches that file, not screens.
- **Components** are grouped by purpose in `src/components/` (`ui`, `profile`, `live`, `chat`,
  `safety`); colours, spacing and type come from `src/theme`.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
