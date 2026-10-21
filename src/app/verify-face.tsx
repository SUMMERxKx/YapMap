import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { SwitchAccountButton } from '@/components/account/switch-account-button';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { VERIFICATION_POSES } from '@/data/constants';
import { markVerified, useStore, verifySelfie } from '@/state/store';
import { useTheme } from '@/theme';

type Step = 'intro' | 'checking' | 'verified' | 'no-match' | 'error';

const randomPose = () => VERIFICATION_POSES[Math.floor(Math.random() * VERIFICATION_POSES.length)];

export default function VerifyFace() {
  const { colors, radius, spacing } = useTheme();
  const profile = useStore((state) => state.profile);
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
      const matched = await verifySelfie(uri);
      if (matched) {
        setStep('verified');
      } else {
        setStep('no-match');
      }
    } catch {
      setStep('error');
    }
  };

  const tryAgain = () => {
    setPose(randomPose()); // a new pose each attempt
    setSelfie(null);
    setStep('intro');
  };

  // The middle icon between the profile photo and the selfie.
  let compareIcon: 'checkmark-circle' | 'swap-horizontal' = 'swap-horizontal';
  let compareIconColor = colors.textSecondary;
  if (step === 'verified') {
    compareIcon = 'checkmark-circle';
    compareIconColor = colors.greenText;
  }

  let selfieSlot = <Ionicons name="camera-outline" size={36} color={colors.textSecondary} />;
  if (selfie) {
    selfieSlot = <Avatar name="Selfie" photoUri={selfie} size={110} />;
  }

  const photos = (
    <View style={styles.photos}>
      <Avatar name={profile?.firstName ?? '?'} photoUri={profile?.photoUri ?? null} size={110} />
      <Ionicons name={compareIcon} size={32} color={compareIconColor} />
      <View
        style={[styles.selfie, { borderRadius: radius.lg * 2, backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        {selfieSlot}
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
    let title = 'Something went wrong';
    let advice = 'Check your connection and try again.';
    if (step === 'no-match') {
      title = "We couldn't match your selfie";
      advice = 'Make sure your face is well lit and clearly visible, and that your profile photo shows your face.';
    }

    return (
      <Screen footer={<Button label="Try again" onPress={tryAgain} />}>
        <View style={[styles.center, { gap: spacing.lg }]}>
          {photos}
          <AppText variant="title" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
            {title}
          </AppText>
          <AppText color="textSecondary" align="center">
            {advice}
          </AppText>
        </View>
      </Screen>
    );
  }

  let mainButton = <Button label="Take selfie" icon="camera-outline" onPress={takeSelfie} />;
  if (cameraDenied) {
    mainButton = <Button label="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} />;
  }
  const footer = (
    <>
      {mainButton}
      <SwitchAccountButton />
    </>
  );

  return (
    <Screen scroll footer={footer}>
      <ScreenHeader
        title="Verify it's you"
        subtitle="A quick selfie keeps Yap free of bots and fake profiles. Everyone here has done the same."
      />

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

      {cameraDenied && (
        <InfoNote tone="warning" icon="camera-outline" title="Camera is off.">
          Yap needs the camera for the verification selfie. You can turn it on in Settings.
        </InfoNote>
      )}

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
