// Setup step 5: the profile picture.

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { SetupStep } from '@/components/profile/setup-step';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';

const PICKER: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

export default function PhotoStep() {
  const { draft, update } = useProfileDraft();
  const [cameraDenied, setCameraDenied] = useState(false);

  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER);
    if (!result.canceled) update({ photoUri: result.assets[0]?.uri ?? null });
  };

  const take = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setCameraDenied(true);
      return;
    }
    setCameraDenied(false);
    const result = await ImagePicker.launchCameraAsync({ ...PICKER, cameraType: ImagePicker.CameraType.front });
    if (!result.canceled) update({ photoUri: result.assets[0]?.uri ?? null });
  };

  return (
    <SetupStep
      step={5}
      total={SETUP_STEPS}
      title="Your profile picture"
      subtitle="A clear photo of your face. It's the first thing people see, and how they spot you."
      canContinue={draft.photoUri !== null}
      onNext={() => router.push('/profile-setup/photos')}>
      <View style={styles.center}>
        <Avatar name={draft.firstName || '?'} photoUri={draft.photoUri} size={180} />
      </View>
      <View style={{ gap: 10 }}>
        <Button
          label={draft.photoUri ? 'Choose a different photo' : 'Choose from library'}
          icon="images-outline"
          variant="secondary"
          onPress={choose}
        />
        <Button label="Take a photo" icon="camera-outline" variant="secondary" onPress={take} />
      </View>
      {cameraDenied ? (
        <>
          <InfoNote tone="warning" icon="camera-outline" title="Camera is off.">
            You can still choose a photo from your library, or turn the camera on in Settings.
          </InfoNote>
          <Button label="Open Settings" icon="settings-outline" variant="ghost" onPress={() => Linking.openSettings()} />
        </>
      ) : null}
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 8 },
});
