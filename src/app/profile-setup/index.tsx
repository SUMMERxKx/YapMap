// Setup greeting: the hello and the 18+ confirmation before the questions start.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { Screen } from '@/components/ui/screen';
import { useProfileDraft } from '@/state/profile-draft';
import { useTheme } from '@/theme';

export default function SetupStart() {
  const { colors, spacing } = useTheme();
  const { draft, update } = useProfileDraft();

  return (
    <Screen
      backdrop={<GlassBackdrop />}
      footer={
        <>
          <Checkbox checked={draft.isAdult} onChange={(isAdult) => update({ isAdult })} label="I'm 18 or older">
            <AppText variant="caption" color="textSecondary">
              Yap is for adults only, and you agree to keep conversations respectful and in public places.
            </AppText>
          </Checkbox>
          <Button
            label="Let's go"
            onPress={() => router.push('/profile-setup/name')}
            disabled={!draft.isAdult}
            style={{ marginTop: spacing.sm }}
          />
        </>
      }>
      <View style={[styles.center, { gap: spacing.md }]}>
        <View
          style={[styles.mark, { backgroundColor: colors.greenSoft }]}
          accessibilityElementsHidden
          importantForAccessibility="no">
          <Ionicons name="chatbubbles" size={52} color={colors.greenText} />
        </View>
        <AppText variant="display" align="center" accessibilityRole="header">
          Hey! Let's create your profile
        </AppText>
        <AppText color="textSecondary" align="center" style={{ maxWidth: 320 }}>
          A few quick questions so people nearby know who they're saying hi to. It takes about a minute.
        </AppText>
        <View style={[styles.rule, { backgroundColor: colors.green }]} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  rule: { width: 48, height: 4, borderRadius: 2, marginTop: 8 },
});
