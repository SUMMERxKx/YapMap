// Setup step 5: the profile picture.

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { SetupStep } from '@/components/profile/setup-step';
import { photoProblem } from '@/lib/picked-photo';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';
import { useTheme } from '@/theme';

const PICKER: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

export default function PhotoStep() {
  const { spacing } = useTheme();
  const { draft, update } = useProfileDraft();
  const [cameraDenied, setCameraDenied] = useState(false);

  /** Uses the picked photo, or says why it can't be used. */
  const keepPicked = (result: ImagePicker.ImagePickerResult) => {
    const picked = result.assets?.[0];
    if (result.canceled || !picked) return;
    const problem = photoProblem(picked);
    if (problem) {
      Alert.alert("Can't use that photo", problem);
      return;
    }
    update({ photoUri: picked.uri });
  };

  const choose = async () => {
    keepPicked(await ImagePicker.launchImageLibraryAsync(PICKER));
  };

  const take = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setCameraDenied(true);
      return;
    }
    setCameraDenied(false);
    keepPicked(await ImagePicker.launchCameraAsync({ ...PICKER, cameraType: ImagePicker.CameraType.front }));
  };

  let chooseLabel = 'Choose from library';
  if (draft.photoUri) {
    chooseLabel = 'Choose a different photo';
  }

  return (
    <SetupStep
      step={5}
      total={SETUP_STEPS}
      title="Your profile picture"
      subtitle="A clear photo of your face. It's the first thing people see, and how they spot you."
      canContinue={draft.photoUri !== null}
      onNext={() => router.push('/profile-setup/photos')}>
      <View style={[styles.center, { paddingVertical: spacing.lg }]}>
        <Avatar name={draft.firstName || '?'} photoUri={draft.photoUri} size={180} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button
          label={chooseLabel}
          icon="images-outline"
          variant="secondary"
          onPress={choose}
        />
        <Button label="Take a photo" icon="camera-outline" variant="secondary" onPress={take} />
      </View>
      {cameraDenied && (
        <>
          <InfoNote tone="warning" icon="camera-outline" title="Camera is off.">
            You can still choose a photo from your library, or turn the camera on in Settings.
          </InfoNote>
          <Button label="Open Settings" icon="settings-outline" variant="ghost" onPress={() => Linking.openSettings()} />
        </>
      )}
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
});
