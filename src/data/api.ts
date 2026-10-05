// Mock backend. Every function here matches a planned Supabase database function
// (go_green, go_offline, nearby, send_request, respond, end_match, block, report),
// so replacing the mock with Supabase only touches this file.

import type { MapEvent, NearbyPerson, ReportReason } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_PEOPLE: NearbyPerson[] = [
  {
    id: 'u_sam',
    firstName: 'Sam',
    lastInitial: 'K',
    gender: 'man',
    intro: 'Taking a study break from biochemistry. Keen to chat about books, music, or anything that isn\'t enzymes.',
    interests: ['Books', 'Music', 'Science'],
    photoUri: null,
    photos: ['https://picsum.photos/seed/u_sam1/600/800', 'https://picsum.photos/seed/u_sam2/600/800', 'https://picsum.photos/seed/u_sam3/600/800', 'https://picsum.photos/seed/u_sam4/600/800'],
    verified: true,
    note: 'Here till 5, come say hi',
  },
  {
    id: 'u_maya',
    firstName: 'Maya',
    lastInitial: 'R',
    gender: 'woman',
    intro: 'Sketching coffee cups. Would love opinions on urban illustration, or recommendations for the best flat white nearby.',
    interests: ['Art', 'Design', 'Coffee', 'Travel'],
    photoUri: null,
    photos: ['https://picsum.photos/seed/u_maya1/600/800', 'https://picsum.photos/seed/u_maya2/600/800', 'https://picsum.photos/seed/u_maya3/600/800', 'https://picsum.photos/seed/u_maya4/600/800'],
    verified: true,
    note: 'Sketching, but always happy to chat',
  },
  {
    id: 'u_liam',
    firstName: 'Liam',
    lastInitial: 'T',
    gender: null,
    intro: 'New in town from Montreal. Exploring local roasteries and looking for good hiking spots.',
    interests: ['Coffee', 'Hiking', 'Languages', 'Food'],
    photoUri: null,
    photos: ['https://picsum.photos/seed/u_liam1/600/800', 'https://picsum.photos/seed/u_liam2/600/800', 'https://picsum.photos/seed/u_liam3/600/800', 'https://picsum.photos/seed/u_liam4/600/800'],
    verified: true,
    note: 'New here, show me around?',
  },
  {
    id: 'u_chloe',
    firstName: 'Chloe',
    lastInitial: 'B',
    gender: 'woman',
    intro: 'Taking a break from my laptop screen. Up for a 15-minute chat about startups, podcasts or board games.',
    interests: ['Startups', 'Podcasts', 'Board games'],
    photoUri: null,
    photos: ['https://picsum.photos/seed/u_chloe1/600/800', 'https://picsum.photos/seed/u_chloe2/600/800', 'https://picsum.photos/seed/u_chloe3/600/800', 'https://picsum.photos/seed/u_chloe4/600/800'],
    verified: true,
    note: 'Coffee break for 20 min',
  },
];

// Mock face match. The real version runs on the server (a Supabase Edge Function calling a
// face-comparison service such as AWS Rekognition CompareFaces, with a liveness check).
// The selfie is compared with the profile photo and deleted straight after; only the result is kept.
export async function verifySelfie(_selfieUri: string, _profilePhotoUri: string): Promise<{ matched: boolean }> {
  await wait(2500);
  return { matched: true };
}

// Someone who "arrives" about 25 seconds after you go live, so the nearby prompt can be tested.
const LATE_ARRIVAL: NearbyPerson = {
  id: 'u_noah',
  firstName: 'Noah',
  lastInitial: 'P',
  gender: 'man',
  intro: 'Just finished a lecture on climate policy. Happy to talk about that, football or good ramen spots.',
  interests: ['Science', 'Sports', 'Food'],
  photoUri: null,
  photos: ['https://picsum.photos/seed/u_noah1/600/800', 'https://picsum.photos/seed/u_noah2/600/800', 'https://picsum.photos/seed/u_noah3/600/800', 'https://picsum.photos/seed/u_noah4/600/800'],
  note: 'Grabbing a coffee, say hi',
  verified: true,
};
const LATE_ARRIVAL_AFTER_MS = 25 * 1000;
let liveSince: number | null = null;

export async function requestEmailCode(email: string) {
  await wait(600);
  if (!email.includes('@')) throw new Error('Enter a valid email address.');
}

// Mock rule: any 6 digits sign you in, except 000000, which tests the error state.
export async function verifyEmailCode(_email: string, code: string) {
  await wait(700);
  if (code === '000000') throw new Error('Invalid or expired code. Please request a new one.');
}

export async function goGreen(_args: {
  latitude: number | null;
  longitude: number | null;
  minutes: number;
  note: string;
}) {
  await wait(500);
  liveSince = Date.now();
}

export async function goOffline() {
  liveSince = null;
  await wait(200);
}

export async function nearby(blockedIds: string[]): Promise<NearbyPerson[]> {
  await wait(500);
  const arrived = liveSince !== null && Date.now() - liveSince > LATE_ARRIVAL_AFTER_MS;
  const people = arrived ? [...MOCK_PEOPLE, LATE_ARRIVAL] : MOCK_PEOPLE;
  return people.filter((p) => !blockedIds.includes(p.id));
}

export async function sendRequest(to: NearbyPerson) {
  await wait(400);
  return { id: `req_${Date.now()}`, to };
}

// Mock outcome for a request we sent: most are accepted after a few seconds.
export async function waitForAnswer(_requestId: string): Promise<'accepted' | 'not-this-time'> {
  await wait(6000);
  return Math.random() < 0.7 ? 'accepted' : 'not-this-time';
}

export function randomIncoming(blockedIds: string[]) {
  const options = MOCK_PEOPLE.filter((p) => !blockedIds.includes(p.id));
  const from = options[Math.floor(Math.random() * options.length)] ?? MOCK_PEOPLE[0];
  return { id: `in_${Date.now()}`, from };
}

export async function respond(_requestId: string, _accept: boolean) {
  await wait(400);
}

const OPENERS = [
  'Hey! Glad you said hi 👋',
  'Hi! I’m around, come over whenever.',
  'Hey, nice to meet you! Want to grab a seat together?',
];
const REPLIES = [
  'Sounds good!',
  'Ha, same here.',
  'I’ll wave when I see you.',
  'Nice, see you in a sec.',
  'Oh cool, tell me more when we meet!',
];
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]!;

// Mock chat. With Supabase this becomes inserts into a `messages` table, delivered with Realtime.
export async function sendMessage(_chatId: string, _text: string) {
  await wait(150);
}

/** Mock: the other person's first message after a match, and their replies. */
export async function waitForReply(kind: 'opener' | 'reply'): Promise<string> {
  await wait(kind === 'opener' ? 1500 : 1800 + Math.random() * 1500);
  return pick(kind === 'opener' ? OPENERS : REPLIES);
}

export async function endMatch(_matchId: string, _outcome: 'met' | 'cancelled') {
  await wait(300);
}

export async function block(_userId: string) {
  await wait(300);
}

export async function report(_userId: string, _reason: ReportReason, _details: string) {
  await wait(500);
}

export async function deleteAccount() {
  await wait(800);
}

// ---------------------------------------------------------------- map events (mock)
// With Supabase: an `events` table with a PostGIS point, `event_members`, and group messages
// in the same `messages` table as 1:1 chats, delivered with Realtime.

const HOSTS = MOCK_PEOPLE.map(({ id, firstName, lastInitial, photoUri }) => ({ id, firstName, lastInitial, photoUri }));

/** A few mock events scattered around `center`, so there's always something nearby to try. */
export async function eventsNear(center: { latitude: number; longitude: number }): Promise<MapEvent[]> {
  await wait(400);
  const now = Date.now();
  const spots = [
    { dLat: 0.004, dLng: -0.006, emoji: '☕', title: 'Coffee and chats', description: 'Grabbing a flat white, anyone welcome.', in: 10 },
    { dLat: -0.005, dLng: 0.004, emoji: '🚶', title: 'Study break walk', description: 'Quick walk around the block, back in 30.', in: 30 },
    { dLat: 0.007, dLng: 0.008, emoji: '🎲', title: 'Board games', description: 'Bringing Catan and Codenames. Beginners welcome!', in: 60 },
  ];
  return spots.map((spot, i) => ({
    id: `ev_mock_${i}`,
    emoji: spot.emoji,
    title: spot.title,
    description: spot.description,
    latitude: center.latitude + spot.dLat,
    longitude: center.longitude + spot.dLng,
    startsAt: now + spot.in * 60 * 1000,
    host: HOSTS[i % HOSTS.length]!,
    memberCount: 2 + i,
    joined: false,
    messages: [],
  }));
}

export async function createEvent(_event: Omit<MapEvent, 'id' | 'messages' | 'memberCount' | 'joined'>) {
  await wait(400);
  return { id: `ev_${Date.now()}` };
}

export async function joinEvent(_eventId: string) {
  await wait(300);
}

export async function leaveEvent(_eventId: string) {
  await wait(200);
}

const GROUP_REPLIES = ['Count me in!', 'On my way 🙌', 'Where exactly are you?', 'Love this idea', 'See you all there'];

/** Mock: someone in the group replies. */
export async function waitForGroupReply(): Promise<{ sender: (typeof HOSTS)[number]; text: string }> {
  await wait(2000 + Math.random() * 2000);
  return { sender: HOSTS[Math.floor(Math.random() * HOSTS.length)]!, text: pick(GROUP_REPLIES) };
}
