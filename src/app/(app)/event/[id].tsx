import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SafetyMenu } from '@/components/safety/safety-menu';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import { formatEventTime } from '@/lib/format-time';
import { joinEvent, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, layout, size, spacing } = useTheme();
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

  let safetyMenu = null;
  if (!hostedByMe) {
    safetyMenu = <SafetyMenu userId={event.host.id} firstName={hostName} onBlocked={() => router.back()} />;
  }

  let mainButton;
  if (event.joined) {
    mainButton = <Button label="Open group chat" icon="chatbubbles-outline" onPress={openChat} />;
  } else {
    mainButton = (
      <Button label="Join and open chat" icon="add-circle-outline" onPress={join} loading={joining} haptic />
    );
  }

  return (
    <Screen scroll surface="surface" edges={['bottom']} footer={mainButton}>
      <TopBar
        leading={<IconButton icon="close" label="Close" onPress={() => router.back()} />}
        trailing={safetyMenu}
      />

      <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          {event.emoji} {event.title}
        </AppText>
        <View style={[styles.meta, { gap: spacing.sm }]}>
          <Ionicons name="time-outline" size={size.iconMedium} color={colors.greenText} />
          <AppText variant="bodyStrong" color="greenText">
            {formatEventTime(event.startsAt)}
          </AppText>
        </View>
        <View style={[styles.meta, { gap: spacing.sm }]}>
          <Ionicons name="people-outline" size={size.iconMedium} color={colors.textSecondary} />
          <AppText color="textSecondary">{event.memberCount} going</AppText>
        </View>
      </View>

      {event.description !== '' && (
        <Card surface="background">
          <AppText>{event.description}</AppText>
        </Card>
      )}

      <View style={[styles.host, { gap: spacing.md, minHeight: layout.controlHeight }]}>
        <Avatar name={event.host.firstName} photoUri={event.host.photoUri} size={size.avatarMedium} />
        <View style={{ gap: spacing.xxs }}>
          <AppText variant="caption" color="textSecondary">
            Hosted by
          </AppText>
          <AppText variant="bodyStrong">{hostName}</AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center' },
  host: { flexDirection: 'row', alignItems: 'center' },
});
