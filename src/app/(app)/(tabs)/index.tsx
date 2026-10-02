import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { HeroButton } from '@/components/hero-button';
import { InfoNote } from '@/components/info-note';
import { formatMinutesLeft, useCountdown } from '@/hooks/use-countdown';
import { dismissExpired, goOffline, useStore } from '@/state/store';
import { useTheme } from '@/theme';

/** Go live: just the button. Tap to turn green, tap again (or "Get off") to stop. */
export default function GoLive() {
  const { colors, spacing } = useTheme();
  const availability = useStore((s) => s.availability);
  const expired = useStore((s) => s.availabilityExpired);
  const left = useCountdown(availability?.expiresAt);
  const live = availability !== null;

  const getOff = () =>
    Alert.alert('Get off?', "You'll stop being visible to people nearby.", [
      { text: 'Stay live', style: 'cancel' },
      { text: 'Get off', style: 'destructive', onPress: () => goOffline('done') },
    ]);

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
            You're no longer visible. Turn green again whenever you like.
          </InfoNote>
        </View>
      ) : null}

      <View style={[styles.center, { padding: spacing.xxl, gap: spacing.lg }]}>
        <HeroButton
          live={live}
          timeLeft={formatMinutesLeft(left)}
          onPress={live ? getOff : () => router.push('/go-available')}
        />

        {live ? (
          <View style={{ alignSelf: 'stretch', gap: spacing.sm, alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`How to find me: ${availability.note || 'no note'}. Edit note`}
              onPress={() => router.push({ pathname: '/go-available', params: { mode: 'edit' } })}
              hitSlop={8}
              style={styles.noteRow}>
              <AppText color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {availability.note ? `"${availability.note}"` : 'No "How to find me" note'}
              </AppText>
              <AppText variant="bodyStrong" color="greenText">
                Edit
              </AppText>
            </Pressable>
            <Button
              label="Get off"
              icon="stop-circle-outline"
              variant="destructiveSoft"
              onPress={getOff}
              style={{ alignSelf: 'stretch', marginTop: spacing.sm }}
            />
          </View>
        ) : null}
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
