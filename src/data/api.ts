// The app's only doorway to the backend. Every function here wraps a Supabase call -
// mostly the database functions from supabase/migrations, which enforce all the rules
// server-side (proximity, blocks, rate limits). Screens and the store never import
// supabase directly; they call these.

import { isAuthRetryableFetchError, type RealtimeChannel } from '@supabase/supabase-js';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { serverNow, syncServerClock } from '@/lib/server-clock';

import { SUPPORT_EMAIL } from '@/config/links';

import { INTEREST_RANGE, PASSWORD_MIN_LENGTH } from './constants';
import { supabase } from './supabase-client';

import type { Gender, MapEvent, Message, NearbyPerson, Profile, ReportReason } from './types';

// ---------------------------------------------------------------- auth

// People sign in with email and password. Emails carry an 8-digit code instead of a link
// (the Confirm signup and Reset password templates show {{ .Token }}), because the app
// can't open links.

const INVALID_CODE = 'Invalid or expired code. Please request a new one.';

/**
 * Create an account. Returns true when Supabase emailed a code to confirm it, and false
 * when the account is ready straight away ("Confirm email" switched off in the dashboard).
 *
 * An email that already has an account goes to the code screen like a new one (Supabase
 * sends it nothing and returns a user with no identities), so nobody can use sign-up to
 * find out whether someone uses Yap. The code screen says what to do if no code comes.
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error && isAccountExists(error)) return true;
  // A code went out less than a minute ago and still works. Saying so would also give away
  // the account: a confirmed one never hits this limit, since nothing is sent to it.
  if (error && error.code === 'over_email_send_rate_limit') return true;
  if (error) throw new Error(friendlyAuthError(error));
  return data.session === null;
}

export async function verifySignUpCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
  if (error) throw new Error(INVALID_CODE);
}

export async function resendSignUpCode(email: string) {
  const { error } = await supabase.auth.resend({ email, type: 'signup' });
  // Same as sign-up: an existing account looks like a code that was sent.
  if (error && !isAccountExists(error)) throw new Error(friendlyAuthError(error));
}

/** The email already belongs to a confirmed account. */
function isAccountExists(error: { code?: string; message: string }) {
  return error.code === 'user_already_exists' || error.code === 'email_exists' || /already (registered|confirmed)/i.test(error.message);
}

/** Returns 'unconfirmed' when the password is right but the account still needs its code. */
export async function signInWithPassword(email: string, password: string): Promise<'signed-in' | 'unconfirmed'> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && error.code === 'email_not_confirmed') return 'unconfirmed';
  if (error) throw new Error(friendlyAuthError(error));
  return 'signed-in';
}

/** Set or change the signed-in user's password. */
export async function setPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendlyAuthError(error));
}

// Forgot password: the emailed code signs the user in, so it is only used together with
// the new password. Accounts made before passwords existed set their first one this way.
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(friendlyAuthError(error));
}

/** Use the emailed code and save the new password; leaves no session behind if either fails. */
export async function resetPassword(email: string, code: string, password: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error) throw new Error(INVALID_CODE);
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    // Local only, so this works offline too: a kept recovery session would sign them in
    // on the next launch without a password.
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error(`${friendlyAuthError(updateError)} The code is used up, so request a new one.`);
  }
}

/** The signed-in user, or null. */
export async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  // Offline with an expired token: still signed in, just not reachable right now.
  if (error && isAuthRetryableFetchError(error)) throw new Error(friendlyAuthError(error));
  return data.session?.user ?? null;
}

/** Fires on sign-in and sign-out. Returns an unsubscribe function. */
export function onAuthStateChange(onChange: (signedIn: boolean) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session !== null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(friendlyAuthError(error));
}

/** Turns a Supabase Auth error into a sentence for the screen. */
function friendlyAuthError(error: { code?: string; message: string }) {
  if (isAuthRetryableFetchError(error)) {
    return "You need a connection for this. Try again when you're back online.";
  }
  if (error.code === 'invalid_credentials') {
    return "Wrong email or password. If you've never set a password, use Forgot password.";
  }
  if (error.code === 'weak_password') {
    return `Choose a stronger password: at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (error.code === 'same_password') {
    return "That's already your password. Choose a different one.";
  }
  // Only happens if "Secure password change" is turned on in the Supabase dashboard.
  if (error.code === 'reauthentication_needed') {
    return 'For your security, sign out and sign back in, then change your password.';
  }
  if (error.code === 'over_request_rate_limit') {
    return 'Too many attempts. Please wait a bit and try again.';
  }
  // A second code for the same email within a minute is refused with this code.
  if (error.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
    return 'Too many codes requested. Please wait a bit and try again.';
  }
  return error.message;
}

// What the database functions say when they refuse (`raise exception '...'` in
// supabase/migrations), as sentences for the screen.
const SERVER_REFUSALS: Record<string, string> = {
  'not signed in': 'Your session has ended. Sign in again.',
  'cannot request yourself': "You can't say hi to yourself.",
  'not available': "They're not available right now.",
  'not nearby': "They're not nearby any more.",
  'too many requests': "You've said hi a lot in the last few minutes. Wait a bit and try again.",
  'no such pending request': 'This request is no longer waiting for an answer.',
  'request expired': 'This request has expired.',
  'no such chat': 'This chat has ended.',
  'invalid message': 'Messages can be 1 to 1000 characters long.',
  'too many messages': "You're sending messages too fast. Wait a moment and try again.",
  'cannot block yourself': "You can't block yourself.",
  'cannot report yourself': "You can't report yourself.",
  'profile not ready': 'Finish your profile first.',
  'account restricted': `Your account is on hold, so you can't do this right now. Email ${SUPPORT_EMAIL} if you think it's a mistake.`,
  'too many lookups': "You're refreshing too fast. Wait a moment and try again.",
  'location needed': 'Yap needs your location for this. Turn on location and try again.',
  'invalid location': "We couldn't use your location. Try again in a moment.",
  'invalid duration': 'Choose 30, 60 or 120 minutes.',
  'note too long': 'Notes can be up to 60 characters long.',
  'invalid start time': 'Pick a start time within the next 7 days.',
  'too many events': "You've posted as many events as you can today. Try again tomorrow.",
  'no such event': 'This event has ended.',
  'not a member': "You can't post here. The event may have ended or been deleted.",
  'not the host': 'Only the host can delete this event.',
  'already chatting': "You're already in a chat. End it before starting a new one.",
  'already waiting': 'You already have a request waiting. Wait for the answer, or cancel it first.',
  'moving too fast': 'Your location changed too quickly. Wait a few minutes, then try again.',
  'too many location changes': "You've gone live or moved too often in the last 10 minutes. Wait a few minutes, then try again.",
  'too far away': 'You can join an event from within 5 km of it.',
  'objectionable text': "That has words Yap doesn't allow (see the community guidelines). Change them and try again.",
  'invalid title': 'Give your event a title on one line, without special characters.',
  'invalid details': "Some of the details can't be saved. Remove any unusual characters and try again.",
  'invalid reason': 'Pick a reason for the report.',
  'too many reports': "You've reported a lot of people today. Try again tomorrow, or block anyone who bothers you.",
};

// The table rules (check constraints in supabase/migrations) the app can run into, by name.
const CHECK_REFUSALS: Record<string, string> = {
  profiles_first_name_text: 'Your first name needs at least one letter, on one line, without special characters.',
  profiles_last_name_text: 'Your last name needs at least one letter, on one line, without special characters.',
  profiles_intro_text: 'Your intro needs some text, without special characters.',
  profiles_interests_valid: `Pick ${INTEREST_RANGE.min} to ${INTEREST_RANGE.max} different interests.`,
  availability_note_text: 'Notes are one line, without special characters.',
  messages_body_text: 'Messages need some text, without special characters.',
  events_emoji_category: 'Pick one of the event types.',
};

// Called when the server refuses something because the account is hidden or suspended, so the
// store can show the account-restricted screen. Set by the store.
let onRestricted: (() => void) | null = null;

/** Runs `listener` each time the server says the account is restricted (hidden or suspended). */
export function onAccountRestricted(listener: () => void) {
  onRestricted = listener;
}

/** Turns a database or storage error into a sentence for the screen, never raw database text. */
function friendlyRpcError(error: { code?: string; message: string }) {
  if (error.message === 'account restricted') onRestricted?.();
  const refusal = SERVER_REFUSALS[error.message];
  if (refusal) return refusal;
  // 23505 is a unique-index violation. The one people can hit is a second say-hi while
  // their first is still waiting.
  if (error.code === '23505' && error.message.includes('chat_requests_one_pending_idx')) {
    return 'You already have a request waiting. Wait for an answer, then try again.';
  }
  if (error.code === '23505') {
    return "That's already done.";
  }
  // 23514 is a broken table rule (a check constraint); its name says which one.
  if (error.code === '23514') {
    const constraint = error.message.match(/check constraint "([^"]+)"/)?.[1] ?? '';
    return CHECK_REFUSALS[constraint] ?? "Some of what you typed can't be saved. Remove any unusual characters and try again.";
  }
  // Storage refusals: the photos bucket takes JPEG, PNG and WebP up to 1.5 MB, at most 16 files
  // in your folder (twice what the app keeps) and 40 uploads a day.
  if (/exceeded the maximum allowed size/i.test(error.message)) {
    return 'That photo is too big. Choose a different one.';
  }
  if (/mime type/i.test(error.message)) {
    return 'Photos have to be JPEG, PNG or WebP images.';
  }
  if (/row-level security/i.test(error.message)) {
    return "That couldn't be saved just now. Wait a minute and try again.";
  }
  if (/network request failed|failed to fetch|network error|load failed/i.test(error.message)) {
    return "Can't reach Yap right now. Check your connection and try again.";
  }
  if (/jwt expired/i.test(error.message)) {
    return 'Your session has ended. Sign in again.';
  }
  return 'Something went wrong. Please try again.';
}

async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error('Not signed in.');
  return user.id;
}

// ---------------------------------------------------------------- realtime

/**
 * Subscribe a channel as the signed-in user. Returns an unsubscribe function.
 *
 * Realtime only sends a channel the rows its token may read. Some sign-ins (the Forgot
 * password code, for one) don't pass the new token to Realtime, and a channel that joins
 * without it is refused by the database, so nothing ever arrives. Setting the token
 * first means every channel joins as the user.
 *
 * `onSubscribed` runs each time the channel joins: the first time, and again after every
 * reconnect. Realtime doesn't replay what was sent while the channel was away, so that's
 * the moment to fetch anything that might have been missed.
 */
function subscribeAsMe(channel: RealtimeChannel, onSubscribed?: () => void) {
  let stopped = false;
  void supabase.realtime
    .setAuth()
    .catch(() => {
      // Rare (the session couldn't be read); joining anyway beats never joining.
    })
    .then(() => {
      if (stopped) return;
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED' && !stopped) onSubscribed?.();
      });
    });
  return () => {
    stopped = true;
    void supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------- photos

// Photos live in the private `photos` bucket under <userId>/..., and are shown through
// short-lived signed URLs. Storage policies only let a user write their own folder, and only
// sign someone else's photo while the user can see that person (see can_see_photo).
// Each profile picture also has a small copy next to it (<name>-small.jpg) for avatars.

// Short, so a link stops working soon after the owner blocks you or stops being visible to you.
const SIGNED_URL_SECONDS = 15 * 60;
// A signed URL is reused until it has less than this long left, so the same photo keeps
// the same URL and the image cache doesn't download it again on every refresh.
const SIGNED_URL_MIN_LEFT_MS = 5 * 60 * 1000;
// A photo that couldn't be signed is asked for again after this long, so it shows up soon
// after its owner becomes visible to you.
const UNSIGNED_RETRY_MS = 60 * 1000;

// Photos are saved at most this wide, and at most 16:9 tall (1920 px), so a long screenshot
// is cut down too. Thumbnails the same way.
const PHOTO_MAX_WIDTH = 1080;
const THUMB_WIDTH = 320;
// The photos bucket refuses anything bigger (1.5 MB). A 1080 px JPEG is usually far smaller;
// one that isn't is saved again at a lower quality.
const UPLOAD_MAX_BYTES = 1.5 * 1024 * 1024;
const JPEG_QUALITY = 0.8;
const JPEG_QUALITY_SMALLER = 0.6;

// Storage path -> its signed URL, and when that URL stops working. The URL is null when the
// file doesn't exist (e.g. a small copy of a photo uploaded before small copies existed) or
// you can't see that person right now; then it's only kept until it's time to ask again.
const signedUrls = new Map<string, { url: string | null; expiresAt: number }>();

/** Turn storage paths into display URLs, in at most one round trip. Empty paths are skipped. */
async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const toSign: string[] = [];
  for (const path of paths) {
    if (path === '' || toSign.includes(path)) continue;
    const cached = signedUrls.get(path);
    if (cached && cached.expiresAt - now > (cached.url ? SIGNED_URL_MIN_LEFT_MS : 0)) continue;
    toSign.push(path);
  }

  if (toSign.length > 0) {
    // Drop URLs that have stopped working, so the cache only holds people seen lately.
    for (const [path, cached] of signedUrls) {
      if (cached.expiresAt <= now) signedUrls.delete(path);
    }
    const { data, error } = await supabase.storage.from('photos').createSignedUrls(toSign, SIGNED_URL_SECONDS);
    if (error) throw new Error(friendlyRpcError(error));
    for (const entry of data) {
      if (!entry.path) continue;
      const url = entry.signedUrl || null;
      const expiresAt = now + (url ? SIGNED_URL_SECONDS * 1000 : UNSIGNED_RETRY_MS);
      signedUrls.set(entry.path, { url, expiresAt });
    }
  }

  const byPath: Record<string, string> = {};
  for (const path of paths) {
    const url = signedUrls.get(path)?.url;
    if (url) byPath[path] = url;
  }
  return byPath;
}

/**
 * Forget what was kept for the account that just signed out: its signed photo URLs, and any
 * Realtime channel still open (e.g. one waiting for an answer), so the next account starts clean.
 */
export function forgetSession() {
  signedUrls.clear();
  void supabase.removeAllChannels();
}

/** Display URLs for photos that weren't signed with the rest, e.g. when a profile opens. */
export async function signPhotos(paths: string[]): Promise<string[]> {
  const urls = await signPaths(paths);
  return urlsForPaths(urls, paths);
}

/** The storage path of a profile picture's small copy, or null for a path we didn't name. */
function thumbPathFor(path: string | null): string | null {
  if (!path || !path.endsWith('.jpg')) return null;
  return `${path.slice(0, -'.jpg'.length)}-small.jpg`;
}

/** Recover the storage path from a signed URL (so an unchanged photo isn't re-uploaded). */
function pathFromSignedUrl(url: string): string | null {
  // A signed URL looks like .../object/sign/photos/<path>?token=...; capture the <path> part.
  const match = url.match(/\/object\/sign\/photos\/([^?]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]!);
}

/** The signed URL for one storage path, or null when there is no photo. */
function urlForPath(urls: Record<string, string>, path: string | null): string | null {
  if (!path) return null;
  return urls[path] ?? null;
}

/** Signed URLs for a list of storage paths, skipping any that couldn't be signed. */
function urlsForPaths(urls: Record<string, string>, paths: string[]): string[] {
  const result: string[] = [];
  for (const path of paths) {
    const url = urls[path];
    if (url) result.push(url);
  }
  return result;
}

/**
 * A picked photo as JPEG bytes, at most `maxWidth` wide and 16:9 tall (never larger than it
 * was). Throws a sentence for the screen when the file can't be opened (a broken or unusual file).
 */
async function encodeJpeg(uri: string, maxWidth: number, quality: number): Promise<Uint8Array> {
  let savedUri: string;
  try {
    let image = await ImageManipulator.manipulate(uri).renderAsync();
    const maxHeight = Math.round((maxWidth * 16) / 9);
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    if (scale < 1) {
      // Resizes the image already loaded above instead of reading the file again.
      image = await ImageManipulator.manipulate(image).resize({ width: Math.round(image.width * scale) }).renderAsync();
    }
    const saved = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    savedUri = saved.uri;
  } catch {
    throw new Error("That photo couldn't be opened. Choose a different one.");
  }
  return new File(savedUri).bytes();
}

/** Re-encode a picked photo as a small JPEG (see encodeJpeg) and upload it. */
async function uploadJpeg(uri: string, maxWidth: number, path: string) {
  let bytes = await encodeJpeg(uri, maxWidth, JPEG_QUALITY);
  if (bytes.length > UPLOAD_MAX_BYTES) {
    bytes = await encodeJpeg(uri, maxWidth, JPEG_QUALITY_SMALLER);
  }
  if (bytes.length > UPLOAD_MAX_BYTES) {
    throw new Error('That photo is too big. Choose a different one.');
  }
  const { error } = await supabase.storage.from('photos').upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw new Error(friendlyRpcError(error));
}

/**
 * Make sure a photo is in storage and return its path.
 * A `file://` URI (fresh from the picker) is re-encoded as a JPEG of at most 1080 px and
 * uploaded; an `https://` URI is one of our signed URLs, so its path is reused as-is.
 * `withThumb` also uploads the small copy that avatars use.
 */
async function ensureUploaded(uri: string, slot: string, userId: string, withThumb = false): Promise<string> {
  if (!uri.startsWith('file:')) {
    const existing = pathFromSignedUrl(uri);
    if (existing) return existing;
    throw new Error('Unexpected photo location.');
  }
  const path = `${userId}/${slot}-${Date.now()}.jpg`;
  await uploadJpeg(uri, PHOTO_MAX_WIDTH, path);
  const thumbPath = thumbPathFor(path);
  if (withThumb && thumbPath) {
    try {
      await uploadJpeg(uri, THUMB_WIDTH, thumbPath);
    } catch {
      // Optional: without the small copy, avatars just use the full photo.
    }
  }
  return path;
}

/** The files a saved profile uses: its photos and the profile picture's small copy. */
function photoFilesInUse(photoPath: string | null, photoPaths: string[]) {
  const files = [...photoPaths];
  if (photoPath) files.push(photoPath);
  const thumbPath = thumbPathFor(photoPath);
  if (thumbPath) files.push(thumbPath);
  return files;
}

/** Deletes files in my folder that the saved profile no longer uses (replaced photos, failed tries). */
async function removeUnusedPhotos(userId: string, keep: string[]) {
  try {
    const allPaths = await listMyPhotoPaths(userId);
    const unused = allPaths.filter((path) => !keep.includes(path));
    if (unused.length > 0) {
      await supabase.storage.from('photos').remove(unused);
    }
  } catch {
    // Tidying up only; the next successful save tries again.
  }
}

// ---------------------------------------------------------------- profile

/**
 * My profile (null until it is first saved), and whether my account is restricted: hidden after
 * reports until they are reviewed, or suspended.
 */
export async function fetchMyAccount(): Promise<{ profile: Profile | null; restricted: boolean }> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(friendlyRpcError(error));
  if (!data) return { profile: null, restricted: false };

  const urls = await signPaths([data.photo_path ?? '', ...data.photo_paths]);
  const profile: Profile = {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    gender: data.gender as Gender,
    showGender: data.show_gender,
    intro: data.intro,
    interests: data.interests,
    photoUri: urlForPath(urls, data.photo_path),
    photos: urlsForPaths(urls, data.photo_paths),
    isAdult: data.is_adult,
    verified: data.verified,
  };
  return { profile, restricted: data.status !== 'active' };
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const { profile } = await fetchMyAccount();
  return profile;
}

/** Uploads any new photos, saves the row, and returns the stored profile. */
export async function saveProfile(values: Omit<Profile, 'id' | 'verified'>): Promise<Profile> {
  const userId = await requireUserId();
  if (!values.photoUri) throw new Error('A profile picture is required.');

  // The saved row, if any. Files left over from an earlier save that failed halfway are
  // removed first: the storage only takes 16 files per person.
  const existing = await supabase.from('profiles').select('photo_path, photo_paths').eq('id', userId).maybeSingle();
  if (existing.error) throw new Error(friendlyRpcError(existing.error));
  let filesInUse: string[] = [];
  if (existing.data) {
    filesInUse = photoFilesInUse(existing.data.photo_path, existing.data.photo_paths);
  }
  await removeUnusedPhotos(userId, filesInUse);

  const photoPath = await ensureUploaded(values.photoUri, 'profile', userId, true);
  const photoPaths: string[] = [];
  for (let i = 0; i < values.photos.length; i += 1) {
    photoPaths.push(await ensureUploaded(values.photos[i]!, `photo${i}`, userId));
  }

  // Only the columns a client may change after the row exists.
  const fields = {
    first_name: values.firstName,
    last_name: values.lastName,
    gender: values.gender,
    show_gender: values.showGender,
    intro: values.intro,
    interests: values.interests,
    photo_path: photoPath,
    photo_paths: photoPaths,
  };

  // Not an upsert: an upsert's ON CONFLICT clause also sets `id` and `is_adult`, and the
  // database only lets clients update the columns in `fields`, so it is always refused.
  // Insert the row the first time, then update just the editable columns after that.
  if (existing.data) {
    const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
    if (error) throw new Error(friendlyRpcError(error));
  } else {
    const { error } = await supabase.from('profiles').insert({ id: userId, ...fields, is_adult: values.isAdult });
    if (error) throw new Error(friendlyRpcError(error));
  }

  await removeUnusedPhotos(userId, photoFilesInUse(photoPath, photoPaths));

  const profile = await fetchMyProfile();
  if (!profile) throw new Error('Profile failed to save.');
  return profile;
}

// Selfie verification is switched off (src/config/features.ts). When it returns, this
// becomes an Edge Function doing a real face comparison server-side; see issue #17.
export async function verifySelfie(_selfieUri: string, _profilePhotoUri: string): Promise<{ matched: boolean }> {
  return { matched: true };
}

// ---------------------------------------------------------------- person cards

// The server's "person card" (camelCase jsonb from private.person_card) with photo
// paths; here the profile picture becomes signed display URLs. The other photos are
// only signed when someone opens the profile (signPhotos), since lists never show them.
type PersonCard = {
  id: string;
  firstName: string;
  lastInitial: string;
  gender: Gender | null;
  intro: string;
  interests: string[];
  photoPath: string | null;
  photoPaths: string[];
  note: string;
  verified: boolean;
};

async function toPeople(cards: PersonCard[]): Promise<NearbyPerson[]> {
  const paths: string[] = [];
  for (const card of cards) {
    paths.push(card.photoPath ?? '', thumbPathFor(card.photoPath) ?? '');
  }
  const urls = await signPaths(paths);

  return cards.map((card) => ({
    id: card.id,
    firstName: card.firstName,
    lastInitial: card.lastInitial,
    gender: card.gender,
    intro: card.intro,
    interests: card.interests,
    photoUri: urlForPath(urls, card.photoPath),
    thumbUri: urlForPath(urls, thumbPathFor(card.photoPath)),
    photos: [],
    photoPaths: card.photoPaths,
    note: card.note,
    verified: card.verified,
  }));
}

// ---------------------------------------------------------------- going live

const NO_LOCATION = "We couldn't get your location. Try again in a moment.";

/**
 * Go live, or update the live session. Returns the session's start and end as the server
 * set them. The server limits how often and how fast the location can change.
 */
export async function goGreen(args: {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  minutes: number;
  note: string;
}): Promise<{ startedAt: number; expiresAt: number }> {
  if (args.latitude === null || args.longitude === null) {
    throw new Error(NO_LOCATION);
  }
  const { data, error } = await supabase.rpc('go_green', {
    lat: args.latitude,
    lng: args.longitude,
    // 0 means a perfect fix. The server only keeps it (as 0 to 50 m); it doesn't change who is nearby.
    accuracy: args.accuracy ?? 0,
    minutes: args.minutes,
    note: args.note,
  });
  if (error) throw new Error(friendlyRpcError(error));
  const times = data as { startedAt: number; expiresAt: number };
  return { startedAt: times.startedAt, expiresAt: times.expiresAt };
}

export async function updateNote(note: string) {
  const { error } = await supabase.rpc('update_note', { note });
  if (error) throw new Error(friendlyRpcError(error));
}

export async function goOffline() {
  const { error } = await supabase.rpc('go_offline');
  if (error) throw new Error(friendlyRpcError(error));
}

/** Who's live near me. The server leaves out anyone blocked either way. */
export async function nearby(): Promise<NearbyPerson[]> {
  const { data, error } = await supabase.rpc('nearby');
  if (error) throw new Error(friendlyRpcError(error));
  return toPeople((data ?? []) as PersonCard[]);
}

// ---------------------------------------------------------------- say hi

export async function sendRequest(to: NearbyPerson): Promise<{ id: string; expiresAt: number }> {
  const { data, error } = await supabase.rpc('send_request', { target: to.id });
  if (error) throw new Error(friendlyRpcError(error));
  const result = data as { id: string; expiresAt: number };
  return { id: result.id, expiresAt: result.expiresAt };
}

/**
 * Resolves when the recipient answers: Realtime delivers the status change, a slow poll
 * covers dropped connections, and a timeout turns an unanswered request into the same
 * silent "not this time".
 */
export function waitForAnswer(requestId: string, expiresAt: number): Promise<'accepted' | 'not-this-time'> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (outcome: 'accepted' | 'not-this-time') => {
      if (settled) return;
      settled = true;
      stopListening();
      clearInterval(poll);
      clearTimeout(timeout);
      resolve(outcome);
    };

    const onStatus = (status: string | undefined) => {
      if (status === 'accepted') {
        finish('accepted');
        return;
      }
      // Declined or expired: anything other than still waiting.
      if (status && status !== 'pending') {
        finish('not-this-time');
      }
    };

    const channel = supabase
      .channel(`request-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_requests', filter: `id=eq.${requestId}` },
        (payload) => onStatus((payload.new as { status?: string }).status),
      );
    const stopListening = subscribeAsMe(channel);

    const poll = setInterval(async () => {
      const { data } = await supabase.from('chat_requests').select('status').eq('id', requestId).maybeSingle();
      onStatus(data?.status);
    }, 7000);

    // A few seconds of grace after the deadline, in case the answer is still on its way.
    const msUntilExpiry = Math.max(0, expiresAt - serverNow());
    const timeout = setTimeout(() => finish('not-this-time'), msUntilExpiry + 3000);
  });
}

/** Withdraws my waiting request, so it can't be accepted any more. */
export async function cancelRequest(requestId: string) {
  const { error } = await supabase.rpc('cancel_request', { request_id: requestId });
  if (error) throw new Error(friendlyRpcError(error));
}

export async function respond(requestId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond', { request_id: requestId, accept });
  if (error) throw new Error(friendlyRpcError(error));
}

/** The other participant of a request, as a person card. */
export async function requestPerson(requestId: string): Promise<NearbyPerson | null> {
  const { data, error } = await supabase.rpc('request_person', { request_id: requestId });
  if (error) throw new Error(friendlyRpcError(error));
  if (!data) return null;
  const [person] = await toPeople([data as unknown as PersonCard]);
  return person ?? null;
}

type RequestSummary = { id: string; expiresAt: number };

/**
 * The newest say-hi request still waiting for my answer, or null. Realtime only delivers
 * a request while the app is connected, so this catches up on one sent while it wasn't.
 */
export async function pendingIncoming(): Promise<RequestSummary | null> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('chat_requests')
    .select('id, expires_at')
    .eq('to_user', myId)
    .eq('status', 'pending')
    .gt('expires_at', new Date(serverNow()).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(friendlyRpcError(error));
  if (!data) return null;
  return { id: data.id, expiresAt: Date.parse(data.expires_at) };
}

/** Where a request or chat stands now ('pending', 'accepted', 'met', ...), or null once it's gone. */
export async function requestStatus(requestId: string): Promise<string | null> {
  const { data, error } = await supabase.from('chat_requests').select('status').eq('id', requestId).maybeSingle();
  if (error) throw new Error(friendlyRpcError(error));
  if (!data) return null;
  return data.status;
}

/**
 * New requests for me, delivered over Realtime. `onSubscribed` runs each time the
 * channel (re)joins. Returns an unsubscribe function.
 */
export function subscribeIncoming(
  userId: string,
  onRequest: (request: RequestSummary) => void,
  onSubscribed: () => void,
) {
  const channel = supabase
    .channel('incoming-requests')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_requests', filter: `to_user=eq.${userId}` },
      (payload) => {
        const row = payload.new as { id: string; expires_at: string; status: string };
        if (row.status !== 'pending') return;
        onRequest({ id: row.id, expiresAt: Date.parse(row.expires_at) });
      },
    );
  return subscribeAsMe(channel, onSubscribed);
}

// ---------------------------------------------------------------- chat

export async function endChat(chatId: string, outcome: 'met' | 'cancelled') {
  const { error } = await supabase.rpc('end_chat', { request_id: chatId, outcome });
  if (error) throw new Error(friendlyRpcError(error));
}

/**
 * Sends a chat message and returns it as saved (Realtime delivers the same row to both sides),
 * or 'chat-ended' when the other person already ended the chat (or blocked, or left Yap).
 */
export async function sendMessage(chatId: string, text: string): Promise<Message | 'chat-ended'> {
  const myId = await requireUserId();
  const { data, error } = await supabase.rpc('send_chat_message', { request_id: chatId, body: text });
  if (error && error.message === 'no such chat') return 'chat-ended';
  if (error) throw new Error(friendlyRpcError(error));
  return toMessage(data as unknown as MessageRow, myId);
}

/** Sends a group message and returns it as saved, like sendMessage. */
export async function sendEventMessage(eventId: string, text: string): Promise<Message> {
  const myId = await requireUserId();
  const { data, error } = await supabase.rpc('send_event_message', { event_id: eventId, body: text });
  if (error) throw new Error(friendlyRpcError(error));
  return toMessage(data as unknown as MessageRow, myId);
}

type MessageRow = {
  id: string;
  sender: string;
  sender_name: string;
  body: string;
  created_at: string;
};

function toMessage(row: MessageRow, myId: string): Message {
  let senderId = row.sender;
  let senderName = row.sender_name;
  if (row.sender === myId) {
    senderId = 'me';
    senderName = 'You';
  }
  return {
    id: row.id,
    senderId,
    senderName,
    text: row.body,
    sentAt: Date.parse(row.created_at),
  };
}

const HISTORY_LIMIT = 200;

/** The newest 200 messages of a chat or event, oldest first. */
async function fetchMessages(column: 'request_id' | 'event_id', id: string): Promise<Message[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, sender_name, body, created_at')
    .eq(column, id)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw new Error(friendlyRpcError(error));
  // Fetched newest first so the limit keeps the latest ones; shown oldest first.
  const messages = (data ?? []).map((row) => toMessage(row, myId));
  messages.reverse();
  return messages;
}

export function fetchChatMessages(chatId: string) {
  return fetchMessages('request_id', chatId);
}

export function fetchEventMessages(eventId: string) {
  return fetchMessages('event_id', eventId);
}

/**
 * New messages in an event's group chat, over Realtime. `onSubscribed` runs each time the
 * channel (re)joins. Returns an unsubscribe function.
 */
export function subscribeEventMessages(
  eventId: string,
  myId: string,
  onMessage: (message: Message) => void,
  onSubscribed: () => void,
) {
  const channel = supabase
    .channel(`messages-event_id-${eventId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${eventId}` },
      (payload) => onMessage(toMessage(payload.new as MessageRow, myId)),
    );
  return subscribeAsMe(channel, onSubscribed);
}

/**
 * The 1:1 chat over Realtime: new messages, and the chat ending on the other side (they
 * tapped End or blocked you). `onSubscribed` runs each time the channel (re)joins.
 * Returns an unsubscribe function.
 */
export function subscribeChat(
  chatId: string,
  myId: string,
  handlers: { onMessage: (message: Message) => void; onEnded: () => void; onSubscribed: () => void },
) {
  const channel = supabase
    .channel(`chat-${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${chatId}` },
      (payload) => handlers.onMessage(toMessage(payload.new as MessageRow, myId)),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_requests', filter: `id=eq.${chatId}` },
      (payload) => {
        const status = (payload.new as { status?: string }).status;
        if (status && status !== 'accepted') handlers.onEnded();
      },
    );
  return subscribeAsMe(channel, handlers.onSubscribed);
}

// ---------------------------------------------------------------- safety

export async function block(userId: string) {
  const { error } = await supabase.rpc('block_user', { target: userId });
  if (error) throw new Error(friendlyRpcError(error));
}

export async function unblock(userId: string) {
  const myId = await requireUserId();
  const { error } = await supabase.from('blocks').delete().eq('blocker', myId).eq('blocked', userId);
  if (error) throw new Error(friendlyRpcError(error));
}

type BlockedPerson = { id: string; firstName: string; lastInitial: string };

export async function blockedList(): Promise<BlockedPerson[]> {
  const { data, error } = await supabase.rpc('blocked_list');
  if (error) throw new Error(friendlyRpcError(error));
  return (data ?? []) as BlockedPerson[];
}

export async function report(userId: string, reason: ReportReason, details: string) {
  const { error } = await supabase.rpc('report_user', { target: userId, reason, details });
  if (error) throw new Error(friendlyRpcError(error));
}

const PHOTO_LIST_PAGE_SIZE = 100;

/** Every photo path in my folder of the `photos` bucket (<userId>/...), one page at a time. */
async function listMyPhotoPaths(userId: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from('photos')
      .list(userId, { limit: PHOTO_LIST_PAGE_SIZE, offset });
    if (error) throw new Error(friendlyRpcError(error));
    for (const item of data) {
      paths.push(`${userId}/${item.name}`);
    }
    if (data.length < PHOTO_LIST_PAGE_SIZE) break;
    offset += PHOTO_LIST_PAGE_SIZE;
  }
  return paths;
}

/**
 * Removes my photos through the Storage API, then deletes the account itself.
 * The photos have to go first: once the account is gone this session can't reach Storage.
 */
export async function deleteAccount() {
  const userId = await requireUserId();
  const photoPaths = await listMyPhotoPaths(userId);
  if (photoPaths.length > 0) {
    const { error: removeError } = await supabase.storage.from('photos').remove(photoPaths);
    if (removeError) throw new Error(friendlyRpcError(removeError));
  }

  const { error } = await supabase.rpc('delete_account');
  if (error) throw new Error(friendlyRpcError(error));
  await signOut();
}

// ---------------------------------------------------------------- restart

type MyStatus = {
  live: { note: string; startedAt: number; expiresAt: number } | null;
  chatId: string | null;
  outgoing: { id: string; expiresAt: number; to: NearbyPerson } | null; // the request I'm waiting on
};

type MyStatusRow = {
  now?: number; // the server's clock (ms); missing before the October 2026 hardening migration
  live: MyStatus['live'];
  chatId: string | null;
  outgoing: { id: string; expiresAt: number; to: PersonCard } | null;
};

/** Whether I'm live, have an open chat, or am waiting on a request - for restoring state on app start. */
export async function myStatus(): Promise<MyStatus> {
  const sentAt = Date.now();
  const { data, error } = await supabase.rpc('my_status');
  if (error) throw new Error(friendlyRpcError(error));
  const status = data as MyStatusRow | null;
  // Learn how far the phone's clock is off, so countdowns end when the server's deadlines do.
  if (typeof status?.now === 'number') syncServerClock(status.now, sentAt, Date.now());

  let outgoing: MyStatus['outgoing'] = null;
  if (status?.outgoing) {
    const [to] = await toPeople([status.outgoing.to]);
    if (to) {
      outgoing = { id: status.outgoing.id, expiresAt: status.outgoing.expiresAt, to };
    }
  }
  return { live: status?.live ?? null, chatId: status?.chatId ?? null, outgoing };
}

// ---------------------------------------------------------------- map events

type EventCard = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  startsAt: number;
  host: { id: string; firstName: string; lastInitial: string; photoPath: string | null };
  memberCount: number;
  joined: boolean;
};

/** The host's small photo when it has one (it's only ever shown as a small avatar), else the full one. */
function hostPhotoUrl(urls: Record<string, string>, photoPath: string | null): string | null {
  const thumbUrl = urlForPath(urls, thumbPathFor(photoPath));
  if (thumbUrl) return thumbUrl;
  return urlForPath(urls, photoPath);
}

async function toEvents(cards: EventCard[]): Promise<MapEvent[]> {
  const hostPhotoPaths: string[] = [];
  for (const card of cards) {
    hostPhotoPaths.push(card.host.photoPath ?? '', thumbPathFor(card.host.photoPath) ?? '');
  }
  const urls = await signPaths(hostPhotoPaths);
  return cards.map((card) => ({
    id: card.id,
    emoji: card.emoji,
    title: card.title,
    description: card.description,
    latitude: card.latitude,
    longitude: card.longitude,
    startsAt: card.startsAt,
    host: {
      id: card.host.id,
      firstName: card.host.firstName,
      lastInitial: card.host.lastInitial,
      photoUri: hostPhotoUrl(urls, card.host.photoPath),
    },
    memberCount: card.memberCount,
    joined: card.joined,
    messages: [],
  }));
}

// Refusals that only mean the server kept the position it already had for you.
const POSITION_KEPT = new Set(['moving too fast', 'too many location changes']);

/**
 * Tells the server where the phone is, for the map and joining events. The server only changes
 * your position as often and as fast as going live allows; when it keeps the one it has, the
 * map just uses that one.
 */
async function setMapPosition(position: { latitude: number; longitude: number }) {
  const { error } = await supabase.rpc('set_map_position', { lat: position.latitude, lng: position.longitude });
  if (error && !POSITION_KEPT.has(error.message)) throw new Error(friendlyRpcError(error));
}

/**
 * Events within `radiusM` metres of the phone's position, which is sent first (setMapPosition):
 * the server lists events only around the position it holds for you. Leave the radius out for
 * the server's default of 10 km; the server never goes beyond 50 km.
 */
export async function eventsNear(
  position: { latitude: number; longitude: number },
  radiusM?: number,
): Promise<MapEvent[]> {
  await setMapPosition(position);
  // An undefined radius is left out of the request, so the server's default applies.
  const { data, error } = await supabase.rpc('events_near', { radius_m: radiusM });
  if (error) throw new Error(friendlyRpcError(error));
  return toEvents((data ?? []) as EventCard[]);
}

export async function createEvent(input: {
  emoji: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  startsAt: number;
}): Promise<MapEvent> {
  const { data, error } = await supabase.rpc('create_event', {
    emoji: input.emoji,
    title: input.title,
    description: input.description,
    lat: input.latitude,
    lng: input.longitude,
    starts_at_ms: input.startsAt,
  });
  if (error) throw new Error(friendlyRpcError(error));
  const [event] = await toEvents([data as unknown as EventCard]);
  if (!event) throw new Error('Event failed to save.');
  return event;
}

/**
 * Join an event from where the phone is (sent first, as for eventsNear); the server only allows
 * it within about 5 km of the position it holds for you.
 * Returns 'event-deleted' when the host already deleted it.
 */
export async function joinEvent(
  eventId: string,
  position: { latitude: number | null; longitude: number | null },
): Promise<'event-deleted' | void> {
  if (position.latitude === null || position.longitude === null) {
    throw new Error(NO_LOCATION);
  }
  await setMapPosition({ latitude: position.latitude, longitude: position.longitude });
  const { error } = await supabase.rpc('join_event', { event_id: eventId });
  if (error && error.message === 'no such event') return 'event-deleted';
  if (error) throw new Error(friendlyRpcError(error));
}

export async function leaveEvent(eventId: string) {
  const { error } = await supabase.rpc('leave_event', { event_id: eventId });
  if (error) throw new Error(friendlyRpcError(error));
}

/**
 * Deletes an event you host. Who joined it and its group chat go with it. One already
 * deleted (from another phone, say) counts as done.
 */
export async function deleteEvent(eventId: string) {
  const { error } = await supabase.rpc('delete_event', { event_id: eventId });
  if (error && error.message === 'no such event') return;
  if (error) throw new Error(friendlyRpcError(error));
}
