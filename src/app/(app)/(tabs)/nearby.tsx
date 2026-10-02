import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { InfoNote } from '@/components/info-note';
import { PersonCard, PersonCardSkeleton } from '@/components/person-card';
import { formatClock, formatMinutesLeft, useCountdown } from '@/hooks/use-countdown';
import { useNearby } from '@/hooks/use-nearby';
import { clearOutgoing, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Nearby() {
  const live = useStore((s) => s.availability !== null);
  return live ? <NearbyList /> : <NotLive />;
}

/** You only see people who can see you too, so the list needs you to be live. */
function NotLive() {
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.center, { padding: spacing.xxl, gap: spacing.md }]}>
        <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
        <AppText variant="title" align="center" accessibilityRole="header">
          Go live to see who's around
        </AppText>
        <AppText color="textSecondary" align="center">
          You only see people who can see you too. Turn green and everyone nearby who's up for a chat shows up here.
        </AppText>
        <Button label="Go live" onPress={() => router.navigate('/')} style={{ alignSelf: 'stretch', marginTop: spacing.sm }} />
      </View>
    </SafeAreaView>
  );
}

function NearbyList() {
  const { colors, spacing } = useTheme();
  const expiresAt = useStore((s) => s.availability?.expiresAt);
  const left = useCountdown(expiresAt);
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
            <View style={{ gap: 2 }}>
              <AppText variant="title" accessibilityRole="header">
                Nearby
              </AppText>
              <View style={styles.liveRow}>
                <View style={[styles.dot, { backgroundColor: colors.green }]} />
                <AppText variant="caption" color="greenText">
                  {`You're live, ${formatMinutesLeft(left)}`}
                </AppText>
              </View>
            </View>
            <PendingRequestBar />
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
                Stay live and we'll let you know if someone says hi.
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 12 },
});
