// All app state and the actions that change it, in one small external store
// (useSyncExternalStore). Screens read slices with useStore(selector) and call the
// exported actions; nothing outside this file writes state. Actions talk to the backend
// through src/data/api.ts, and this file also owns the Realtime subscriptions (incoming
// requests, chat messages, event messages).

import { Alert } from 'react-native';
import { useSyncExternalStore } from 'react';

import * as api from '@/data/api';
import type {
  Availability,
  ChatSession,
  IncomingRequest,
  MapEvent,
  NearbyPerson,
  OutgoingRequest,
  Profile,
  ReportReason,
} from '@/data/types';
import { errorMessage } from '@/lib/error-message';

export type NearbyAlert =
  | { id: string; kind: 'summary'; count: number }
  | { id: string; kind: 'person'; person: NearbyPerson };

type State = {
  booted: boolean; // the stored session and profile have been loaded
  myId: string | null;
  session: { email: string } | null;
  profile: Profile | null;
  availability: Availability | null;
  availabilityExpired: boolean; // shows "Your time's up" until dismissed
  outgoing: OutgoingRequest | null;
  incoming: IncomingRequest | null;
  chat: ChatSession | null; // the 1:1 chat with your current yap partner
  blockedIds: string[];
  blockedNames: Record<string, string>;
  safetyTipViews: number;
  seenTutorial: boolean;
  nearbyAlert: NearbyAlert | null;
  events: MapEvent[];
};

const initialState: State = {
  booted: false,
  myId: null,
  session: null,
  profile: null,
  availability: null,
  availabilityExpired: false,
  outgoing: null,
  incoming: null,
  chat: null,
  blockedIds: [],
  blockedNames: {},
  safetyTipViews: 0,
  seenTutorial: false,
  nearbyAlert: null,
  events: [],
};

let state = initialState;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore<T>(selector: (state: State) => T): T {
  const readSlice = () => selector(state);
  return useSyncExternalStore(subscribe, readSlice, readSlice);
}

// ---------------------------------------------------------------- realtime plumbing

// Unsubscribe functions for the channels this store keeps open. Only ever one of each.
let stopIncoming: (() => void) | null = null;
let stopChatMessages: (() => void) | null = null;
let stopEventMessages: (() => void) | null = null;

function teardownRealtime() {
  stopIncoming?.();
  stopChatMessages?.();
  stopEventMessages?.();
  stopIncoming = null;
  stopChatMessages = null;
  stopEventMessages = null;
}

// ---------------------------------------------------------------- boot

let initStarted = false;

/** Called once from the root layout: restore the session, profile and live state. */
export async function init() {
  if (initStarted) return;
  initStarted = true;

  // Sign-out (from anywhere, including account deletion) resets the app.
  api.onAuthStateChange((signedIn) => {
    if (!signedIn) {
      teardownRealtime();
      set({ ...initialState, booted: true });
    }
  });

  try {
    const user = await api.getSessionUser();
    if (user) {
      set({ myId: user.id, session: { email: user.email ?? '' } });
      await refreshAfterAuth();
    }
  } catch {
    // Offline at launch: stay signed out visually; the next sign-in sorts it out.
  }
  set({ booted: true });
}

/** Load everything a signed-in session needs; safe to call again after sign-in. */
async function refreshAfterAuth() {
  const user = await api.getSessionUser();
  if (!user) return;
  set({ myId: user.id, session: { email: user.email ?? '' } });

  const profile = await api.fetchMyProfile();
  set({ profile });
  if (!profile) return; // the layout sends them to profile setup

  const blocked = await api.blockedList();
  const blockedIds: string[] = [];
  const blockedNames: Record<string, string> = {};
  for (const person of blocked) {
    blockedIds.push(person.id);
    blockedNames[person.id] = `${person.firstName} ${person.lastInitial}.`;
  }
  set({ blockedIds, blockedNames });

  // New say-hi requests arrive over Realtime for the whole session.
  stopIncoming?.();
  stopIncoming = api.subscribeIncoming(user.id, (request) => void onIncoming(request));

  // If the app was killed while live or mid-chat, pick up where things stand.
  const status = await api.myStatus();
  const live = status.live;
  if (live) {
    set({
      availability: {
        minutes: nearestDuration(live.expiresAt - live.startedAt),
        note: live.note,
        startedAt: live.startedAt,
        expiresAt: live.expiresAt,
      },
    });
  }
  if (status.chatId) await openChat(status.chatId);
}

/** The live-duration option (30, 60 or 120 minutes) closest to a session's length. */
function nearestDuration(ms: number): Availability['minutes'] {
  const minutes = Math.round(ms / 60000);
  if (minutes <= 30) return 30;
  if (minutes <= 60) return 60;
  return 120;
}

// ---------------------------------------------------------------- auth & profile

/** Returns true when a code was emailed to confirm the account (the verify screen is next). */
export async function signUp(email: string, password: string) {
  const needsCode = await api.signUp(email, password);
  if (!needsCode) await refreshAfterAuth();
  return needsCode;
}

export async function confirmSignUp(email: string, code: string) {
  await api.verifySignUpCode(email, code);
  await refreshAfterAuth(); // the root layout then moves on to profile setup
}

/** Returns 'unconfirmed' when the account still needs its emailed code. */
export async function signInWithPassword(email: string, password: string) {
  const result = await api.signInWithPassword(email, password);
  if (result === 'signed-in') await refreshAfterAuth();
  return result;
}

/** Forgot password, last step: the reset code already signed in, so save the password and go in. */
export async function finishPasswordReset(password: string) {
  await api.setPassword(password);
  await refreshAfterAuth();
}

// Hidden behind FEATURES.socialSignIn until Apple/Google are configured in Supabase Auth.
export function signInWithProvider(_provider: 'apple' | 'google') {
  Alert.alert('Not available yet', 'Use email sign-in for now.');
}

/** Saves the profile (uploads photos first). A changed photo re-triggers the selfie check. */
export async function saveProfile(values: Omit<Profile, 'id' | 'verified'>) {
  const previous = state.profile;
  const stored = await api.saveProfile(values);
  // Keep an earlier verification only while the profile photo stays the same.
  let keepsVerification = false;
  if (previous && previous.verified && previous.photoUri === values.photoUri) {
    keepsVerification = true;
  }
  set({ profile: { ...stored, verified: stored.verified || keepsVerification } });
}

export async function verifySelfie(selfieUri: string) {
  const photo = state.profile?.photoUri;
  if (!photo) throw new Error('Add a profile photo first.');
  const { matched } = await api.verifySelfie(selfieUri, photo);
  return matched;
}

export function markVerified() {
  if (!state.profile) return;
  set({ profile: { ...state.profile, verified: true } });
}

export async function signOut() {
  await api.signOut(); // the auth listener resets the state
}

export async function deleteAccount() {
  await api.deleteAccount(); // signs out too; the auth listener resets the state
}

// ---------------------------------------------------------------- availability

export async function goGreen(args: {
  minutes: Availability['minutes'];
  note: string;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
}) {
  await api.goGreen(args);
  const now = Date.now();
  set({
    availability: {
      minutes: args.minutes,
      note: args.note,
      startedAt: now,
      expiresAt: now + args.minutes * 60 * 1000,
    },
    availabilityExpired: false,
  });
}

export async function updateNote(note: string) {
  if (!state.availability) return;
  set({ availability: { ...state.availability, note } });
  await api.updateNote(note);
}

export async function goOffline(reason: 'done' | 'expired' = 'done') {
  set({
    availability: null,
    outgoing: null,
    nearbyAlert: null,
    availabilityExpired: reason === 'expired',
  });
  try {
    await api.goOffline();
  } catch {
    // The cron job cleans up server-side if this call doesn't get through.
  }
}

export function dismissExpired() {
  set({ availabilityExpired: false });
}

// ---------------------------------------------------------------- say hi

/** Sends the request (throws if the server refuses), then waits for the answer. */
export async function sayHi(to: NearbyPerson) {
  if (state.outgoing?.status === 'pending') return; // one request at a time
  const { id, expiresAt } = await api.sendRequest(to);
  set({ outgoing: { id, to, expiresAt, status: 'pending' } });
  void watchAnswer(id, to);
}

async function watchAnswer(id: string, to: NearbyPerson) {
  const outgoing = state.outgoing;
  if (!outgoing) return;
  const outcome = await api.waitForAnswer(id, outgoing.expiresAt);
  if (state.outgoing?.id !== id) return; // cancelled meanwhile
  if (outcome === 'accepted') {
    set({ outgoing: { ...state.outgoing, status: 'accepted' } });
    await openChat(id, to);
  } else {
    set({ outgoing: { ...state.outgoing, status: 'not-this-time' } });
  }
}

export function cancelRequest() {
  set({ outgoing: null });
}

export function expireOutgoing() {
  if (state.outgoing?.status === 'pending') {
    set({ outgoing: { ...state.outgoing, status: 'not-this-time' } });
  }
}

export function clearOutgoing() {
  set({ outgoing: null });
}

async function onIncoming(request: { id: string; expiresAt: number }) {
  // One thing at a time: while a request or chat is on screen, later ones just expire
  // on the server and their senders see the usual "not this time".
  if (state.incoming || state.chat) return;
  try {
    const from = await api.requestPerson(request.id);
    if (from && !state.incoming && !state.chat) {
      set({ incoming: { id: request.id, from, expiresAt: request.expiresAt } });
    }
  } catch {
    // The request may have expired while we fetched the sender; nothing to show.
  }
}

export async function respondToIncoming(accept: boolean) {
  const incoming = state.incoming;
  if (!incoming) return;
  set({ incoming: null });
  try {
    await api.respond(incoming.id, accept);
  } catch {
    return; // expired just before answering; the sender sees "not this time" anyway
  }
  if (accept) await openChat(incoming.id, incoming.from);
}

export function expireIncoming() {
  set({ incoming: null });
}

// ---------------------------------------------------------------- chat

/** Opens the 1:1 chat: load the partner and history, then listen for new messages. */
async function openChat(chatId: string, other?: NearbyPerson) {
  const partner = other ?? (await api.requestPerson(chatId));
  if (!partner || !state.myId) return;
  const messages = await api.fetchChatMessages(chatId);
  set({ chat: { id: chatId, other: partner, status: 'active', messages } });

  stopChatMessages?.();
  stopChatMessages = api.subscribeMessages('request_id', chatId, state.myId, (message) => {
    const chat = state.chat;
    if (chat?.id !== chatId) return;
    const alreadyShown = chat.messages.some((existing) => existing.id === message.id);
    if (alreadyShown) return;
    set({ chat: { ...chat, messages: [...chat.messages, message] } });
  });
}

/** Called when the chat screen opens: re-sync history in case Realtime missed anything. */
export async function startChat() {
  const chat = state.chat;
  if (!chat) return;
  const messages = await api.fetchChatMessages(chat.id);
  // Only apply the history if the same chat is still open.
  if (state.chat?.id !== chat.id) return;
  set({ chat: { ...state.chat, messages } });
}

export async function sendMessage(text: string) {
  const chat = state.chat;
  const body = text.trim();
  if (!chat || !body) return;
  try {
    // The message appears when Realtime echoes it back, so both sides stay in sync.
    await api.sendMessage(chat.id, body);
  } catch (error) {
    Alert.alert('Message not sent', errorMessage(error, 'Try again.'));
  }
}

export async function endChat(outcome: 'met' | 'cancelled') {
  const chat = state.chat;
  if (!chat) return;
  stopChatMessages?.();
  stopChatMessages = null;
  set({ chat: null, outgoing: null });
  try {
    await api.endChat(chat.id, outcome);
  } catch {
    // Already ended by the other side or a block; local state is correct either way.
  }
}

export function showNearbyAlert(alert: NearbyAlert) {
  set({ nearbyAlert: alert });
}

export function dismissNearbyAlert() {
  set({ nearbyAlert: null });
}

export function markTutorialSeen() {
  set({ seenTutorial: true });
}

export function markSafetyTipSeen() {
  set({ safetyTipViews: state.safetyTipViews + 1 });
}

// ---------------------------------------------------------------- safety

export async function blockUser(userId: string, firstName: string) {
  // Server first: it cancels any request or chat between the two.
  await api.block(userId);

  // Drop anything in progress with the blocked person.
  let outgoing = state.outgoing;
  if (outgoing?.to.id === userId) {
    outgoing = null;
  }
  let incoming = state.incoming;
  if (incoming?.from.id === userId) {
    incoming = null;
  }
  let chat = state.chat;
  if (chat?.other.id === userId) {
    stopChatMessages?.();
    stopChatMessages = null;
    chat = null;
  }

  let blockedIds = state.blockedIds;
  if (!blockedIds.includes(userId)) {
    blockedIds = [...blockedIds, userId];
  }

  set({
    blockedIds,
    blockedNames: { ...state.blockedNames, [userId]: firstName },
    outgoing,
    incoming,
    chat,
  });
}

export async function unblockUser(userId: string) {
  await api.unblock(userId);
  const blockedNames = { ...state.blockedNames };
  delete blockedNames[userId];
  const blockedIds = state.blockedIds.filter((id) => id !== userId);
  set({ blockedIds, blockedNames });
}

export async function reportUser(userId: string, reason: ReportReason, details: string) {
  await api.report(userId, reason, details);
}

// ---------------------------------------------------------------- map events

export async function loadEvents(center: { latitude: number; longitude: number }) {
  const nearby = await api.eventsNear(center);
  // Keep the loaded chat history of events we're in; refresh everything else.
  const events = nearby.map((event) => {
    const existing = state.events.find((loaded) => loaded.id === event.id);
    if (!existing) return event;
    return { ...event, messages: existing.messages };
  });
  set({ events });
}

export async function createEvent(input: {
  emoji: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  startsAt: number;
}) {
  const event = await api.createEvent(input);
  const otherEvents = state.events.filter((existing) => existing.id !== event.id);
  set({ events: [event, ...otherEvents] });
  return event.id;
}

/** Applies `getChanges` to the one event with this id, leaving the others untouched. */
function updateEvent(id: string, getChanges: (event: MapEvent) => Partial<MapEvent>) {
  const events = state.events.map((event) => {
    if (event.id !== id) return event;
    return { ...event, ...getChanges(event) };
  });
  set({ events });
}

export async function joinEvent(id: string) {
  await api.joinEvent(id);
  updateEvent(id, (event) => ({ joined: true, memberCount: event.memberCount + 1 }));
}

export async function leaveEvent(id: string) {
  const event = state.events.find((existing) => existing.id === id);
  await api.leaveEvent(id);
  if (event && event.host.id === state.myId) {
    // Leaving your own event deletes it.
    set({ events: state.events.filter((existing) => existing.id !== id) });
    return;
  }
  updateEvent(id, (current) => ({
    joined: false,
    memberCount: Math.max(0, current.memberCount - 1),
    messages: [],
  }));
}

/** Called when a group chat screen opens: load history and listen for new messages. */
export async function enterEventChat(eventId: string) {
  if (!state.myId) return;
  const messages = await api.fetchEventMessages(eventId);
  updateEvent(eventId, () => ({ messages }));

  stopEventMessages?.();
  stopEventMessages = api.subscribeMessages('event_id', eventId, state.myId, (message) => {
    const event = state.events.find((existing) => existing.id === eventId);
    if (!event) return;
    const alreadyShown = event.messages.some((existing) => existing.id === message.id);
    if (alreadyShown) return;
    updateEvent(eventId, (current) => ({ messages: [...current.messages, message] }));
  });
}

export function leaveEventChat() {
  stopEventMessages?.();
  stopEventMessages = null;
}

export async function sendGroupMessage(eventId: string, text: string) {
  const body = text.trim();
  if (!body) return;
  try {
    await api.sendEventMessage(eventId, body); // appears via the Realtime echo
  } catch (error) {
    Alert.alert('Message not sent', errorMessage(error, 'Try again.'));
  }
}
