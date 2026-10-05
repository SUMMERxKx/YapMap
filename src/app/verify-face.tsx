import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { VERIFICATION_POSES } from '@/data/types';
import { markVerified, useStore, verifySelfie } from '@/state/store';
import { useTheme } from '@/theme';

type Step = 'intro' | 'checking' | 'verified' | 'no-match' | 'error';

const randomPose = () => VERIFICATION_POSES[Math.floor(Math.random() * VERIFICATION_POSES.length)];

export default function VerifyFace() {
  const { colors, radius, spacing } = useTheme();
  const profile = useStore((s) => s.profile);
  const [step, setStep] = useState<Step>('intro');
  const [pose, setPose] = useState(randomPose);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const takeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setCameraDenied(true);
      return;
    }
    setCameraDenied(false);
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setSelfie(uri);
    setStep('checking');
    try {
      setStep((await verifySelfie(uri)) ? 'verified' : 'no-match');
    } catch {
      setStep('error');
    }
  };

  const tryAgain = () => {
    setPose(randomPose()); // a new pose each attempt
    setSelfie(null);
    setStep('intro');
  };

  const photos = (
    <View style={styles.photos}>
      <Avatar name={profile?.firstName ?? '?'} photoUri={profile?.photoUri ?? null} size={110} />
      <Ionicons
        name={step === 'verified' ? 'checkmark-circle' : 'swap-horizontal'}
        size={32}
        color={step === 'verified' ? colors.greenText : colors.textSecondary}
      />
      <View
        style={[styles.selfie, { borderRadius: 30, backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        {selfie ? (
          <Avatar name="Selfie" photoUri={selfie} size={110} />
        ) : (
          <Ionicons name="camera-outline" size={36} color={colors.textSecondary} />
        )}
      </View>
    </View>
  );

  if (step === 'checking') {
    return (
      <Screen>
        <View style={[styles.center, { gap: spacing.lg }]}>
          {photos}
          <AppText variant="title" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
            Checking it's you…
          </AppText>
          <AppText color="textSecondary" align="center">
            This only takes a few seconds.
          </AppText>
        </View>
      </Screen>
    );
  }

  if (step === 'verified') {
    return (
      <Screen footer={<Button label="Continue" onPress={markVerified} haptic />}>
        <View style={[styles.center, { gap: spacing.lg }]}>
          {photos}
          <AppText variant="title" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
            You're verified
          </AppText>
          <AppText color="textSecondary" align="center">
            People will see a Verified badge on your profile. Your selfie isn't kept.
          </AppText>
        </View>
      </Screen>
    );
  }

  if (step === 'no-match' || step === 'error') {
    return (
      <Screen footer={<Button label="Try again" onPress={tryAgain} />}>
        <View style={[styles.center, { gap: spacing.lg }]}>
          {photos}
          <AppText variant="title" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
            {step === 'no-match' ? "We couldn't match your selfie" : 'Something went wrong'}
          </AppText>
          <AppText color="textSecondary" align="center">
            {step === 'no-match'
              ? 'Make sure your face is well lit and clearly visible, and that your profile photo shows your face.'
              : 'Check your connection and try again.'}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        cameraDenied ? (
          <Button label="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
        ) : (
          <Button label="Take selfie" icon="camera-outline" onPress={takeSelfie} />
        )
      }>
      <AppText variant="title" accessibilityRole="header">
        Verify it's you
      </AppText>
      <AppText color="textSecondary">
        A quick selfie keeps Yap free of bots and fake profiles. Everyone here has done the same.
      </AppText>

      {photos}

      <View
        style={[styles.pose, { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }]}
        accessible
        accessibilityLabel={`Your pose: ${pose.text}`}>
        <Ionicons name={pose.icon} size={36} color={colors.greenText} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label" color="greenText">
            COPY THIS POSE
          </AppText>
          <AppText variant="bodyStrong" color="greenText">
            {pose.text}
          </AppText>
        </View>
      </View>

      {cameraDenied ? (
        <InfoNote tone="warning" icon="camera-outline" title="Camera is off.">
          Yap needs the camera for the verification selfie. You can turn it on in Settings.
        </InfoNote>
      ) : null}

      <InfoNote icon="lock-closed-outline" title="Your privacy:">
        We compare your selfie with your profile photo, then delete the selfie. Only the result is kept,
        and the selfie is never shown to anyone.
      </InfoNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  selfie: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  pose: { flexDirection: 'row', alignItems: 'center' },
});
