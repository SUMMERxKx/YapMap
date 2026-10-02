import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { HeroButton } from '@/components/hero-button';
import { InfoNote } from '@/components/info-note';
import { PersonCard, PersonCardSkeleton } from '@/components/person-card';
import { formatClock, formatMinutesLeft, useCountdown } from '@/hooks/use-countdown';
import { useNearby, useNearbyCount } from '@/hooks/use-nearby';
import { clearOutgoing, dismissExpired, goOffline, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Home() {
  const available = useStore((s) => s.availability !== null);
  return available ? <AvailableHome /> : <IdleHome />;
}

// ---------------------------------------------------------------- not available

function IdleHome() {
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

      <View style={[styles.idleBody, { padding: spacing.xxl, gap: spacing.lg }]}>
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

        <HeroButton onPress={() => router.push('/go-available')} />

        {/* Only shown when 3 or more people are available, so nobody can be singled out. */}
        {count !== null && count >= 3 ? (
          <View style={[styles.countPill, { backgroundColor: colors.greenSoft }]}>
            <View style={[styles.dot, { backgroundColor: colors.greenText }]} />
            <AppText variant="caption" color="greenText">
              {count} people are up for a chat near you
            </AppText>
          </View>
        ) : null}

        <View style={styles.flex} />
        <AppText variant="caption" color="textSecondary" align="center">
          Nobody sees your exact location. Only people who are available appear.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- available

function AvailableHome() {
  const { colors, spacing, radius } = useTheme();
  const availability = useStore((s) => s.availability);
  const left = useCountdown(availability?.expiresAt, () => goOffline('expired'));
  const { people, refreshing, refresh } = useNearby(true);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={people ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.xxl, gap: spacing.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
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

            <PendingRequestBar />

            <AppText variant="bodyStrong">People nearby right now</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <PersonCard person={item} onPress={() => router.push({ pathname: '/person/[id]', params: { id: item.id } })} />
        )}
        ListEmptyComponent={
          people === null ? (
            <View style={{ gap: spacing.md }}>
              <PersonCardSkeleton />
              <PersonCardSkeleton />
            </View>
          ) : (
            <View style={[styles.empty, { gap: spacing.sm }]}>
              <Ionicons name="cafe-outline" size={40} color={colors.textSecondary} />
              <AppText variant="bodyStrong" align="center">
                Nobody else is green here yet
              </AppText>
              <AppText color="textSecondary" align="center">
                You're visible for {formatMinutesLeft(left).replace(' left', '')}. We'll let you know if someone
                says hi.
              </AppText>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

/** Shows a request in progress after the user leaves the waiting screen. */
function PendingRequestBar() {
  const { colors, radius, spacing } = useTheme();
  const outgoing = useStore((s) => s.outgoing);
  const left = useCountdown(outgoing?.status === 'pending' ? outgoing.expiresAt : null);
  if (!outgoing || outgoing.status === 'accepted') return null;

  if (outgoing.status === 'not-this-time') {
    return (
      <InfoNote icon="leaf-outline" title="Not this time." onDismiss={clearOutgoing}>
        {`${outgoing.to.firstName} couldn't chat right now. There are more people to meet.`}
      </InfoNote>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Waiting for ${outgoing.to.firstName}, ${formatClock(left)} left. Open.`}
      onPress={() => router.push('/waiting')}
      style={[
        styles.pending,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
      ]}>
      <Ionicons name="hourglass-outline" size={20} color={colors.textSecondary} />
      <AppText style={styles.flex}>Waiting for {outgoing.to.firstName}</AppText>
      <AppText variant="caption" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
        {formatClock(left)}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  idleBody: { flex: 1, alignItems: 'center' },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availableCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 12 },
});
