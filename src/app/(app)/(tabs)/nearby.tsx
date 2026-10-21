// Nearby tab: the people who are live around you. You only see them while you're live too.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveChatBar } from '@/components/chat/active-chat-bar';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoNote } from '@/components/ui/info-note';
import { PersonCard, PersonCardSkeleton } from '@/components/profile/person-card';
import { useCountdown } from '@/hooks/use-countdown';
import { formatClock, formatMinutesLeft } from '@/lib/format-time';
import { useNearby } from '@/hooks/use-nearby';
import { clearOutgoing, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Nearby() {
  const live = useStore((state) => state.availability !== null);
  if (live) {
    return <NearbyList />;
  }
  return <NotLive />;
}

/** You only see people who can see you too, so the list needs you to be live. */
function NotLive() {
  const { colors, layout, spacing } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg }}>
        <ActiveChatBar />
      </View>
      <View style={[styles.flex, { paddingHorizontal: layout.screenPadding }]}>
        <EmptyState
          icon="people-outline"
          tone="green"
          title="Go live to see who's around"
          body="You only see people who can see you too. Turn green and everyone nearby who's up for a chat shows up here.">
          <Button label="Go live" onPress={() => router.navigate('/')} />
        </EmptyState>
      </View>
    </SafeAreaView>
  );
}

function NearbyList() {
  const { colors, layout, spacing } = useTheme();
  const expiresAt = useStore((state) => state.availability?.expiresAt);
  const left = useCountdown(expiresAt);
  const { people, refreshing, refresh } = useNearby(true);

  // Shown when the list is empty: placeholders while the first load runs, then a friendly note.
  let emptyContent;
  if (people === null) {
    emptyContent = (
      <View style={{ gap: spacing.md }}>
        <PersonCardSkeleton />
        <PersonCardSkeleton />
        <PersonCardSkeleton />
      </View>
    );
  } else {
    emptyContent = (
      <EmptyState
        icon="cafe-outline"
        size="small"
        title="Nobody else is green here yet"
        body="Stay live and we'll let you know if someone says hi."
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={people ?? []}
        keyExtractor={(person) => person.id}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
          flexGrow: 1,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.xs }}>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="title" accessibilityRole="header">
                Nearby
              </AppText>
              <View style={[styles.liveRow, { gap: spacing.sm }]}>
                <View style={[styles.dot, { backgroundColor: colors.green }]} />
                <AppText variant="caption" color="greenText">
                  {`You're live, ${formatMinutesLeft(left)}`}
                </AppText>
              </View>
            </View>
            <ActiveChatBar />
            <PendingRequestBar />
          </View>
        }
        renderItem={({ item }) => (
          <PersonCard person={item} onPress={() => router.push({ pathname: '/person/[id]', params: { id: item.id } })} />
        )}
        ListEmptyComponent={emptyContent}
      />
    </SafeAreaView>
  );
}

/** Shows a request in progress after the user leaves the waiting screen. */
function PendingRequestBar() {
  const { colors, size, spacing } = useTheme();
  const outgoing = useStore((state) => state.outgoing);
  // Only a pending request has a countdown.
  let countdownTo: number | null = null;
  if (outgoing?.status === 'pending') {
    countdownTo = outgoing.expiresAt;
  }
  const left = useCountdown(countdownTo);
  if (!outgoing || outgoing.status === 'accepted') return null;

  if (outgoing.status === 'not-this-time') {
    return (
      <InfoNote icon="leaf-outline" title="Not this time." onDismiss={clearOutgoing}>
        {`${outgoing.to.firstName} couldn't chat right now. There are more people to meet.`}
      </InfoNote>
    );
  }

  return (
    <Card
      padding="compact"
      accessibilityLabel={`Waiting for ${outgoing.to.firstName}, ${formatClock(left)} left. Open.`}
      onPress={() => router.push('/waiting')}
      style={{ ...styles.pending, gap: spacing.md, paddingHorizontal: spacing.lg }}>
      <Ionicons name="hourglass-outline" size={size.iconMedium} color={colors.textSecondary} />
      <AppText style={styles.flex}>Waiting for {outgoing.to.firstName}</AppText>
      <AppText variant="caption" color="textSecondary" style={{ fontVariant: ['tabular-nums'] }}>
        {formatClock(left)}
      </AppText>
      <Ionicons name="chevron-forward" size={size.iconMedium} color={colors.textSecondary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pending: { flexDirection: 'row', alignItems: 'center' },
});
