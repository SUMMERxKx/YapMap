import { useSyncExternalStore } from 'react';

import * as api from '@/data/api';
import type {
  Availability,
  IncomingRequest,
  Match,
  NearbyPerson,
  OutgoingRequest,
  Profile,
  ReportReason,
} from '@/data/types';
import { REQUEST_WINDOW_MS } from '@/data/types';

type State = {
  session: { email: string } | null;
  profile: Profile | null;
  availability: Availability | null;
  availabilityExpired: boolean; // shows "Your time's up" until dismissed
  outgoing: OutgoingRequest | null;
  incoming: IncomingRequest | null;
  match: Match | null;
  blockedIds: string[];
  blockedNames: Record<string, string>;
  safetyTipViews: number;
  seenTutorial: boolean;
};

const initialState: State = {
  session: null,
  profile: null,
  availability: null,
  availabilityExpired: false,
  outgoing: null,
  incoming: null,
  match: null,
  blockedIds: [],
  blockedNames: {},
  safetyTipViews: 0,
  seenTutorial: false,
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
  set({ availability: null, outgoing: null, availabilityExpired: reason === 'expired' });
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
      match: { id, other: to, status: 'active' },
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
      match: {
        id: incoming.id,
        other: incoming.from,
        status: 'active',
      },
    });
  }
}

export function expireIncoming() {
  set({ incoming: null });
}

// ---------------------------------------------------------------- match

export async function endMatch(outcome: 'met' | 'cancelled') {
  const match = state.match;
  if (!match) return;
  set({ match: null, outgoing: null });
  await api.endMatch(match.id, outcome);
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
    match: state.match?.other.id === userId ? null : state.match,
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
