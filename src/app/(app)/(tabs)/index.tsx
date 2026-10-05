import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { HeroButton } from '@/components/hero-button';
import { InfoNote } from '@/components/info-note';
import { formatMinutesLeft, useCountdown } from '@/hooks/use-countdown';
import { dismissExpired, goOffline, useStore } from '@/state/store';
import { useTheme } from '@/theme';

/** Go live: just the button. Green YAP to go live, red while live, tap again to get off. */
export default function GoLive() {
  const { colors, spacing } = useTheme();
  const availability = useStore((s) => s.availability);
  const expired = useStore((s) => s.availabilityExpired);
  const left = useCountdown(availability?.expiresAt);
  const live = availability !== null;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.xxl }]}>
        <AppText variant="heading" style={{ color: colors.green, fontWeight: '800' }}>
          Yap
        </AppText>
      </View>

      {expired && !live ? (
        <View style={{ paddingHorizontal: spacing.xxl }}>
          <InfoNote icon="time-outline" title="Your time's up." onDismiss={dismissExpired}>
            You're no longer visible. Tap YAP whenever you want to go live again.
          </InfoNote>
        </View>
      ) : null}

      <View style={[styles.center, { padding: spacing.xxl, gap: spacing.lg }]}>
        <HeroButton
          live={live}
          timeLeft={formatMinutesLeft(left)}
          onPress={live ? () => goOffline('done') : () => router.push('/go-available')}
        />

        {live ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Your note: ${availability.note || 'none'}. Edit note`}
            onPress={() => router.push({ pathname: '/go-available', params: { mode: 'edit' } })}
            hitSlop={8}
            style={styles.noteRow}>
            <AppText color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {availability.note ? `"${availability.note}"` : 'No note'}
            </AppText>
            <AppText variant="bodyStrong" color="greenText">
              {availability.note ? 'Edit' : 'Add'}
            </AppText>
          </Pressable>
        ) : (
          <AppText color="textSecondary" align="center" style={{ maxWidth: 280 }}>
            Tap to go live. People near you who are live too will see you.
          </AppText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, maxWidth: '100%' },
});
