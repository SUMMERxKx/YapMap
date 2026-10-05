import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Profile } from '@/data/types';

/** Numbered setup steps: name, gender, intro, interests, profile picture, photos. */
export const SETUP_STEPS = 6;

export type ProfileDraft = Omit<Profile, 'id' | 'verified' | 'gender'> & { gender: Profile['gender'] | null };

const empty: ProfileDraft = {
  firstName: '',
  lastName: '',
  gender: null,
  showGender: true,
  intro: '',
  interests: [],
  photoUri: null,
  photos: [],
  isAdult: false,
};

type DraftContext = {
  draft: ProfileDraft;
  update: (patch: Partial<ProfileDraft>) => void;
};

const Context = createContext<DraftContext | null>(null);

/** Holds the answers while someone moves through the setup steps, so going back keeps them. */
export function ProfileDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ProfileDraft>(empty);
  const update = (patch: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...patch }));
  return <Context.Provider value={{ draft, update }}>{children}</Context.Provider>;
}

export function useProfileDraft() {
  const value = useContext(Context);
  if (!value) throw new Error('useProfileDraft must be used inside ProfileDraftProvider');
  return value;
}
