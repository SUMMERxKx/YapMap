// Setup step 2: gender, and whether to show it on the profile.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { SetupStep } from '@/components/profile/setup-step';
import { ToggleRow } from '@/components/ui/toggle-row';
import { GENDERS } from '@/data/constants';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';
import { useTheme } from '@/theme';

export default function GenderStep() {
  const { colors, radius } = useTheme();
  const { draft, update } = useProfileDraft();
  const preferNotToSay = draft.gender === 'prefer-not';

  let showGenderDescription = 'Turn this off to keep it private. You can change it later.';
  if (preferNotToSay) {
    showGenderDescription = 'Nothing is shown when you choose "Prefer not to say".';
  }

  return (
    <SetupStep
      step={2}
      total={SETUP_STEPS}
      title="What's your gender?"
      canContinue={draft.gender !== null}
      onNext={() => router.push('/profile-setup/about')}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Gender" style={{ gap: 10 }}>
        {GENDERS.map((option) => {
          const selected = draft.gender === option.value;

          let backgroundColor = colors.surface;
          let borderColor = colors.border;
          let borderWidth = 1;
          let labelColor: 'greenText' | 'textPrimary' = 'textPrimary';
          let radioIcon: 'radio-button-on' | 'radio-button-off' = 'radio-button-off';
          let radioColor = colors.inputBorder;
          if (selected) {
            backgroundColor = colors.greenSoft;
            borderColor = colors.green;
            borderWidth = 2;
            labelColor = 'greenText';
            radioIcon = 'radio-button-on';
            radioColor = colors.greenText;
          }

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => update({ gender: option.value })}
              style={[
                styles.option,
                {
                  borderRadius: radius.lg,
                  backgroundColor,
                  borderColor,
                  borderWidth,
                },
              ]}>
              <AppText variant="bodyStrong" style={{ flex: 1 }} color={labelColor}>
                {option.label}
              </AppText>
              <Ionicons name={radioIcon} size={22} color={radioColor} />
            </Pressable>
          );
        })}
      </View>
      <ToggleRow
        label="Show my gender on my profile"
        description={showGenderDescription}
        value={draft.showGender && !preferNotToSay}
        onChange={(showGender) => update({ showGender })}
        disabled={preferNotToSay}
      />
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
});
