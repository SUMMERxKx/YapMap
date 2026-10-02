import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Profile } from '@/data/types';
import { LIMITS } from '@/data/types';
import { useTheme } from '@/theme';

import { AppText } from './app-text';
import { Avatar } from './avatar';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { InfoNote } from './info-note';
import { TextField } from './text-field';

type Values = Omit<Profile, 'id'>;
type Props = {
  initial?: Values;
  submitLabel: string;
  onSubmit: (values: Values) => void;
  showAgeCheck?: boolean;
};

export function ProfileForm({ initial, submitLabel, onSubmit, showAgeCheck = true }: Props) {
  const { colors, spacing } = useTheme();
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [intro, setIntro] = useState(initial?.intro ?? '');
  const [isAdult, setIsAdult] = useState(initial?.isAdult ?? false);
  const [tried, setTried] = useState(false);

  const missing = [
    !photoUri && 'a photo',
    !firstName.trim() && 'your first name',
    !intro.trim() && 'a one-line intro',
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

  const submit = () => {
    setTried(true);
    if (missing.length === 0) {
      onSubmit({ photoUri, firstName: firstName.trim(), intro: intro.trim(), isAdult });
    }
  };

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
            Profile photo <AppText variant="bodyStrong" color="destructive">*</AppText>
          </AppText>
          <AppText variant="caption" color="textSecondary">
            A clear photo of your face, so people can spot you.
          </AppText>
          <AppText variant="bodyStrong" color="greenText">
            {photoUri ? 'Change photo' : 'Add photo'}
          </AppText>
        </View>
      </Pressable>

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
      <TextField
        label="One-line intro"
        required
        value={intro}
        onChangeText={(t) => setIntro(t.replace(/\n/g, ' '))}
        maxLength={LIMITS.intro}
        showCounter
        multiline
        placeholder="e.g. Happy to talk about anything except work"
      />

      {showAgeCheck ? (
        <Checkbox checked={isAdult} onChange={setIsAdult} label="I confirm I am 18 or older">
          <AppText variant="caption" color="textSecondary">
            Yap is for adults only. By continuing you agree to the Community Rules on respectful,
            safe conversations in public places.
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
});
