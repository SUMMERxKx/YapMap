// The shapes of the data the app works with. Fixed lists and limits live in
// constants.ts; name helpers live in src/lib/format-person.ts.

export type Gender = 'woman' | 'man' | 'non-binary' | 'prefer-not';

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

/** A 1:1 chat that opens when a request is accepted — you and your yap partner. */
export type ChatSession = {
  id: string;
  other: NearbyPerson;
  status: 'active' | 'other-cancelled';
  messages: Message[];
};

/** An event someone put on the map. Its location is the place the host chose, never anyone's live position. */
export type MapEvent = {
  id: string;
  emoji: string; // the event's face on the map pin
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  startsAt: number;
  host: { id: string; firstName: string; lastInitial: string; photoUri: string | null };
  memberCount: number;
  joined: boolean;
  messages: Message[];
};

export type ReportReason =
  | 'inappropriate-photo'
  | 'harassment'
  | 'unsafe'
  | 'spam-or-fake'
  | 'under-18'
  | 'other';
