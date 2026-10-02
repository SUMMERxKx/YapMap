// Mock backend. Every function here matches a planned Supabase database function
// (go_green, go_offline, nearby, send_request, respond, end_match, block, report),
// so replacing the mock with Supabase only touches this file.

import type { NearbyPerson, ReportReason } from './types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_PEOPLE: (NearbyPerson & { note: string })[] = [
  {
    id: 'u_sam',
    firstName: 'Sam',
    lastInitial: 'K',
    gender: 'man',
    intro: 'Taking a study break from biochemistry. Keen to chat about books, music, or anything that isn\'t enzymes.',
    interests: ['Books', 'Music', 'Science'],
    photoUri: null,
    verified: true,
    note: 'Counter table near the plants, black corduroy cap',
  },
  {
    id: 'u_maya',
    firstName: 'Maya',
    lastInitial: 'R',
    gender: 'woman',
    intro: 'Sketching coffee cups. Would love opinions on urban illustration, or recommendations for the best flat white nearby.',
    interests: ['Art', 'Design', 'Coffee', 'Travel'],
    photoUri: null,
    verified: true,
    note: 'Big table at the back, green notebook',
  },
  {
    id: 'u_liam',
    firstName: 'Liam',
    lastInitial: 'T',
    gender: null,
    intro: 'New in town from Montreal. Exploring local roasteries and looking for good hiking spots.',
    interests: ['Coffee', 'Hiking', 'Languages', 'Food'],
    photoUri: null,
    verified: true,
    note: 'By the window, grey hoodie',
  },
  {
    id: 'u_chloe',
    firstName: 'Chloe',
    lastInitial: 'B',
    gender: 'woman',
    intro: 'Taking a break from my laptop screen. Up for a 15-minute chat about startups, podcasts or board games.',
    interests: ['Startups', 'Podcasts', 'Board games'],
    photoUri: null,
    verified: true,
    note: 'Bar seats facing the street, red scarf',
  },
];

// Mock face match. The real version runs on the server (a Supabase Edge Function calling a
// face-comparison service such as AWS Rekognition CompareFaces, with a liveness check).
// The selfie is compared with the profile photo and deleted straight after; only the result is kept.
export async function verifySelfie(_selfieUri: string, _profilePhotoUri: string): Promise<{ matched: boolean }> {
  await wait(2500);
  return { matched: true };
}

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
}

export async function goOffline() {
  await wait(200);
}

export async function nearby(blockedIds: string[]): Promise<NearbyPerson[]> {
  await wait(500);
  return MOCK_PEOPLE.filter((p) => !blockedIds.includes(p.id)).map(({ note: _note, ...p }) => p);
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

export function noteFor(personId: string) {
  return MOCK_PEOPLE.find((p) => p.id === personId)?.note ?? '';
}

export function randomIncoming(blockedIds: string[]) {
  const options = MOCK_PEOPLE.filter((p) => !blockedIds.includes(p.id));
  const { note: _note, ...from } = options[Math.floor(Math.random() * options.length)] ?? MOCK_PEOPLE[0];
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
