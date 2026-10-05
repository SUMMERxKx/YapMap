import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { SetupStep } from '@/components/setup-step';
import { ToggleRow } from '@/components/toggle-row';
import { GENDERS } from '@/data/types';
import { SETUP_STEPS, useProfileDraft } from '@/state/profile-draft';
import { useTheme } from '@/theme';

export default function GenderStep() {
  const { colors, radius } = useTheme();
  const { draft, update } = useProfileDraft();

  return (
    <SetupStep
      step={2}
      total={SETUP_STEPS}
      title="What's your gender?"
      canContinue={draft.gender !== null}
      onNext={() => router.push('/profile-setup/about')}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Gender" style={{ gap: 10 }}>
        {GENDERS.map((g) => {
          const selected = draft.gender === g.value;
          return (
            <Pressable
              key={g.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={g.label}
              onPress={() => update({ gender: g.value })}
              style={[
                styles.option,
                {
                  borderRadius: radius.lg,
                  backgroundColor: selected ? colors.greenSoft : colors.surface,
                  borderColor: selected ? colors.green : colors.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}>
              <AppText variant="bodyStrong" style={{ flex: 1 }} color={selected ? 'greenText' : 'textPrimary'}>
                {g.label}
              </AppText>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? colors.greenText : colors.inputBorder}
              />
            </Pressable>
          );
        })}
      </View>
      <ToggleRow
        label="Show my gender on my profile"
        description={
          draft.gender === 'prefer-not'
            ? 'Nothing is shown when you choose "Prefer not to say".'
            : 'Turn this off to keep it private. You can change it later.'
        }
        value={draft.showGender && draft.gender !== 'prefer-not'}
        onChange={(showGender) => update({ showGender })}
        disabled={draft.gender === 'prefer-not'}
      />
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
});
