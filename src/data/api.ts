// Mock backend. Every function here matches a planned Supabase database function
// (go_green, go_offline, nearby, send_request, respond, end_match, block, report),
// so replacing the mock with Supabase only touches this file.

import type { NearbyPerson, ReportReason } from './types';

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
