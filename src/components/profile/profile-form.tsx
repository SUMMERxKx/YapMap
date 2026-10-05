import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Gender, Profile } from '@/data/types';
import { GENDERS, INTEREST_RANGE, INTERESTS, LIMITS, PHOTO_RANGE } from '@/data/types';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
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
  const { colors, spacing } = useTheme();
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

  const missing = [
    !photoUri && 'a profile picture',
    photos.length < PHOTO_RANGE.min && `at least ${PHOTO_RANGE.min} more photos`,
    !firstName.trim() && 'your first name',
    !lastName.trim() && 'your last name',
    !gender && 'your gender',
    !intro.trim() && 'an intro',
    interests.length < INTEREST_RANGE.min && `at least ${INTEREST_RANGE.min} interests`,
    !isAdult && 'confirmation that you are 18 or older',
  ].filter(Boolean) as string[];

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0]?.uri ?? null);
  };

  const toggleInterest = (interest: string) =>
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : current.length < INTEREST_RANGE.max
          ? [...current, interest]
          : current,
    );

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

  return (
    <View style={{ gap: spacing.xl }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={photoUri ? 'Change profile photo' : 'Add profile photo'}
        onPress={pick}
        style={styles.photoRow}>
        <View>
          <Avatar name={firstName || '?'} photoUri={photoUri} size={96} />
          <View style={[styles.camera, { backgroundColor: colors.green, borderColor: colors.background }]}>
            <Ionicons name="camera" size={16} color={colors.onGreen} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong">
            Profile picture <AppText variant="bodyStrong" color="destructive">*</AppText>
          </AppText>
          <AppText variant="caption" color="textSecondary">
            A clear photo of your face, so people can spot you.
          </AppText>
          <AppText variant="bodyStrong" color="greenText">
            {photoUri ? 'Change photo' : 'Add photo'}
          </AppText>
        </View>
      </Pressable>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="caption">
          More photos <AppText variant="caption" color="destructive">*</AppText>
        </AppText>
        <AppText variant="caption" color="textSecondary">
          At least {PHOTO_RANGE.min}, up to {PHOTO_RANGE.max}.
        </AppText>
        <PhotoGrid photos={photos} onChange={setPhotos} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={styles.nameRow}>
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

      <View style={{ gap: spacing.sm }}>
        <AppText variant="caption">
          Gender <AppText variant="caption" color="destructive">*</AppText>
        </AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Gender" style={styles.wrap}>
          {GENDERS.map((g) => (
            <Chip
              key={g.value}
              role="radio"
              label={g.label}
              selected={gender === g.value}
              onPress={() => setGender(g.value)}
            />
          ))}
        </View>
        <ToggleRow
          label="Show my gender on my profile"
          value={showGender && gender !== 'prefer-not'}
          onChange={setShowGender}
          disabled={gender === 'prefer-not'}
        />
      </View>

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

      <View style={{ gap: spacing.sm }}>
        <View style={styles.labelRow}>
          <AppText variant="caption">
            Interests <AppText variant="caption" color="destructive">*</AppText>
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {interests.length}/{INTEREST_RANGE.max}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          Pick {INTEREST_RANGE.min} to {INTEREST_RANGE.max}, so people have something to talk about.
        </AppText>
        <View style={styles.wrap}>
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
      </View>

      {showAgeCheck ? (
        <Checkbox checked={isAdult} onChange={setIsAdult} label="I confirm I am 18 or older">
          <AppText variant="caption" color="textSecondary">
            Yap is for adults only. By continuing you agree to the Community Rules on respectful, safe
            conversations in public places.
          </AppText>
        </Checkbox>
      ) : null}

      {tried && missing.length > 0 ? (
        <InfoNote tone="danger" icon="alert-circle-outline">
          {`Add ${missing.join(', ')} to continue.`}
        </InfoNote>
      ) : null}

      <Button label={submitLabel} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
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
  nameRow: { flexDirection: 'row', gap: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
