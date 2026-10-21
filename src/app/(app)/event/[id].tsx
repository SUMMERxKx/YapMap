import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { SafetyMenu } from '@/components/safety/safety-menu';
import { formatEventTime } from '@/lib/format-time';
import { joinEvent, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const event = useStore((state) => state.events.find((mapEvent) => mapEvent.id === id));
  const [joining, setJoining] = useState(false);
  const myId = useStore((state) => state.myId);

  if (!event) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;

  // Signed out (no myId) means you can't be the host.
  const hostedByMe = myId !== null && event.host.id === myId;
  let hostName = `${event.host.firstName} ${event.host.lastInitial}.`;
  if (hostedByMe) {
    hostName = 'You';
  }

  const openChat = () => router.replace({ pathname: '/group/[id]', params: { id: event.id } });

  const join = async () => {
    setJoining(true);
    await joinEvent(event.id);
    setJoining(false);
    openChat();
  };

  let mainButton;
  if (event.joined) {
    mainButton = <Button label="Open group chat" icon="chatbubbles-outline" onPress={openChat} />;
  } else {
    mainButton = (
      <Button label="Join and open chat" icon="add-circle-outline" onPress={join} loading={joining} haptic />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}>
      <View style={styles.topRow}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
        {!hostedByMe && <SafetyMenu userId={event.host.id} firstName={hostName} onBlocked={() => router.back()} />}
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          {event.emoji} {event.title}
        </AppText>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={18} color={colors.greenText} />
          <AppText variant="bodyStrong" color="greenText">
            {formatEventTime(event.startsAt)}
          </AppText>
        </View>
        <View style={styles.meta}>
          <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
          <AppText color="textSecondary">{event.memberCount} going</AppText>
        </View>
      </View>

      {event.description !== '' && (
        <View
          style={[
            styles.box,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.lg,
            },
          ]}>
          <AppText>{event.description}</AppText>
        </View>
      )}

      <View style={[styles.host, { gap: spacing.md }]}>
        <Avatar name={event.host.firstName} photoUri={event.host.photoUri} size={48} />
        <View>
          <AppText variant="caption" color="textSecondary">
            Hosted by
          </AppText>
          <AppText variant="bodyStrong">{hostName}</AppText>
        </View>
      </View>

      {mainButton}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  box: { borderWidth: StyleSheet.hairlineWidth },
  host: { flexDirection: 'row', alignItems: 'center' },
});
