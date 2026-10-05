export type Gender = 'woman' | 'man' | 'non-binary' | 'prefer-not';

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not', label: 'Prefer not to say' },
];

export const INTERESTS = [
  'Coffee', 'Books', 'Music', 'Movies', 'TV shows', 'Gaming', 'Tech', 'Startups',
  'Design', 'Art', 'Photography', 'Writing', 'Science', 'History', 'Philosophy', 'Languages',
  'Travel', 'Food', 'Cooking', 'Fitness', 'Running', 'Hiking', 'Yoga', 'Sports',
  'Board games', 'Anime', 'Podcasts', 'Fashion', 'Volunteering', 'Pets', 'Nature', 'Comedy',
] as const;

export type Profile = {
  id: string;
  firstName: string;
  lastName: string; // only the initial is ever shown to other people
  gender: Gender;
  showGender: boolean; // when false, other people don't see gender
  intro: string; // max 300 characters
  interests: string[]; // 3 to 5 from INTERESTS
  photoUri: string | null; // profile picture
  photos: string[]; // more photos, 4 to 6
  isAdult: boolean;
  verified: boolean; // selfie matched the profile photo
};

// What the server's `nearby` function returns: people, never positions or distances.
export type NearbyPerson = {
  id: string;
  firstName: string;
  lastInitial: string;
  gender: Gender | null; // null when hidden ("Prefer not to say" or the toggle is off)
  intro: string;
  interests: string[];
  photoUri: string | null;
  photos: string[];
  note: string; // their optional note while live
  verified: boolean;
};

/** How other people see a name: first name and last initial, e.g. "Sam K." */
export function displayName(p: { firstName: string; lastInitial?: string; lastName?: string }) {
  const initial = p.lastInitial ?? p.lastName?.trim().charAt(0) ?? '';
  return initial ? `${p.firstName} ${initial.toUpperCase()}.` : p.firstName;
}

export function genderLabel(gender: Gender | null) {
  if (!gender || gender === 'prefer-not') return null;
  return GENDERS.find((g) => g.value === gender)?.label ?? null;
}

export type Availability = {
  minutes: 30 | 60 | 120;
  note: string; // optional, max 60 characters, shown to people nearby while live
  startedAt: number;
  expiresAt: number;
};

export type OutgoingRequest = {
  id: string;
  to: NearbyPerson;
  expiresAt: number;
  // Declines and expiries both become 'not-this-time', so the sender can't tell them apart.
  status: 'pending' | 'accepted' | 'not-this-time';
};

export type IncomingRequest = {
  id: string;
  from: NearbyPerson;
  expiresAt: number;
};

export type Message = {
  id: string;
  senderId: string; // 'me' for your own messages
  senderName: string;
  text: string;
  sentAt: number;
};

/** A 1:1 chat that opens when a request is accepted. */
export type Match = {
  id: string;
  other: NearbyPerson;
  status: 'active' | 'other-cancelled';
  messages: Message[];
};

export type ReportReason =
  | 'inappropriate-photo'
  | 'harassment'
  | 'unsafe'
  | 'spam-or-fake'
  | 'under-18'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate-photo', label: 'Inappropriate photo' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'unsafe', label: 'Made me feel unsafe' },
  { value: 'spam-or-fake', label: 'Spam or fake account' },
  { value: 'under-18', label: 'Under 18' },
  { value: 'other', label: 'Other' },
];

export const DURATIONS = [30, 60, 120] as const;
export const REQUEST_WINDOW_MS = 5 * 60 * 1000;
export const NEARBY_REFRESH_MS = 20 * 1000;
export const LIMITS = { intro: 300, note: 60, firstName: 30, lastName: 30, message: 1000 } as const;
export const INTEREST_RANGE = { min: 3, max: 5 } as const;
export const PHOTO_RANGE = { min: 4, max: 6 } as const; // on top of the profile picture

// Random poses for the verification selfie, so an old photo can't be reused.
export const VERIFICATION_POSES = [
  { icon: 'thumbs-up-outline', text: 'Give a thumbs up next to your face' },
  { icon: 'hand-left-outline', text: 'Hold up two fingers in a peace sign' },
  { icon: 'happy-outline', text: 'Touch your nose with one finger' },
  { icon: 'hand-right-outline', text: 'Rest your chin on your hand' },
] as const;
