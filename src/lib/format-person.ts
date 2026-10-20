// Pure helpers that turn a person's details into the wording other people see.

import { GENDERS } from '@/data/constants';
import type { Gender } from '@/data/types';

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
