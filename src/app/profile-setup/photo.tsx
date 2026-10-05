import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { InfoNote } from '@/components/info-note';
import { SetupStep } from '@/components/setup-step';
import { FEATURES } from '@/config/features';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';
import { saveProfile } from '@/state/store';

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

  const finish = () => {
    const { gender, photoUri } = draft;
    if (!gender || !photoUri) return;
    // Saving moves the app on to the next step (the app, or the selfie check when it's on).
    saveProfile({
      ...draft,
      gender,
      photoUri,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      intro: draft.intro.trim(),
    });
  };

  return (
    <SetupStep
      step={5}
      total={SETUP_STEPS}
      title="Add a photo of you"
      subtitle={
        FEATURES.selfieVerification
          ? "A clear photo of your face, so people can spot you. Next, a quick selfie confirms it's really you."
          : 'A clear photo of your face, so people can spot you.'
      }
      nextLabel="Finish"
      canContinue={draft.photoUri !== null}
      onNext={finish}>
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
