import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GENDERS, INTERESTS, INTEREST_RANGE, LIMITS, PHOTO_RANGE } from '@/data/constants';
import type { Gender, Profile } from '@/data/types';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { FormSection } from '@/components/ui/form-section';
import { InfoNote } from '@/components/ui/info-note';
import { PhotoGrid } from '@/components/profile/photo-grid';
import { TextField } from '@/components/ui/text-field';
import { ToggleRow } from '@/components/ui/toggle-row';

type Values = Omit<Profile, 'id' | 'verified'>;
type Props = {
  initial?: Values;
  submitLabel: string;
  onSubmit: (values: Values) => void;
  showAgeCheck?: boolean;
};

export function ProfileForm({ initial, submitLabel, onSubmit, showAgeCheck = true }: Props) {
  const { colors, layout, size, spacing } = useTheme();
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [showGender, setShowGender] = useState(initial?.showGender ?? true);
  const [intro, setIntro] = useState(initial?.intro ?? '');
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [isAdult, setIsAdult] = useState(initial?.isAdult ?? false);
  const [tried, setTried] = useState(false);

  // Everything still needed before the form can be submitted, in the order shown to the user.
  const missing: string[] = [];
  if (!photoUri) missing.push('a profile picture');
  if (photos.length < PHOTO_RANGE.min) missing.push(`at least ${PHOTO_RANGE.min} more photos`);
  if (!firstName.trim()) missing.push('your first name');
  if (!lastName.trim()) missing.push('your last name');
  if (!gender) missing.push('your gender');
  if (!intro.trim()) missing.push('an intro');
  if (interests.length < INTEREST_RANGE.min) missing.push(`at least ${INTEREST_RANGE.min} interests`);
  if (!isAdult) missing.push('confirmation that you are 18 or older');

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setPhotoUri(result.assets[0]?.uri ?? null);
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((item) => item !== interest);
      }
      if (current.length < INTEREST_RANGE.max) {
        return [...current, interest];
      }
      return current; // already at the maximum
    });
  };

  const submit = () => {
    setTried(true);
    if (missing.length === 0 && gender) {
      onSubmit({
        photoUri,
        photos,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        showGender,
        intro: intro.trim(),
        interests,
        isAdult,
      });
    }
  };

  const atMax = interests.length >= INTEREST_RANGE.max;

  let photoButtonLabel = 'Add profile photo';
  let photoActionText = 'Add photo';
  if (photoUri) {
    photoButtonLabel = 'Change profile photo';
    photoActionText = 'Change photo';
  }

  const showMissing = tried && missing.length > 0;

  return (
    <View style={{ gap: layout.sectionGap }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={photoButtonLabel}
        onPress={pick}
        style={[styles.photoRow, { gap: spacing.lg }]}>
        <View>
          <Avatar name={firstName || '?'} photoUri={photoUri} size={size.avatarXL} />
          <View style={[styles.camera, { backgroundColor: colors.green, borderColor: colors.background }]}>
            <Ionicons name="camera" size={size.iconSmall} color={colors.onGreen} />
          </View>
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyStrong">
            Profile picture <AppText variant="bodyStrong" color="destructive">*</AppText>
          </AppText>
          <AppText variant="caption" color="textSecondary">
            A clear photo of your face, so people can spot you.
          </AppText>
          <AppText variant="bodyStrong" color="greenText">
            {photoActionText}
          </AppText>
        </View>
      </Pressable>

      <FormSection label="More photos" required hint={`At least ${PHOTO_RANGE.min}, up to ${PHOTO_RANGE.max}.`}>
        <PhotoGrid photos={photos} onChange={setPhotos} />
      </FormSection>

      <View style={{ gap: spacing.sm }}>
        <View style={[styles.nameRow, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <TextField
              label="First name"
              required
              value={firstName}
              onChangeText={setFirstName}
              maxLength={LIMITS.firstName}
              autoComplete="given-name"
              textContentType="givenName"
              placeholder="e.g. Samar"
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Last name"
              required
              value={lastName}
              onChangeText={setLastName}
              maxLength={LIMITS.lastName}
              autoComplete="family-name"
              textContentType="familyName"
              placeholder="e.g. Khajuria"
            />
          </View>
        </View>
        <AppText variant="caption" color="textSecondary">
          Others see your first name and last initial only.
        </AppText>
      </View>

      <FormSection label="Gender" required>
        <View accessibilityRole="radiogroup" accessibilityLabel="Gender" style={[styles.wrap, { gap: spacing.sm }]}>
          {GENDERS.map((option) => (
            <Chip
              key={option.value}
              role="radio"
              label={option.label}
              selected={gender === option.value}
              onPress={() => setGender(option.value)}
            />
          ))}
        </View>
        <ToggleRow
          label="Show my gender on my profile"
          value={showGender && gender !== 'prefer-not'}
          onChange={setShowGender}
          disabled={gender === 'prefer-not'}
        />
      </FormSection>

      <TextField
        label="Intro"
        required
        value={intro}
        onChangeText={setIntro}
        maxLength={LIMITS.intro}
        showCounter
        multiline
        placeholder="e.g. Studying computer science, always up for talking about startups, films or the best coffee in town."
      />

      <FormSection
        label="Interests"
        required
        count={`${interests.length}/${INTEREST_RANGE.max}`}
        hint={`Pick ${INTEREST_RANGE.min} to ${INTEREST_RANGE.max}, so people have something to talk about.`}>
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {INTERESTS.map((interest) => {
            const selected = interests.includes(interest);
            return (
              <Chip
                key={interest}
                label={interest}
                selected={selected}
                disabled={!selected && atMax}
                onPress={() => toggleInterest(interest)}
              />
            );
          })}
        </View>
      </FormSection>

      {showAgeCheck && (
        <Checkbox checked={isAdult} onChange={setIsAdult} label="I confirm I am 18 or older">
          <AppText variant="caption" color="textSecondary">
            Yap is for adults only. By continuing you agree to the Community Rules on respectful, safe
            conversations in public places.
          </AppText>
        </Checkbox>
      )}

      {showMissing && (
        <InfoNote tone="danger" icon="alert-circle-outline">
          {`Add ${missing.join(', ')} to continue.`}
        </InfoNote>
      )}

      <Button label={submitLabel} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photoRow: { flexDirection: 'row', alignItems: 'center' },
  camera: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
