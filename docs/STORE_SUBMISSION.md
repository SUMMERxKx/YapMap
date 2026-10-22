# Releasing Yap on the App Store and Google Play

Everything needed to build Yap for the stores and fill in their forms, in order. The everyday
flow (CI, versioning, shipping database changes, rollback) is in [`RELEASING.md`](RELEASING.md). The answers
below match what the app and database do as of October 2026; if the app starts collecting
something new, update this file, `docs/legal/privacy-policy.md` and
`expo.ios.privacyManifests` in `app.json` together.

## 0. One-time setup

1. **Developer accounts.** Apple Developer Program (USD 99/year, https://developer.apple.com/programs/)
   and a Google Play Console account (USD 25 once, https://play.google.com/console/signup).
   A new *personal* Play account must run a **closed test with at least 12 testers for 14 days**
   before it can publish to production, so start that early.
2. **App identifiers.** `app.json` uses `ca.samarxkx.yapmap` as the iOS bundle identifier and the
   Android package. Change both before the first upload if you want something else; after an
   upload they can never change.
3. **Publish the legal pages** (Markdown in `docs/legal/`; any static page works):

   | Page | Address |
   | --- | --- |
   | `privacy-policy.md` | https://samarxkx.dev/yap/privacy |
   | `terms-of-service.md` | https://samarxkx.dev/yap/terms |
   | `delete-account.md` | https://samarxkx.dev/yap/delete-account |

   Review the drafts first (each starts with a note on what to check) and remove that note from
   the published page. If the privacy or terms address changes, change `src/config/links.ts` too.
4. **Support email.** The app, the policies and the store listings use `support@samarxkx.dev`
   (`SUPPORT_EMAIL` in `src/config/links.ts`). Make sure that mailbox receives mail; reports of
   abuse that arrive there must be handled within 24 hours (`docs/legal/moderation.md`).
5. **Apply the database migrations** to the hosted project (`supabase/README.md`, step 4).
   `20261022082408_content_moderation.sql` adds the word filter and `private.suspend_user`;
   without it the app still works, but the store-required filter is off.
6. **EAS (Expo's build service).** Builds run in Expo's cloud with your Expo account:

   ```bash
   npm install -g eas-cli
   eas login
   eas init            # links the project; commit the projectId it adds to app.json
   ```

7. **Google Maps key for Android.** The Android map is Google Maps and needs an API key; a
   build without one crashes when the Map tab opens, so `app.config.ts` refuses to start an
   Android cloud build without it. iOS uses Apple Maps and needs nothing.
   1. In Google Cloud Console, create a project, enable **Maps SDK for Android**, and create an
      API key.
   2. Restrict it to Android apps: package `ca.samarxkx.yapmap`, with the SHA-1 fingerprints of
      the upload key (`eas credentials -p android`) and, after the first Play upload, the
      **App signing key** from Play Console → Test and release → App integrity.
   3. Give it to EAS for every build profile:

      ```bash
      eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value <key> \
        --environment production --environment preview --environment development --visibility sensitive
      ```

## 1. Build and upload

`eas.json` has three profiles:

| Profile | For | Notes |
| --- | --- | --- |
| `development` | Running the app from your computer with `npx expo start` on a real build | Includes the developer menu (expo-dev-client). The iOS build runs in the Simulator |
| `preview` | Testing a release build on your own phones | Installed directly: an `.apk` on Android, an ad hoc build on registered iPhones |
| `production` | The stores | Build numbers go up by themselves |

```bash
eas build --profile production --platform ios
eas submit --platform ios            # uploads the latest build to App Store Connect

eas build --profile production --platform android
eas submit --platform android        # after the first upload (see below)
```

- **Version numbers.** `version` in `app.json` (now `1.0.0`) is what people see; raise it for each
  release. The build numbers (`ios.buildNumber`, `android.versionCode`) are kept by EAS
  (`"appVersionSource": "remote"`) and raised by every production build, so never set them
  in `app.json`.
- **Runtime version.** `runtimeVersion` follows the app version, ready for over-the-air updates
  with EAS Update later (`npx expo install expo-updates`, then `eas update:configure`).
- **First Android upload.** Google needs the very first build uploaded by hand: download the
  `.aab` from the EAS build page and upload it in Play Console → Test and release → Testing →
  Internal testing. After that, `eas submit` works (it needs a Google service account key; EAS
  explains the steps when you run it).
- **Export compliance (iOS).** `ios.config.usesNonExemptEncryption` is `false` (Yap only uses
  the standard HTTPS built into iOS), so App Store Connect won't ask about encryption.

## 2. Store listing

| Field | Apple | Google | Draft |
| --- | --- | --- | --- |
| App name | 30 chars | 30 chars | `Yap: Meet People Nearby` (plain "Yap" is probably taken) |
| Subtitle / short description | 30 chars | 80 chars | `Say hi to people near you` / `See who nearby is up for a chat, say hi, and meet in person.` |
| Promotional text | 170 chars | – | `Turn green when you're up for a chat. See who nearby is too, say hi, and go talk in person. No distances, no exact locations.` |
| Description | 4000 chars | 4000 chars | From the README's first paragraphs and "How it works" |
| Keywords | 100 chars | – | `meet,nearby,chat,friends,people,campus,cafe,events,social,talk` |
| Category | Social Networking | Social | |
| Support URL | required | – | https://samarxkx.dev/yap (a page with the support email) |
| Marketing URL | optional | – | https://samarxkx.dev/yap |
| Privacy policy URL | required | required | https://samarxkx.dev/yap/privacy |
| Contact email | – | required | support@samarxkx.dev |

**Screenshots** (portrait, from the iOS Simulator or a phone, without personal data):

- **iPhone:** the 6.9-inch size, 1320 × 2868 or 1290 × 2796 pixels, 3 to 10 of them. Smaller
  iPhones reuse these. No iPad screenshots: `supportsTablet` is `false`, so on an iPad Yap runs
  as an iPhone app.
- **Google Play:** 2 to 8 phone screenshots, 9:16, at least 1080 × 1920 pixels; a **feature
  graphic** of 1024 × 500 pixels; and a **512 × 512** app icon (a resized copy of
  `assets/images/icon.png`, which is 1024 × 1024).

Good screens to show: Go live, Nearby with a person, the say-hi request, a chat, the map with
events, and the safety menu.

## 3. Apple: App Privacy

App Store Connect → the app → App Privacy. **Does this app collect data?** Yes. For every type
below the answers are the same: **used for App Functionality** only, **linked to the user's
identity: yes**, **used for tracking: no**.

| Category | Data type | What it is in Yap |
| --- | --- | --- |
| Contact Info | **Email Address** | Sign-in |
| Contact Info | **Name** | First and last name on the profile |
| Location | **Precise Location** | Position while live (deleted when you get off) |
| User Content | **Photos or Videos** | Profile photos |
| User Content | **Emails or Text Messages** | Chat and group messages |
| User Content | **Other User Content** | Intro, interests, live note, events, reports |
| Identifiers | **User ID** | The account id |
| Other Data | **Other Data Types** | Gender (and whether it is shown), the 18+ confirmation |

Not collected: Health, Financial, Contacts, Browsing or Search History, Purchases, Usage Data,
Diagnostics (no analytics or crash reporting SDK), Sensitive Info, Device ID / advertising
data. **Tracking: no.** These match `NSPrivacyCollectedDataTypes` in `app.json`, which also
declares the "required reason" APIs that React Native and Expo use (UserDefaults, file
timestamps, disk space, system boot time).

## 4. Google Play: Data safety

Play Console → Policy and programs → App content → Data safety.

- **Does your app collect or share any of the required user data types?** Yes.
- **Is all of the user data collected by your app encrypted in transit?** Yes.
- **Do you provide a way for users to request that their data is deleted?** Yes. Delete-account
  URL: https://samarxkx.dev/yap/delete-account
- **Shared with third parties:** none. (Supabase and Resend process data for us as service
  providers, which Google does not count as sharing.)

Collected types (for each: **collected, not shared, not processed ephemerally, required**,
purpose **App functionality** and **Account management** where it says so):

| Category | Type | Purpose |
| --- | --- | --- |
| Location | Precise location | App functionality |
| Personal info | Name | App functionality, Account management |
| Personal info | Email address | Account management |
| Personal info | User IDs | App functionality, Account management |
| Personal info | Other info (gender, 18+ confirmation) | App functionality |
| Photos and videos | Photos | App functionality |
| Messages | Other in-app messages | App functionality |
| App activity | Other user-generated content (intro, interests, notes, events, reports) | App functionality |

Not collected: financial info, health, contacts, calendar, audio, files, web browsing, app
info and performance (no crash logs or diagnostics), device or other IDs.

## 5. Content rating and audience

**Apple age rating** (App Store Connect → App Information → Age Rating):

- Violence, sexual content, profanity, horror, drugs, alcohol, gambling, contests, medical:
  **None**.
- **User-generated content: Yes. Messaging and chat: Yes.** (Apple then asks about moderation:
  reports, blocking and a filter exist; see `docs/legal/moderation.md`.)
- Unrestricted web access: **No**. Advertising: **No**. Parental controls / age assurance: No.
- Choose the **18+** rating: Yap is for adults only and the app asks people to confirm they are
  18 or older.

**Google Play** (App content):

- **Content rating** (IARC questionnaire), category **Social networking / communication**:
  violence, sexuality, language, controlled substances, gambling: **No**. **Users can interact
  or exchange content: Yes. Shares the user's location with other users: Yes** (people nearby
  learn that you are close, though never where exactly; answer Yes to be safe). Digital
  purchases: No.
- **Target audience:** **18 and over** only. Not designed for children.
- **Ads:** No ads. **News app:** No. **Government app:** No. **Financial features:** None.
  **Health:** No.
- **Permissions:** location is foreground only (no background location declaration). Photos
  come through the system photo picker, so there are no photo or video permissions to declare.

## 6. Access for app review

Both stores need to sign in and see the main features. Yap only shows people who are live
within about 100 m of each other, so a reviewer needs **two accounts** that are live at the
same place.

1. Create two accounts with real inboxes you control (e.g. `review1@samarxkx.dev` and
   `review2@samarxkx.dev`), confirm both with the emailed codes, and finish both profiles with
   photos. Don't use them for anything else.
2. Put both emails and passwords in App Store Connect → App Review Information → Sign-in
   required, and in Play Console → App content → App access (choose "All or some functionality
   is restricted" and add both).
3. Add these review notes:

   > Yap shows people who are live within about 100 m of each other, so testing needs two
   > signed-in devices at the same place: two phones, or a phone and the iOS Simulator with
   > Features → Location → Custom Location set to the phone's position before going live. Sign
   > in as review1 on one and review2 on the other, tap the YAP button on each to go live, then
   > open Nearby: each sees the other. Tap the person, say hi, and accept on the other device to
   > open the chat. The ··· menu on a profile or chat has Report and Block. Events can be
   > created and joined on the Map tab without a second device. Delete account is in Profile →
   > Settings. A short video of the two-device flow: <link>.

4. Record that video (screen recordings of both devices) and link it in the notes; Apple
   accepts a demo video for features that need more than one person.

## 7. Account deletion

- **Apple** (guideline 5.1.1(v)): Profile → Settings → **Delete account**, then confirm the
  deletion; this deletes the account and its data inside the app.
- **Google**: the same in-app deletion, plus the web page https://samarxkx.dev/yap/delete-account
  for people who no longer have the app (Data safety asks for it).

## 8. Other checks before you submit

- Sign in with Apple is **not** required: Yap only has email and password sign-in. If Google
  sign-in is ever switched on (`socialSignIn` in `src/config/features.ts`), Sign in with Apple
  must be offered on iOS too (guideline 4.8).
- Permission prompts (in `app.json`): location while the app is open, the camera and the photo
  library. There is no background location and no microphone.
- Acknowledgements (Settings → Acknowledgements) list every open-source package the app ships.
  After adding, removing or updating a dependency, run `npm run licenses` (it exports both
  bundles, so it takes a few minutes) and commit `src/data/third-party-licenses.json`. A CI job
  can run `npm run licenses -- --check --export-dir <dir>` after an `npx expo export
  --source-maps --output-dir <dir>` it already does.
- Test the production build on a real Android phone (the map) and a real iPhone before
  submitting: `eas build --profile preview`.
