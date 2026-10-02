import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { HeroButton } from '@/components/hero-button';
import { InfoNote } from '@/components/info-note';
import { formatMinutesLeft, useCountdown } from '@/hooks/use-countdown';
import { useNearbyCount } from '@/hooks/use-nearby';
import { dismissExpired, goOffline, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function GoLive() {
  const live = useStore((s) => s.availability !== null);
  return live ? <LiveState /> : <IdleState />;
}

function IdleState() {
  const { colors, spacing } = useTheme();
  const expired = useStore((s) => s.availabilityExpired);
  const count = useNearbyCount(true);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.xxl }]}>
        <AppText variant="heading" style={{ color: colors.green, fontWeight: '800' }}>
          Yap
        </AppText>
      </View>

      <View style={[styles.body, { padding: spacing.xxl, gap: spacing.lg }]}>
        {expired ? (
          <InfoNote icon="time-outline" title="Your time's up." onDismiss={dismissExpired}>
            You're no longer visible. Turn green again whenever you like.
          </InfoNote>
        ) : null}

        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <AppText variant="title" align="center" accessibilityRole="header">
            In a café or lounge?
          </AppText>
          <AppText color="textSecondary" align="center">
            Turn green when you're ready for an open, friendly conversation.
          </AppText>
        </View>

        <View style={{ alignItems: 'center' }}>
          <HeroButton onPress={() => router.push('/go-available')} />
        </View>

        {count !== null && count >= 3 ? (
          <View style={[styles.countPill, { backgroundColor: colors.greenSoft }]}>
            <View style={[styles.dot, { backgroundColor: colors.greenText }]} />
            <AppText variant="caption" color="greenText">
              {count} people are up for a chat near you
            </AppText>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function LiveState() {
  const { colors, spacing, radius } = useTheme();
  const availability = useStore((s) => s.availability);
  const left = useCountdown(availability?.expiresAt);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.body, { padding: spacing.xxl, gap: spacing.lg, justifyContent: 'center' }]}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: colors.green, width: 12, height: 12 }]} />
          <AppText variant="heading" style={styles.flex} accessibilityRole="header">
            You're available
          </AppText>
          <Button label="I'm done" variant="secondary" onPress={() => goOffline('done')} style={{ minHeight: 44 }} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatMinutesLeft(left)}. How to find me: ${availability?.note || 'no note'}. Tap to edit.`}
          onPress={() => router.push({ pathname: '/go-available', params: { mode: 'edit' } })}
          style={[styles.availableCard, { backgroundColor: colors.greenSoft, borderRadius: radius.lg, padding: spacing.lg }]}>
          <Ionicons name="time-outline" size={24} color={colors.greenText} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" color="greenText">
              {formatMinutesLeft(left)}
            </AppText>
            <AppText variant="caption" color="greenText" numberOfLines={1}>
              {availability?.note ? `"${availability.note}"` : 'Add a "How to find me" note'}
            </AppText>
          </View>
          <AppText variant="caption" color="greenText" style={{ textDecorationLine: 'underline' }}>
            Edit note
          </AppText>
        </Pressable>

        <Button label="See who's nearby" icon="people-outline" onPress={() => router.navigate('/nearby')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  body: { flex: 1 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availableCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
