export type Profile = {
  id: string;
  firstName: string;
  intro: string; // max 80 characters
  photoUri: string | null;
  isAdult: boolean;
};

// What the server's `nearby` function returns: people, never positions or distances.
export type NearbyPerson = {
  id: string;
  firstName: string;
  intro: string;
  photoUri: string | null;
};

export type Availability = {
  minutes: 30 | 60 | 120;
  note: string; // "How to find me", max 60 characters, shown only after a match
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

export type Match = {
  id: string;
  other: NearbyPerson & { note: string };
  status: 'active' | 'other-cancelled';
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
export const LIMITS = { intro: 80, note: 60, firstName: 30 } as const;
