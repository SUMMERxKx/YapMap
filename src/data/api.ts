// The app's only doorway to the backend. Every function here wraps a Supabase call -
// mostly the database functions from supabase/migrations, which enforce all the rules
// server-side (proximity, blocks, rate limits). Screens and the store never import
// supabase directly; they call these.

import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

import type { Gender, MapEvent, Message, NearbyPerson, Profile, ReportReason } from './types';

// ---------------------------------------------------------------- auth

export async function requestEmailCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function verifyEmailCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error('Invalid or expired code. Please request a new one.');
}

/** The signed-in user, or null. */
export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
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
  await supabase.auth.signOut();
}

function friendlyAuthError(message: string) {
  if (/rate limit/i.test(message)) {
    return 'Too many codes requested. Please wait a bit and try again.';
  }
  return message;
}

async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error('Not signed in.');
  return user.id;
}

// ---------------------------------------------------------------- photos

// Photos live in the private `photos` bucket under <userId>/..., and are shown through
// short-lived signed URLs. Storage policies only let a user write their own folder.

const SIGNED_URL_SECONDS = 60 * 60;

/** Turn storage paths into display URLs, in one round trip. */
async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from('photos').createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) throw error;
  const byPath: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && entry.path) byPath[entry.path] = entry.signedUrl;
  }
  return byPath;
}

/** Recover the storage path from a signed URL (so an unchanged photo isn't re-uploaded). */
function pathFromSignedUrl(url: string): string | null {
  const match = url.match(/\/object\/sign\/photos\/([^?]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Make sure a photo is in storage and return its path.
 * A `file://` URI (fresh from the picker) is resized to ~1080 px, re-encoded as JPEG and
 * uploaded; an `https://` URI is one of our signed URLs, so its path is reused as-is.
 */
async function ensureUploaded(uri: string, slot: string, userId: string): Promise<string> {
  if (!uri.startsWith('file:')) {
    const existing = pathFromSignedUrl(uri);
    if (existing) return existing;
    throw new Error('Unexpected photo location.');
  }
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1080 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  const bytes = await new File(saved.uri).bytes();
  const path = `${userId}/${slot}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

// ---------------------------------------------------------------- profile

export async function fetchMyProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const urls = await signPaths([data.photo_path ?? '', ...data.photo_paths]);
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    gender: data.gender as Gender,
    showGender: data.show_gender,
    intro: data.intro,
    interests: data.interests,
    photoUri: data.photo_path ? (urls[data.photo_path] ?? null) : null,
    photos: data.photo_paths.map((p) => urls[p]).filter((u): u is string => !!u),
    isAdult: data.is_adult,
    verified: data.verified,
  };
}

/** Uploads any new photos, saves the row, and returns the stored profile. */
export async function saveProfile(values: Omit<Profile, 'id' | 'verified'>): Promise<Profile> {
  const userId = await requireUserId();
  if (!values.photoUri) throw new Error('A profile picture is required.');

  const photoPath = await ensureUploaded(values.photoUri, 'profile', userId);
  const photoPaths: string[] = [];
  for (let i = 0; i < values.photos.length; i += 1) {
    photoPaths.push(await ensureUploaded(values.photos[i]!, `photo${i}`, userId));
  }

  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    first_name: values.firstName,
    last_name: values.lastName,
    gender: values.gender,
    show_gender: values.showGender,
    intro: values.intro,
    interests: values.interests,
    photo_path: photoPath,
    photo_paths: photoPaths,
    is_adult: values.isAdult,
  });
  if (error) throw error;

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
// paths; here they become signed display URLs.
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
  const urls = await signPaths(cards.flatMap((c) => [c.photoPath ?? '', ...c.photoPaths]));
  return cards.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastInitial: c.lastInitial,
    gender: c.gender,
    intro: c.intro,
    interests: c.interests,
    photoUri: c.photoPath ? (urls[c.photoPath] ?? null) : null,
    photos: c.photoPaths.map((p) => urls[p]).filter((u): u is string => !!u),
    note: c.note,
    verified: c.verified,
  }));
}

// ---------------------------------------------------------------- going live

export async function goGreen(args: {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  minutes: number;
  note: string;
}) {
  if (args.latitude === null || args.longitude === null) {
    throw new Error("We couldn't get your location. Try again in a moment.");
  }
  const { error } = await supabase.rpc('go_green', {
    lat: args.latitude,
    lng: args.longitude,
    // 0 means a perfect fix; the server adds the accuracy to its 100 m base radius.
    accuracy: args.accuracy ?? 0,
    minutes: args.minutes,
    note: args.note,
  });
  if (error) throw error;
}

export async function updateNote(note: string) {
  const { error } = await supabase.rpc('update_note', { note });
  if (error) throw error;
}

export async function goOffline() {
  const { error } = await supabase.rpc('go_offline');
  if (error) throw error;
}

/** Who's live near me. The server already filters blocks, so the argument is unused. */
export async function nearby(_blockedIds: string[]): Promise<NearbyPerson[]> {
  const { data, error } = await supabase.rpc('nearby');
  if (error) throw error;
  return toPeople((data ?? []) as PersonCard[]);
}

// ---------------------------------------------------------------- say hi

export async function sendRequest(to: NearbyPerson): Promise<{ id: string; expiresAt: number }> {
  const { data, error } = await supabase.rpc('send_request', { target: to.id });
  if (error) throw error;
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
      supabase.removeChannel(channel);
      clearInterval(poll);
      clearTimeout(timeout);
      resolve(outcome);
    };

    const onStatus = (status: string | undefined) => {
      if (status === 'accepted') finish('accepted');
      else if (status && status !== 'pending') finish('not-this-time');
    };

    const channel = supabase
      .channel(`request-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_requests', filter: `id=eq.${requestId}` },
        (payload) => onStatus((payload.new as { status?: string }).status),
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase.from('chat_requests').select('status').eq('id', requestId).maybeSingle();
      onStatus(data?.status);
    }, 7000);

    const timeout = setTimeout(() => finish('not-this-time'), Math.max(0, expiresAt - Date.now()) + 3000);
  });
}

export async function respond(requestId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond', { request_id: requestId, accept });
  if (error) throw error;
}

/** The other participant of a request, as a person card. */
export async function requestPerson(requestId: string): Promise<NearbyPerson | null> {
  const { data, error } = await supabase.rpc('request_person', { request_id: requestId });
  if (error) throw error;
  if (!data) return null;
  const [person] = await toPeople([data as unknown as PersonCard]);
  return person ?? null;
}

/** New requests for me, delivered over Realtime. Returns an unsubscribe function. */
export function subscribeIncoming(userId: string, onRequest: (request: { id: string; expiresAt: number }) => void) {
  const channel = supabase
    .channel('incoming-requests')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_requests', filter: `to_user=eq.${userId}` },
      (payload) => {
        const row = payload.new as { id: string; expires_at: string; status: string };
        if (row.status === 'pending') onRequest({ id: row.id, expiresAt: Date.parse(row.expires_at) });
      },
    )
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

// ---------------------------------------------------------------- chat

export async function endChat(chatId: string, outcome: 'met' | 'cancelled') {
  const { error } = await supabase.rpc('end_chat', { request_id: chatId, outcome });
  if (error) throw error;
}

export async function sendMessage(chatId: string, text: string) {
  const { error } = await supabase.rpc('send_chat_message', { request_id: chatId, body: text });
  if (error) throw error;
}

export async function sendEventMessage(eventId: string, text: string) {
  const { error } = await supabase.rpc('send_event_message', { event_id: eventId, body: text });
  if (error) throw error;
}

type MessageRow = {
  id: string;
  sender: string;
  sender_name: string;
  body: string;
  created_at: string;
};

function toMessage(row: MessageRow, myId: string): Message {
  return {
    id: row.id,
    senderId: row.sender === myId ? 'me' : row.sender,
    senderName: row.sender === myId ? 'You' : row.sender_name,
    text: row.body,
    sentAt: Date.parse(row.created_at),
  };
}

async function fetchMessages(column: 'request_id' | 'event_id', id: string): Promise<Message[]> {
  const myId = await requireUserId();
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, sender_name, body, created_at')
    .eq(column, id)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => toMessage(row, myId));
}

export const fetchChatMessages = (chatId: string) => fetchMessages('request_id', chatId);
export const fetchEventMessages = (eventId: string) => fetchMessages('event_id', eventId);

/** New messages in a chat or event, over Realtime. Returns an unsubscribe function. */
export function subscribeMessages(
  column: 'request_id' | 'event_id',
  id: string,
  myId: string,
  onMessage: (message: Message) => void,
) {
  const channel = supabase
    .channel(`messages-${column}-${id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `${column}=eq.${id}` },
      (payload) => onMessage(toMessage(payload.new as MessageRow, myId)),
    )
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

// ---------------------------------------------------------------- safety

export async function block(userId: string) {
  const { error } = await supabase.rpc('block_user', { target: userId });
  if (error) throw error;
}

export async function unblock(userId: string) {
  const myId = await requireUserId();
  const { error } = await supabase.from('blocks').delete().eq('blocker', myId).eq('blocked', userId);
  if (error) throw error;
}

export async function blockedList(): Promise<{ id: string; firstName: string; lastInitial: string }[]> {
  const { data, error } = await supabase.rpc('blocked_list');
  if (error) throw error;
  return (data ?? []) as { id: string; firstName: string; lastInitial: string }[];
}

export async function report(userId: string, reason: ReportReason, details: string) {
  const { error } = await supabase.rpc('report_user', { target: userId, reason, details });
  if (error) throw error;
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------- restart

/** Whether I'm live and whether I have an open chat - for restoring state on app start. */
export async function myStatus(): Promise<{
  live: { note: string; startedAt: number; expiresAt: number } | null;
  chatId: string | null;
}> {
  const { data, error } = await supabase.rpc('my_status');
  if (error) throw error;
  const status = data as { live: { note: string; startedAt: number; expiresAt: number } | null; chatId: string | null };
  return { live: status?.live ?? null, chatId: status?.chatId ?? null };
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

async function toEvents(cards: EventCard[]): Promise<MapEvent[]> {
  const urls = await signPaths(cards.map((c) => c.host.photoPath ?? ''));
  return cards.map((c) => ({
    id: c.id,
    emoji: c.emoji,
    title: c.title,
    description: c.description,
    latitude: c.latitude,
    longitude: c.longitude,
    startsAt: c.startsAt,
    host: {
      id: c.host.id,
      firstName: c.host.firstName,
      lastInitial: c.host.lastInitial,
      photoUri: c.host.photoPath ? (urls[c.host.photoPath] ?? null) : null,
    },
    memberCount: c.memberCount,
    joined: c.joined,
    messages: [],
  }));
}

export async function eventsNear(center: { latitude: number; longitude: number }): Promise<MapEvent[]> {
  const { data, error } = await supabase.rpc('events_near', { lat: center.latitude, lng: center.longitude });
  if (error) throw error;
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
  if (error) throw error;
  const [event] = await toEvents([data as unknown as EventCard]);
  if (!event) throw new Error('Event failed to save.');
  return event;
}

export async function joinEvent(eventId: string) {
  const { error } = await supabase.rpc('join_event', { event_id: eventId });
  if (error) throw error;
}

export async function leaveEvent(eventId: string) {
  const { error } = await supabase.rpc('leave_event', { event_id: eventId });
  if (error) throw error;
}
