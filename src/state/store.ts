// All app state and the actions that change it, in one small external store
// (useSyncExternalStore). Screens read slices with useStore(selector) and call the
// exported actions; nothing outside this file writes state. Actions talk to the backend
// through src/data/api.ts, and this file also owns the Realtime subscriptions (incoming
// requests, chat messages, event messages) and the catch-up that runs when the app comes
// back to the front or back online, since Realtime doesn't replay what it missed.

import * as Network from 'expo-network';
import { Alert, AppState } from 'react-native';
import { useSyncExternalStore } from 'react';

import * as api from '@/data/api';
import { EVENT_RADIUS_KM } from '@/data/constants';
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
import { errorMessage } from '@/lib/error-message';
import { clampRadiusKm, loadPrefs, savePrefs } from '@/state/saved-prefs';

export type NearbyAlert =
  | { id: string; kind: 'summary'; count: number }
  | { id: string; kind: 'person'; person: NearbyPerson };

type State = {
  booted: boolean; // the stored session and profile have been loaded
  loadFailed: boolean; // signed in, but the profile couldn't be loaded (offline): show a retry screen
  appActive: boolean; // the app is on screen (not in the background)
  myId: string | null;
  session: { email: string } | null;
  profile: Profile | null;
  availability: Availability | null;
  availabilityExpired: boolean; // shows "Your time's up" until dismissed
  offlinePending: boolean; // tapped to get off, but the server didn't hear it yet
  nearby: NearbyPerson[] | null; // who's live near me; null until loaded, and while not live
  nearbyFailed: boolean; // the last nearby refresh failed
  outgoing: OutgoingRequest | null;
  incoming: IncomingRequest | null;
  chat: ChatSession | null; // the 1:1 chat with your current yap partner
  blockedIds: string[];
  blockedNames: Record<string, string>;
  safetyTipViews: number;
  tutorialDue: boolean; // a brand-new account: show how the app works once
  eventRadiusKm: number; // how far around you the map looks for events
  nearbyAlert: NearbyAlert | null;
  events: MapEvent[];
  eventsRadiusKm: number | null; // the distance the shown events were loaded for; null until the first answer
};

const initialState: State = {
  booted: false,
  loadFailed: false,
  appActive: true,
  myId: null,
  session: null,
  profile: null,
  availability: null,
  availabilityExpired: false,
  offlinePending: false,
  nearby: null,
  nearbyFailed: false,
  outgoing: null,
  incoming: null,
  chat: null,
  blockedIds: [],
  blockedNames: {},
  safetyTipViews: 0,
  tutorialDue: false,
  eventRadiusKm: EVENT_RADIUS_KM.default,
  nearbyAlert: null,
  events: [],
  eventsRadiusKm: null,
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
let stopChat: (() => void) | null = null;
let stopEventMessages: (() => void) | null = null;

// Requests already answered or timed out here, and chats already closed here, so a
// catch-up that read the server a moment earlier never brings them back.
const handledRequestIds = new Set<string>();
const closedChatIds = new Set<string>();

function teardownRealtime() {
  stopIncoming?.();
  stopChat?.();
  stopEventMessages?.();
  stopIncoming = null;
  stopChat = null;
  stopEventMessages = null;
}

/** Start listening for say-hi requests. Needs a saved profile; safe to call again. */
function listenForRequests(userId: string) {
  if (stopIncoming) return;
  let joinedBefore = false;
  stopIncoming = api.subscribeIncoming(
    userId,
    (request) => void onIncoming(request),
    () => {
      if (joinedBefore) {
        // Re-joined after a dropped connection: catch up on everything missed meanwhile.
        void catchUp();
      } else {
        // First join: look for a request sent before we were listening.
        void checkForMissedRequest();
      }
      joinedBefore = true;
    },
  );
}

/** Whether the network looks reachable. Unknown counts as online. */
function isOnline(network: { isConnected?: boolean; isInternetReachable?: boolean | null }) {
  return network.isConnected !== false && network.isInternetReachable !== false;
}

// ---------------------------------------------------------------- boot

let initStarted = false;

/** Called once from the root layout: restore the session, profile and live state. */
export async function init() {
  if (initStarted) return;
  initStarted = true;

  api.onAuthStateChange((signedIn) => {
    // Sign-out (from anywhere, including account deletion) resets the app.
    if (!signedIn) {
      teardownRealtime();
      api.forgetSignedUrls();
      handledRequestIds.clear();
      closedChatIds.clear();
      extrasLoaded = false;
      set({ ...initialState, booted: true, appActive: state.appActive });
      return;
    }
    // A refreshed token usually means the network is back: try the failed load again.
    if (state.loadFailed) void catchUp();
  });

  // Back on screen: catch up on anything missed while in the background.
  AppState.addEventListener('change', (appState) => {
    const active = appState === 'active';
    if (active === state.appActive) return;
    set({ appActive: active });
    if (active) void catchUp();
  });

  // Back online: the same catch-up.
  let online = true;
  Network.addNetworkStateListener((network) => {
    const nowOnline = isOnline(network);
    if (nowOnline && !online) void catchUp();
    online = nowOnline;
  });

  try {
    await refreshAfterAuth();
  } catch {
    // Signed in, but the profile couldn't load (offline at launch). Without this flag the
    // app would treat them as a new user and send them to profile setup.
    set({ loadFailed: true });
  }
  set({ booted: true });
}

/**
 * Load everything a signed-in session needs; safe to call again after sign-in.
 * Throws when the profile can't be loaded, and then leaves the app signed out on screen.
 */
async function refreshAfterAuth() {
  const user = await api.getSessionUser();
  if (!user) {
    set({ loadFailed: false });
    return;
  }

  // Load the profile before setting `session`: a session with no profile means "new
  // account" to the root layout, which then shows profile setup.
  const profile = await api.fetchMyProfile();
  const prefs = await loadPrefs(user.id);
  set({
    myId: user.id,
    session: { email: user.email ?? '' },
    profile,
    loadFailed: false,
    safetyTipViews: prefs.safetyTipViews,
    eventRadiusKm: prefs.eventRadiusKm,
  });
  // The layout sends them to profile setup; saveProfile starts listening once it's saved.
  if (!profile) return;

  // The rest can wait for the next catch-up if the network drops now.
  try {
    await loadExtras();
  } catch {
    // Offline: catchUp() fills these in when the app is back online.
  }

  // New say-hi requests arrive over Realtime for the whole session.
  listenForRequests(user.id);
}

// Whether the block list and the live and chat state have loaded since sign-in.
let extrasLoaded = false;

/** Loads the block list, then picks up a live session or chat. Throws when offline. */
async function loadExtras() {
  await loadBlockedList();
  await restoreLiveAndChat();
  extrasLoaded = true;
}

async function loadBlockedList() {
  const blocked = await api.blockedList();
  const blockedIds: string[] = [];
  const blockedNames: Record<string, string> = {};
  for (const person of blocked) {
    blockedIds.push(person.id);
    blockedNames[person.id] = `${person.firstName} ${person.lastInitial}.`;
  }
  set({ blockedIds, blockedNames });
}

/** If the app was killed while live, mid-chat or waiting for an answer, pick up where things stand. */
async function restoreLiveAndChat() {
  const status = await api.myStatus();
  const live = status.live;
  // A "get off" still waiting to reach the server: stay off here.
  if (live && !state.offlinePending) {
    set({
      availability: {
        minutes: nearestDuration(live.expiresAt - live.startedAt),
        note: live.note,
        startedAt: live.startedAt,
        expiresAt: live.expiresAt,
      },
    });
  }
  if (status.chatId) {
    if (!closedChatIds.has(status.chatId)) await openChat(status.chatId);
  } else if (status.outgoing && state.outgoing?.id !== status.outgoing.id) {
    // Still waiting on a request: show it again and keep watching for the answer.
    set({ outgoing: { ...status.outgoing, status: 'pending' } });
    void watchAnswer(status.outgoing.id, status.outgoing.to);
  }
}

/** The live-duration option (30, 60 or 120 minutes) closest to a session's length. */
function nearestDuration(ms: number): Availability['minutes'] {
  const minutes = Math.round(ms / 60000);
  if (minutes <= 30) return 30;
  if (minutes <= 60) return 60;
  return 120;
}

/** "Try again" on the can't-load screen. Throws if it still can't load. */
export async function retryLoad() {
  await refreshAfterAuth();
}

// ---------------------------------------------------------------- catch-up

let catchUpRunning = false;
let catchUpAgain = false;

/**
 * Runs when the app comes back to the front, comes back online, or a Realtime channel
 * re-joins. Realtime doesn't replay events sent while the app was away, so this asks the
 * server directly. A call that arrives while one is running makes it run once more.
 */
async function catchUp() {
  if (catchUpRunning) {
    catchUpAgain = true;
    return;
  }
  catchUpRunning = true;
  try {
    do {
      catchUpAgain = false;
      await catchUpOnce();
    } while (catchUpAgain);
  } finally {
    catchUpRunning = false;
  }
}

async function catchUpOnce() {
  if (state.loadFailed) {
    try {
      await refreshAfterAuth();
    } catch {
      // Still offline; the next catch-up tries again.
    }
    return;
  }
  if (!state.profile) return; // signed out, or still setting up

  const chatIdBefore = state.chat?.id ?? null;
  await retryGoOffline();
  if (extrasLoaded) {
    await checkLiveAndChat();
  } else {
    try {
      await loadExtras();
    } catch {
      return; // still offline; the next catch-up tries again
    }
    if (state.chat) await checkChatStillOn(state.chat.id);
  }
  await checkForMissedRequest();
  await reloadEvents(); // events deleted while away
  // Messages sent while away. A chat opened just now loads them when its channel joins.
  if (chatIdBefore !== null && state.chat?.id === chatIdBefore) await syncChatMessages();
}

/** Re-checks with the server that I'm still live and that the open chat is still on. */
async function checkLiveAndChat() {
  const myId = state.myId;
  const availabilityBefore = state.availability;
  const chatIdBefore = state.chat?.id ?? null;
  let status;
  try {
    status = await api.myStatus();
  } catch {
    return; // offline; the next catch-up tries again
  }
  if (state.myId !== myId) return; // signed out meanwhile

  // The server ended my live session (time ran out while the app was asleep): match it.
  // Only if nothing changed here while we asked, so a fresh "Go live" isn't undone.
  if (availabilityBefore && !status.live && state.availability === availabilityBefore) {
    clearLiveState(true);
  }

  if (state.chat) {
    await checkChatStillOn(state.chat.id);
    return;
  }
  // No chat here but one on the server, e.g. accepted just before the network dropped.
  const noChatChanges = chatIdBefore === null && state.chat === null;
  if (noChatChanges && status.chatId && !closedChatIds.has(status.chatId)) {
    try {
      await openChat(status.chatId);
    } catch {
      // Offline again; the next catch-up tries again.
    }
  }
}

/** Marks the open chat as ended if the other person ended it while we weren't listening. */
async function checkChatStillOn(chatId: string) {
  if (state.chat?.id !== chatId || state.chat.status !== 'active') return;
  try {
    const status = await api.requestStatus(chatId);
    // null: the row is gone because the other person deleted their account.
    if (status !== 'accepted') markChatEnded(chatId);
  } catch {
    // Offline; the next catch-up tries again.
  }
}

/** Shows a say-hi request that arrived while the app was in the background or offline. */
async function checkForMissedRequest() {
  if (state.incoming || inActiveChat()) return;
  try {
    const request = await api.pendingIncoming();
    if (request) await onIncoming(request);
  } catch {
    // Offline; the next catch-up tries again.
  }
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

/** Forgot password, last step: use the emailed code with the new password, then go in. */
export async function finishPasswordReset(email: string, code: string, password: string) {
  await api.resetPassword(email, code, password);
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
  if (!previous) {
    extrasLoaded = true;
    // The first save is the end of sign-up: show the tutorial this once. Later launches
    // never show it again; Settings has "View tutorial" for anyone who wants it back.
    set({ tutorialDue: true });
  }
  // A new account can be said hi to from now on, so start listening (sign-in only does
  // this for accounts that already had a profile).
  listenForRequests(stored.id);
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
  // Offline, the sign-out itself would fail after the chat and live session had already
  // ended here, leaving the other person in a chat nobody reads. So check first.
  const network = await Network.getNetworkStateAsync();
  if (!isOnline(network)) {
    throw new Error("You need a connection to sign out. Try again when you're back online.");
  }
  // Leave cleanly first, so nobody keeps seeing you on their nearby list or waits on a
  // chat nobody is reading. Both carry on if the network call fails.
  if (state.chat) await endChat('cancelled');
  if (state.availability) await goOffline('done');
  await api.signOut(); // the auth listener resets the state
}

export async function deleteAccount() {
  await api.deleteAccount(); // signs out too; the auth listener resets the state
}

// ---------------------------------------------------------------- availability

// A "get off" retry still on its way to the server; going live waits for it, so the
// retry can't remove the new live session.
let offlineRetry: Promise<void> | null = null;

export async function goGreen(args: {
  minutes: Availability['minutes'];
  note: string;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
}) {
  if (offlineRetry) await offlineRetry;
  // The server's times, so the countdown ends when the session really does.
  const { startedAt, expiresAt } = await api.goGreen(args);
  set({
    availability: { minutes: args.minutes, note: args.note, startedAt, expiresAt },
    availabilityExpired: false,
    offlinePending: false, // going live replaced the session that didn't get removed
  });
}

/** Saves a new note. Throws (and puts the old note back) if the server refuses it. */
export async function updateNote(note: string) {
  const before = state.availability;
  if (!before) return;
  set({ availability: { ...before, note } });
  try {
    await api.updateNote(note);
  } catch (error) {
    if (state.availability) set({ availability: { ...state.availability, note: before.note } });
    throw error;
  }
}

/** Forgets the live session here: no availability, no nearby list, no waiting request. */
function clearLiveState(expired: boolean) {
  set({
    availability: null,
    outgoing: null,
    nearby: null,
    nearbyFailed: false,
    nearbyAlert: null,
    availabilityExpired: expired,
  });
}

export async function goOffline(reason: 'done' | 'expired' = 'done') {
  clearLiveState(reason === 'expired');
  set({ offlinePending: false });
  try {
    await api.goOffline();
  } catch {
    // An expired session drops off the server's lists on its own. Getting off early has
    // to reach the server, or people keep seeing you, so try again once back online.
    if (reason === 'done' && !state.availability) set({ offlinePending: true });
  }
}

/** Retries a "get off" that didn't reach the server. */
async function retryGoOffline() {
  if (!state.offlinePending || offlineRetry) return;
  offlineRetry = (async () => {
    try {
      await api.goOffline();
      set({ offlinePending: false });
    } catch {
      // Still offline; the next catch-up tries again.
    }
  })();
  await offlineRetry;
  offlineRetry = null;
}

export function dismissExpired() {
  set({ availabilityExpired: false });
}

// ---------------------------------------------------------------- nearby

// Counts refreshes, so a slow answer never replaces a newer one.
let nearbyRefreshes = 0;

/**
 * Reloads who's live near me. One shared list: the Nearby tab, the person sheet and the
 * "someone is near you" prompts all read `state.nearby`.
 */
export async function refreshNearby() {
  if (!state.availability) return;
  nearbyRefreshes += 1;
  const thisRefresh = nearbyRefreshes;
  try {
    const people = await api.nearby();
    if (thisRefresh !== nearbyRefreshes || !state.availability) return;
    set({ nearby: people, nearbyFailed: false });
  } catch {
    if (thisRefresh !== nearbyRefreshes) return;
    set({ nearbyFailed: true });
  }
}

// ---------------------------------------------------------------- say hi

/** True while a 1:1 chat is going on (not one the other person has already ended). */
function inActiveChat() {
  return state.chat !== null && state.chat.status === 'active';
}

/** Sends the request (throws if the server refuses), then waits for the answer. */
export async function sayHi(to: NearbyPerson) {
  // One conversation at a time: the person you're chatting with would be left waiting.
  const chat = state.chat;
  if (chat && chat.status === 'active') {
    throw new Error(`Finish your chat with ${chat.other.firstName} first.`);
  }
  if (state.outgoing?.status === 'pending') return; // one request at a time
  const { id, expiresAt } = await api.sendRequest(to);
  set({ outgoing: { id, to, expiresAt, status: 'pending' } });
  void watchAnswer(id, to);
}

let watchingId: string | null = null; // the request watchAnswer is waiting on, if any

async function watchAnswer(id: string, to: NearbyPerson) {
  const outgoing = state.outgoing;
  if (!outgoing) return;
  watchingId = id;
  const outcome = await api.waitForAnswer(id, outgoing.expiresAt);
  if (watchingId === id) watchingId = null;
  if (state.outgoing?.id !== id) return; // cancelled meanwhile
  if (outcome === 'accepted') {
    set({ outgoing: { ...state.outgoing, status: 'accepted' } });
    try {
      await openChat(id, to);
    } catch {
      // Offline right now; the catch-up opens the chat once back online.
    }
  } else {
    set({ outgoing: { ...state.outgoing, status: 'not-this-time' } });
  }
}

/** Withdraws the waiting request on the server too, so it can't be accepted any more. */
export async function cancelRequest() {
  const outgoing = state.outgoing;
  if (!outgoing) return;
  // Gone from the screen straight away; watchAnswer ignores an answer from now on.
  set({ outgoing: null });
  if (outgoing.status !== 'pending') return; // already answered or timed out
  try {
    await api.cancelRequest(outgoing.id);
  } catch (error) {
    // Still waiting on the server, so show it again and let the caller say so.
    if (!state.outgoing) {
      set({ outgoing });
      if (watchingId !== outgoing.id) void watchAnswer(outgoing.id, outgoing.to);
    }
    throw error;
  }
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
  if (handledRequestIds.has(request.id)) return;
  if (state.incoming || inActiveChat()) return;
  try {
    const from = await api.requestPerson(request.id);
    if (!from || handledRequestIds.has(request.id)) return;
    if (!state.incoming && !inActiveChat()) {
      set({ incoming: { id: request.id, from, expiresAt: request.expiresAt } });
    }
  } catch {
    // The request may have expired while we fetched the sender; nothing to show.
  }
}

export async function respondToIncoming(accept: boolean) {
  const incoming = state.incoming;
  if (!incoming) return;
  handledRequestIds.add(incoming.id);
  set({ incoming: null });
  try {
    await api.respond(incoming.id, accept);
  } catch (error) {
    // Expired or cancelled just before answering (the sender sees "not this time" anyway),
    // or you're already in a chat. Only a failed Accept needs explaining.
    if (accept) Alert.alert("Couldn't accept", errorMessage(error, 'Try again.'));
    return;
  }
  if (!accept) return;

  // One conversation at a time: stop waiting on your own request to someone else.
  if (state.outgoing) set({ outgoing: null });
  try {
    await openChat(incoming.id, incoming.from);
  } catch {
    Alert.alert('Chat accepted', "We couldn't open the chat just now. It opens as soon as you're back online.");
  }
}

export function expireIncoming() {
  if (state.incoming) handledRequestIds.add(state.incoming.id);
  set({ incoming: null });
}

// ---------------------------------------------------------------- chat

/** Messages from both lists, each once, oldest first. */
function mergeMessages(current: Message[], added: Message[]): Message[] {
  const merged = [...current];
  for (const message of added) {
    const alreadyThere = merged.some((existing) => existing.id === message.id);
    if (!alreadyThere) merged.push(message);
  }
  merged.sort((a, b) => a.sentAt - b.sentAt);
  return merged;
}

function addChatMessages(chatId: string, messages: Message[]) {
  const chat = state.chat;
  if (chat?.id !== chatId) return;
  set({ chat: { ...chat, messages: mergeMessages(chat.messages, messages) } });
}

/** The other person ended the chat (or blocked, or left Yap): keep it on screen, but closed. */
function markChatEnded(chatId: string) {
  const chat = state.chat;
  if (!chat || chat.id !== chatId || chat.status !== 'active') return;
  stopChat?.();
  stopChat = null;
  set({ chat: { ...chat, status: 'other-cancelled' } });
}

// The chat openChat is loading right now, so a second call for it doesn't open it twice.
let openingChatId: string | null = null;

/** Opens the 1:1 chat: listen for messages and the chat ending, then load the history. */
async function openChat(chatId: string, other?: NearbyPerson) {
  const myId = state.myId;
  if (!myId || state.chat?.id === chatId || openingChatId === chatId) return;
  openingChatId = chatId;
  try {
    const partner = other ?? (await api.requestPerson(chatId));
    if (!partner || state.myId !== myId || closedChatIds.has(chatId)) return;

    // Listen first, then load the history, so a message sent in between isn't missed.
    stopChat?.();
    stopChat = api.subscribeChat(chatId, myId, {
      onMessage: (message) => addChatMessages(chatId, [message]),
      onEnded: () => markChatEnded(chatId),
      // Joined (the history loads then), or re-joined after a dropped connection.
      onSubscribed: () => void resyncChat(chatId),
    });
    set({ chat: { id: chatId, other: partner, status: 'active', messages: [] } });
  } finally {
    openingChatId = null;
  }
}

/** Re-syncs the open chat's history with the server. */
async function syncChatMessages() {
  const chat = state.chat;
  if (!chat) return;
  try {
    const messages = await api.fetchChatMessages(chat.id);
    addChatMessages(chat.id, messages);
  } catch {
    // Offline; the catch-up or the channel re-joining loads it later.
  }
}

/** After the chat channel (re)joins: load what was missed, including the chat ending. */
async function resyncChat(chatId: string) {
  if (state.chat?.id !== chatId) return;
  await syncChatMessages();
  await checkChatStillOn(chatId);
}

export async function sendMessage(text: string) {
  const chat = state.chat;
  const body = text.trim();
  if (!chat || !body) return;
  try {
    // Show the saved message now; when Realtime delivers the same one, it's skipped.
    const result = await api.sendMessage(chat.id, body);
    if (result === 'chat-ended') markChatEnded(chat.id);
    else addChatMessages(chat.id, [result]);
  } catch (error) {
    Alert.alert('Message not sent', errorMessage(error, 'Try again.'));
  }
}

export async function endChat(outcome: 'met' | 'cancelled') {
  const chat = state.chat;
  if (!chat) return;
  stopChat?.();
  stopChat = null;
  closedChatIds.add(chat.id);
  set({ chat: null, outgoing: null });
  // Already ended on the other side: nothing to tell the server.
  if (chat.status !== 'active') return;
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
  set({ tutorialDue: false });
}

export function markSafetyTipSeen() {
  set({ safetyTipViews: state.safetyTipViews + 1 });
  rememberPrefs();
}

/** Keeps the safety-tip progress and the events distance for this account across launches. */
function rememberPrefs() {
  if (!state.myId) return;
  savePrefs(state.myId, { safetyTipViews: state.safetyTipViews, eventRadiusKm: state.eventRadiusKm });
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
    handledRequestIds.add(incoming.id);
    incoming = null;
  }
  let chat = state.chat;
  if (chat?.other.id === userId) {
    stopChat?.();
    stopChat = null;
    closedChatIds.add(chat.id);
    chat = null;
  }

  let blockedIds = state.blockedIds;
  if (!blockedIds.includes(userId)) {
    blockedIds = [...blockedIds, userId];
  }

  // They disappear from the nearby list and the map straight away.
  let nearby = state.nearby;
  if (nearby) {
    nearby = nearby.filter((person) => person.id !== userId);
  }
  const events = state.events.filter((event) => event.host.id !== userId);

  set({
    blockedIds,
    blockedNames: { ...state.blockedNames, [userId]: firstName },
    outgoing,
    incoming,
    chat,
    nearby,
    events,
  });
}

export async function unblockUser(userId: string) {
  await api.unblock(userId);
  const blockedNames = { ...state.blockedNames };
  delete blockedNames[userId];
  const blockedIds = state.blockedIds.filter((id) => id !== userId);
  set({ blockedIds, blockedNames });
  void refreshNearby(); // they may be live nearby
}

export async function reportUser(userId: string, reason: ReportReason, details: string) {
  await api.report(userId, reason, details);
}

// ---------------------------------------------------------------- map events

// Where events were last loaded around, so a new distance can reload the same spot.
let lastEventsCenter: { latitude: number; longitude: number } | null = null;
// Counts loads, so a slow answer never replaces a newer one.
let eventLoads = 0;

export async function loadEvents(center: { latitude: number; longitude: number }) {
  lastEventsCenter = center;
  eventLoads += 1;
  const thisLoad = eventLoads;
  const radiusKm = state.eventRadiusKm;
  const nearby = await api.eventsNear(center, radiusKm * 1000);
  if (thisLoad !== eventLoads) return;
  // Keep the loaded chat history of events we're in; refresh everything else.
  const events = nearby.map((event) => {
    const existing = state.events.find((loaded) => loaded.id === event.id);
    if (!existing) return event;
    return { ...event, messages: existing.messages };
  });
  set({ events, eventsRadiusKm: radiusKm });
}

/**
 * Loads the events around the same spot again, so ones deleted meanwhile leave the map, and
 * their details or group chat, if open, show "This event was deleted".
 */
async function reloadEvents() {
  if (!lastEventsCenter) return;
  try {
    await loadEvents(lastEventsCenter);
  } catch {
    // Offline; the next catch-up tries again.
  }
}

/** Changes how far around you the map looks for events, remembers it, and reloads the pins. */
export async function setEventRadius(km: number) {
  set({ eventRadiusKm: clampRadiusKm(km) });
  rememberPrefs();
  if (lastEventsCenter) await loadEvents(lastEventsCenter);
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

/** Joins from where the phone is: the server only allows it within about 5 km of the event. */
export async function joinEvent(id: string, position: { latitude: number | null; longitude: number | null }) {
  if ((await api.joinEvent(id, position)) === 'event-deleted') {
    forgetEvent(id);
    return;
  }
  updateEvent(id, (event) => ({ joined: true, memberCount: event.memberCount + 1 }));
}

export async function leaveEvent(id: string) {
  const event = state.events.find((existing) => existing.id === id);
  await api.leaveEvent(id);
  if (event && event.host.id === state.myId) {
    // Leaving your own event deletes it.
    forgetEvent(id);
    return;
  }
  updateEvent(id, (current) => ({
    joined: false,
    memberCount: Math.max(0, current.memberCount - 1),
    messages: [],
  }));
}

/** Deletes an event you host. It leaves the map and lists straight away. */
export async function deleteEvent(id: string) {
  await api.deleteEvent(id);
  forgetEvent(id);
}

/**
 * Takes a deleted event off the map and lists. Its details or group chat, if open, then
 * show "This event was deleted".
 */
function forgetEvent(id: string) {
  set({ events: state.events.filter((event) => event.id !== id) });
}

// Counts group chat visits, so history that arrives after the screen closed is dropped.
let eventChatVisits = 0;

/** Called when a group chat screen opens: listen for new messages and load the history. */
export function enterEventChat(eventId: string) {
  const myId = state.myId;
  if (!myId) return;
  eventChatVisits += 1;
  const visit = eventChatVisits;

  stopEventMessages?.();
  stopEventMessages = api.subscribeEventMessages(
    eventId,
    myId,
    (message) => updateEvent(eventId, (current) => ({ messages: mergeMessages(current.messages, [message]) })),
    // Joined (the history loads then, and the event is checked to still be there), or
    // re-joined after a dropped connection.
    () => {
      void loadEventHistory(eventId, visit);
      void reloadEvents();
    },
  );
}

async function loadEventHistory(eventId: string, visit: number) {
  try {
    const messages = await api.fetchEventMessages(eventId);
    if (visit !== eventChatVisits) return; // the screen closed meanwhile
    updateEvent(eventId, (current) => ({ messages: mergeMessages(current.messages, messages) }));
  } catch {
    // Offline; the channel re-joining loads it later.
  }
}

export function leaveEventChat() {
  eventChatVisits += 1;
  stopEventMessages?.();
  stopEventMessages = null;
}

export async function sendGroupMessage(eventId: string, text: string) {
  const body = text.trim();
  if (!body) return;
  try {
    // Show the saved message now; when Realtime delivers the same one, it's skipped.
    const sent = await api.sendEventMessage(eventId, body);
    if (sent === 'not-member') {
      // The event was deleted, or I left it on another device: reloading shows which.
      await reloadEvents();
      return;
    }
    updateEvent(eventId, (current) => ({ messages: mergeMessages(current.messages, [sent]) }));
  } catch (error) {
    Alert.alert('Message not sent', errorMessage(error, 'Try again.'));
  }
}
