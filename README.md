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
- Backend: Supabase (planned). The app currently runs on a mock backend in `src/data/api.ts`.

## Run it

```bash
nvm use            # Node 22
npm install
npx expo start     # scan the QR code with Expo Go on an iPhone or Android phone
```

Testing with the mock backend:
- Any 6-digit code signs you in. `000000` shows the error state.
- After "Say hi", the mock answers in about 6 seconds.
- In development builds, Profile has "Simulate an incoming request".

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
