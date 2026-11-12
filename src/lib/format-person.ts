// Pure helpers that turn a person's details into the wording other people see.

import { GENDERS } from '@/data/constants';
import type { Gender, NearbyPerson, Profile } from '@/data/types';

type NameParts = { firstName: string; lastInitial?: string; lastName?: string };

/** How other people see a name: first name and last initial, e.g. "Sam K." */
export function displayName(person: NameParts) {
  const initial = person.lastInitial ?? person.lastName?.trim().charAt(0) ?? '';
  if (initial === '') return person.firstName;
  return `${person.firstName} ${initial.toUpperCase()}.`;
}

/** The label to show for a gender, or null when it should stay hidden. */
export function genderLabel(gender: Gender | null) {
  if (!gender || gender === 'prefer-not') return null;
  const match = GENDERS.find((option) => option.value === gender);
  if (!match) return null;
  return match.label;
}

/** Your own profile in the shape other people get it, so it can be shown as they see it. */
export function asSeenByOthers(profile: Profile, note: string): NearbyPerson {
  let gender: Gender | null = null;
  if (profile.showGender) {
    gender = profile.gender;
  }
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastInitial: profile.lastName.trim().charAt(0),
    gender,
    intro: profile.intro,
    interests: profile.interests,
    photoUri: profile.photoUri,
    thumbUri: null,
    photos: profile.photos,
    photoPaths: [],
    note,
  };
}
