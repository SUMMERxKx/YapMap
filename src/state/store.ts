// All app state and the actions that change it, in one small external store
// (useSyncExternalStore). Screens read slices with useStore(selector) and call the
// exported actions; nothing outside this file writes state. Each section below mirrors
// a backend concept, so swapping the mock api for Supabase mostly touches data/api.ts.

import { useSyncExternalStore } from 'react';

import * as api from '@/data/api';
import type {
  Availability,
  ChatSession,
  IncomingRequest,
  MapEvent,
  Message,
  NearbyPerson,
  OutgoingRequest,
  Profile,
  ReportReason,
} from '@/data/types';
import { REQUEST_WINDOW_MS } from '@/data/types';

export type NearbyAlert =
  | { id: string; kind: 'summary'; count: number }
  | { id: string; kind: 'person'; person: NearbyPerson };

type State = {
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
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

// ---------------------------------------------------------------- auth & profile

export async function signInWithEmail(email: string, code: string) {
  await api.verifyEmailCode(email, code);
  set({ session: { email } });
}

// Apple and Google sign-in are mocked until Supabase Auth is connected.
export function signInWithProvider(provider: 'apple' | 'google') {
  set({ session: { email: `${provider}-user@example.com` } });
}

/** Saves the profile. A new or changed photo needs a new selfie check. */
export function saveProfile(values: Omit<Profile, 'id' | 'verified'>) {
  const previous = state.profile;
  const verified = !!previous?.verified && previous.photoUri === values.photoUri;
  set({ profile: { id: 'me', ...values, verified } });
}

export async function verifySelfie(selfieUri: string) {
  const photo = state.profile?.photoUri;
  if (!photo) throw new Error('Add a profile photo first.');
  const { matched } = await api.verifySelfie(selfieUri, photo);
  return matched;
}

export function markVerified() {
  if (state.profile) set({ profile: { ...state.profile, verified: true } });
}

export function signOut() {
  set(initialState);
}

export async function deleteAccount() {
  await api.deleteAccount();
  set(initialState);
}

// ---------------------------------------------------------------- availability

export async function goGreen(args: {
  minutes: Availability['minutes'];
  note: string;
  latitude: number | null;
  longitude: number | null;
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

export function updateNote(note: string) {
  if (state.availability) set({ availability: { ...state.availability, note } });
}

export async function goOffline(reason: 'done' | 'expired' = 'done') {
  set({ availability: null, outgoing: null, nearbyAlert: null, availabilityExpired: reason === 'expired' });
  await api.goOffline();
}

export function dismissExpired() {
  set({ availabilityExpired: false });
}

// ---------------------------------------------------------------- requests

export async function sayHi(to: NearbyPerson) {
  if (state.outgoing?.status === 'pending') return; // one request at a time
  const { id } = await api.sendRequest(to);
  set({ outgoing: { id, to, expiresAt: Date.now() + REQUEST_WINDOW_MS, status: 'pending' } });

  const outcome = await api.waitForAnswer(id);
  if (state.outgoing?.id !== id) return; // cancelled meanwhile
  if (outcome === 'accepted') {
    set({
      outgoing: { ...state.outgoing, status: 'accepted' },
      chat: { id, other: to, status: 'active', messages: [] },
    });
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

// Development helper: pretend someone nearby sent us a request.
export function simulateIncoming() {
  const { id, from } = api.randomIncoming(state.blockedIds);
  set({ incoming: { id, from, expiresAt: Date.now() + REQUEST_WINDOW_MS } });
}

export async function respondToIncoming(accept: boolean) {
  const incoming = state.incoming;
  if (!incoming) return;
  set({ incoming: null });
  await api.respond(incoming.id, accept);
  if (accept) {
    set({
      chat: { id: incoming.id, other: incoming.from, status: 'active', messages: [] },
    });
  }
}

export function expireIncoming() {
  set({ incoming: null });
}

// ---------------------------------------------------------------- match

// ---------------------------------------------------------------- chat

function addMessage(message: Message) {
  if (state.chat) set({ chat: { ...state.chat, messages: [...state.chat.messages, message] } });
}

function receiveFromOther(kind: 'opener' | 'reply') {
  const chatId = state.chat?.id;
  if (!chatId) return;
  api.waitForReply(kind).then((text) => {
    const other = state.chat?.id === chatId ? state.chat.other : null;
    if (!other) return; // chat ended meanwhile
    addMessage({ id: `m_${Date.now()}`, senderId: other.id, senderName: other.firstName, text, sentAt: Date.now() });
  });
}

/** Called when the chat opens: the mock yap partner says hello first. */
export function startChat() {
  if (state.chat && state.chat.messages.length === 0) receiveFromOther('opener');
}

export async function sendMessage(text: string) {
  const chat = state.chat;
  const body = text.trim();
  if (!chat || !body) return;
  addMessage({ id: `m_${Date.now()}`, senderId: 'me', senderName: 'You', text: body, sentAt: Date.now() });
  await api.sendMessage(chat.id, body);
  receiveFromOther('reply');
}

export async function endChat(outcome: 'met' | 'cancelled') {
  const chat = state.chat;
  if (!chat) return;
  set({ chat: null, outgoing: null });
  await api.endChat(chat.id, outcome);
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
  // Blocking is instant and mutual: it also cancels any request or match between the two.
  set({
    blockedIds: [...state.blockedIds, userId],
    blockedNames: { ...state.blockedNames, [userId]: firstName },
    outgoing: state.outgoing?.to.id === userId ? null : state.outgoing,
    incoming: state.incoming?.from.id === userId ? null : state.incoming,
    chat: state.chat?.other.id === userId ? null : state.chat,
  });
  await api.block(userId);
}

export function unblockUser(userId: string) {
  const { [userId]: _removed, ...rest } = state.blockedNames;
  set({ blockedIds: state.blockedIds.filter((id) => id !== userId), blockedNames: rest });
}

export async function reportUser(userId: string, reason: ReportReason, details: string) {
  await api.report(userId, reason, details);
}

// ---------------------------------------------------------------- map events

export async function loadEvents(center: { latitude: number; longitude: number }) {
  const nearby = await api.eventsNear(center);
  // Keep events you created or joined; refresh the rest.
  const mine = state.events.filter((e) => e.host.id === 'me' || e.joined);
  set({ events: [...mine, ...nearby.filter((e) => !mine.some((m) => m.id === e.id))] });
}

export async function createEvent(input: {
  emoji: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  startsAt: number;
}) {
  const me = state.profile;
  const host = { id: 'me', firstName: me?.firstName ?? 'You', lastInitial: me?.lastName.charAt(0) ?? '', photoUri: me?.photoUri ?? null };
  const { id } = await api.createEvent({ ...input, host });
  set({ events: [{ ...input, id, host, memberCount: 1, joined: true, messages: [] }, ...state.events] });
  return id;
}

function updateEvent(id: string, patch: (e: MapEvent) => Partial<MapEvent>) {
  set({ events: state.events.map((e) => (e.id === id ? { ...e, ...patch(e) } : e)) });
}

export async function joinEvent(id: string) {
  await api.joinEvent(id);
  updateEvent(id, (e) => ({ joined: true, memberCount: e.memberCount + 1 }));
}

export async function leaveEvent(id: string) {
  await api.leaveEvent(id);
  updateEvent(id, (e) => ({ joined: false, memberCount: Math.max(0, e.memberCount - 1), messages: [] }));
}

export async function sendGroupMessage(eventId: string, text: string) {
  const body = text.trim();
  if (!body) return;
  const mine: Message = { id: `g_${Date.now()}`, senderId: 'me', senderName: 'You', text: body, sentAt: Date.now() };
  updateEvent(eventId, (e) => ({ messages: [...e.messages, mine] }));
  const { sender, text: reply } = await api.waitForGroupReply();
  if (state.blockedIds.includes(sender.id)) return;
  updateEvent(eventId, (e) =>
    e.joined
      ? {
          messages: [
            ...e.messages,
            { id: `g_${Date.now()}`, senderId: sender.id, senderName: `${sender.firstName} ${sender.lastInitial}.`, text: reply, sentAt: Date.now() },
          ],
        }
      : {},
  );
}
