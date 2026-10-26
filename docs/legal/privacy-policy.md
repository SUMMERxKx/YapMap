> **Owner review needed before publishing.** This is a plain-language draft written to match
> what the app and its database actually do (October 2026). It is not legal advice. Check it,
> fill in the two items marked `[OWNER: ...]`, then publish it at
> https://samarxkx.dev/yap/privacy (the address in `src/config/links.ts` and in both store
> listings). Update it whenever the app starts keeping something new.

# Yap Privacy Policy

**Last updated:** 26 October 2026

Yap is an app for meeting people who are nearby, in person. It is made by Samar Khajuria
("we", "us"). This policy explains what Yap keeps about you, why, who helps us run it, how
long it is kept and how to delete it.

The short version: we keep what you put in your profile, the chats and events you take part
in, and your safety reports and blocks, for as long as you have an account. We only ever store
your location as an area of about 100 metres, only while you are live or using the map, and
delete it soon after. Nobody else ever sees where you are. We don't sell your data, show ads, or track you across other apps.

Questions or requests: **support@samarxkx.dev**.

## What we keep, and why

### Your account

- **Email address and password.** To create your account and sign you in. Your password is
  stored only as a secure hash by our sign-in provider; we can never read it.
- **The 8-digit codes we email you** to confirm your address or reset your password. They
  expire after a short time.
- **When you sign up,** we check your email address against a list of temporary-email services
  and against our list of banned addresses, and we keep a scrambled (hashed) copy of the IP
  address it came from for one day, so one network can't make more than 20 accounts a day. The
  hash can't be turned back into the IP address.

### Your profile

- **First and last name, gender (and whether to show it), a short intro, 3 to 5 interests, a
  profile photo and 4 to 6 more photos.** Other people see your first name and last initial,
  your photos, intro and interests, and your gender if you chose to show it, but only while
  they can see you in the app (see "Who sees what" below).
- **That you confirmed you are 18 or older.** Yap is for adults only.
- **Your account status** (active, hidden while reports are reviewed, or suspended) and when
  you joined.

### When you go live

- **Your area:** your phone sends its location, and we store only the centre of the square of
  about 100 metres it falls in, never the exact point (plus how accurate your phone says the
  location is, between 0 and 50 metres). We also keep the **note** you add ("How to find me")
  and when your session started and ends. We use the area only to work out who is in the same
  square as you or one next to it. It is **never shown to anyone**, and it is **deleted when you
  get off or your time runs out** (within a minute).
- **The times you started a session or moved** (not where), kept for 10 minutes so the app can
  limit how often a live location can change. This stops people from hopping around to find
  out who is live where.

### Saying hi and chatting

- **Who said hi to whom, when, and the answer** (accepted, declined, expired, ended, met).
- **Your messages**, with your display name and the time. Messages are only visible to the
  people in that chat.

These are kept until either person deletes their account.

### Events on the map

- **Events you create:** the title, description, category, start time and **the place you
  chose on the map**. The place is meant to be seen by others: that's how people find the
  event. It is not your own location.
- **Who joined each event** and **the group chat messages**.

Events and their group chats are kept until the host deletes the event or their account.
When you use the map, your phone sends its location and we store your **area** (the centre of
the square of about 100 metres it falls in) for up to 2 hours. The map lists events around that
area, and joining an event checks you are within 5 km of it. Like a live location, it can only
change a few times in 10 minutes, and it is never shown to anyone.

### Safety

- **People you block**, so you never see each other.
- **Reports you make** (who, the reason, any details you add) and reports made about you. We
  read reports to keep Yap safe (see our Community Guidelines). A profile is hidden until we
  have reviewed it when three different people report it who met that person on Yap (a say-hi,
  a chat or an event they both joined) or have used Yap for at least 3 days.
- **Banned email addresses.** If we suspend an account, or an account is deleted while it is
  hidden or suspended, we keep a scrambled (hashed) copy of its email address so it can't sign
  up again.
- **Text checks.** Intros, interests, notes, event text and messages are checked against a
  short list of slurs and abusive words when you save or send them. Text that fails is
  refused, not stored.

### Technical information

- Our hosting provider keeps **short-lived logs of requests** to our servers, which include
  your IP address, the time and the app's version, to keep the service secure and fix
  problems. We don't use them to profile you.
- **On your phone**, the app stores your sign-in session, a few settings (such as the map
  distance you chose and how many times you've seen the chat safety tip) and a cache of photos. These are
  removed when you sign out or delete the app.

### What we don't collect

No contacts, no advertising identifiers, no analytics or tracking, no background location,
no microphone, and no payment details. Yap has no ads and no in-app purchases.

## Who sees what

- **People nearby who are live at the same time** see your profile card and note. They never
  see your location or distance.
- **Someone you said hi to, or who said hi to you**, sees your profile while the request is
  waiting and during and after a chat.
- **People who can see an event you host** (on the map within 50 km of their own area) see
  your first name and last initial. Only **people who joined the event** see your profile photo.
- **Nobody** sees you while either of you has blocked the other.

## Who helps us run Yap

We use these services to run the app. They only process your data on our behalf, under their
own security and privacy terms, and we don't let them use it for anything else.

| Service | What it does | What it handles |
| --- | --- | --- |
| **Supabase** | Database, sign-in, photo storage and live updates | Everything listed above |
| **Resend** | Sends our emails | Your email address and the code in the email |
| **Expo** (650 Industries) | Builds the app and delivers it to the stores | No personal data about you |
| **Apple Maps** (iPhone) / **Google Maps** (Android) | Draws the map | The map area you look at and your device's IP address, under Apple's and Google's own privacy policies |
| **Apple App Store / Google Play** | Delivers and updates the app | Covered by Apple's and Google's own privacy policies |

Our Supabase project is hosted in `[OWNER: the Supabase project's region, e.g. "Canada
(Central)"]`. Your data may be processed in other countries where these providers operate.

We **don't sell or rent your data**, and we don't share it with anyone else unless the law
requires it (for example, a valid order from a court or the police) or it is needed to protect
someone's safety.

## How long we keep it

| Data | Kept until |
| --- | --- |
| Live area and note | You get off, or your time runs out (deleted within a minute) |
| Map area | 2 hours after it was set |
| Location-change times | 10 minutes |
| Scrambled IP addresses of sign-ups, and photo upload times | 1 day |
| Profile, photos, chats, messages, events, blocks | You delete your account (or we remove it for breaking the rules) |
| Reports | Kept after either person deletes their account, without the account linked, so we can act if someone comes back |
| Banned email addresses (hashed) | Until we lift the ban |
| Email codes | They expire (within an hour) |
| Server request logs | Removed automatically by our hosting provider after a few days |
| Backups | Overwritten by our hosting provider, within `[OWNER: the backup retention of your Supabase plan, e.g. 7 days]` |

## Deleting your account

In the app: **Profile → Settings (gear) → Delete account**, then confirm the deletion. This
deletes, straight away:
your account and email address, your profile and all your photos, your live session, every
say-hi request and chat you were part of and their messages, the events you host and their
group chats, your event memberships and group messages, and your blocks. Safety reports you
made or that were made about you are kept without your account linked to them. If your account
was hidden or suspended when you deleted it, a scrambled copy of your email address is kept so
it can't be used to sign up again.

If you can't use the app, email **support@samarxkx.dev** from the address you signed up with
and we'll delete your account within 30 days. The steps are also at
https://samarxkx.dev/yap/delete-account.

## Your choices and rights

- **See or correct your data:** your profile is in the app, and you can edit it any time.
  For a copy of everything we hold about you, email us.
- **Location:** Yap only asks for your location while the app is open. You can turn it off in
  your phone's settings at any time; you just won't be able to go live or see the map.
- **Photos and camera:** used only when you choose a photo or take one.
- **Delete:** as described above.

Depending on where you live (for example in Canada, the EU or the UK, or California), you may
have rights to access, correct, delete, or move your data, or to object to how it is used.
Email us to use any of them; we answer within 30 days. You can also complain to your local data
protection authority.

## Adults only

Yap is only for people aged 18 and over. We don't knowingly keep data about anyone younger. If
we learn that an account belongs to someone under 18, we delete it. If you think a child is
using Yap, report them in the app or email us.

## Security

Every connection to Yap is encrypted (HTTPS). Database rules let each person read only what
they are allowed to see, every change goes through checks on our server, and photos are
stored privately and shown through links that expire within 15 minutes. No system is perfect, so
please use a password you don't use anywhere else.

## Changes

If we change this policy, we'll update the date at the top and, for important changes, tell you
in the app before they take effect.

## Contact

Samar Khajuria, **support@samarxkx.dev**
