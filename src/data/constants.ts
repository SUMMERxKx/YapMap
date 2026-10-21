// Fixed lists, limits and timings the app uses. The server enforces the same limits.

import type { Gender, ReportReason } from './types';

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

/**
 * The kinds of event a host can pick; the first is the default. This is the one table that
 * turns an event's stored value into its icon:
 * - value: what the events table stores. These emoji were shown on screen before the app had
 *   icons, so existing rows keep working; the database default is the first one.
 * - name: what screen readers say, and the label under each icon in the picker.
 * - icon: the Ionicons glyph drawn in the event's badge.
 */
export const EVENT_CATEGORIES = [
  { value: '☕', name: 'Coffee', icon: 'cafe' },
  { value: '🍕', name: 'Food', icon: 'pizza' },
  { value: '🎲', name: 'Games', icon: 'dice' },
  { value: '📚', name: 'Study', icon: 'library' },
  { value: '💻', name: 'Coding', icon: 'laptop' },
  { value: '🏀', name: 'Sports', icon: 'basketball' },
  { value: '🎸', name: 'Music', icon: 'musical-notes' },
  { value: '🚶', name: 'Walk', icon: 'walk' },
  { value: '🧘', name: 'Yoga', icon: 'flower' },
  { value: '🎬', name: 'Movies', icon: 'film' },
  { value: '🎨', name: 'Art', icon: 'color-palette' },
  { value: '🍻', name: 'Drinks', icon: 'beer' },
] as const;

/** Shown for a stored value that isn't in EVENT_CATEGORIES, e.g. one added by a newer app. */
export const EVENT_CATEGORY_FALLBACK = { name: 'Event', icon: 'calendar' } as const;

/** Events can be planned at most this far ahead. */
export const EVENT_MAX_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate-photo', label: 'Inappropriate photo' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'unsafe', label: 'Made me feel unsafe' },
  { value: 'spam-or-fake', label: 'Spam or fake account' },
  { value: 'under-18', label: 'Under 18' },
  { value: 'other', label: 'Other' },
];

/** How long someone can stay live, in minutes. */
export const DURATIONS = [30, 60, 120] as const;

export const NEARBY_REFRESH_MS = 20 * 1000;

/** Maximum lengths, in characters. */
export const LIMITS = {
  intro: 300,
  note: 60,
  firstName: 30,
  lastName: 30,
  message: 1000,
  eventTitle: 60,
  eventDescription: 200,
} as const;

export const INTEREST_RANGE = { min: 3, max: 5 } as const;
export const PHOTO_RANGE = { min: 4, max: 6 } as const; // on top of the profile picture

/** Shortest password allowed. Match it in Supabase: Authentication -> Sign In / Providers -> Email. */
export const PASSWORD_MIN_LENGTH = 8;

// Random poses for the verification selfie, so an old photo can't be reused.
export const VERIFICATION_POSES = [
  { icon: 'thumbs-up-outline', text: 'Give a thumbs up next to your face' },
  { icon: 'hand-left-outline', text: 'Hold up two fingers in a peace sign' },
  { icon: 'happy-outline', text: 'Touch your nose with one finger' },
  { icon: 'hand-right-outline', text: 'Rest your chin on your hand' },
] as const;
