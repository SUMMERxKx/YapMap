import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Button, IconButton } from '@/components/button';
import { SafetyMenu } from '@/components/safety-menu';
import { formatEventTime } from '@/hooks/use-countdown';
import { joinEvent, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const event = useStore((s) => s.events.find((e) => e.id === id));
  const [joining, setJoining] = useState(false);

  if (!event) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;

  const hostName = event.host.id === 'me' ? 'You' : `${event.host.firstName} ${event.host.lastInitial}.`;
  const openChat = () => router.replace({ pathname: '/group/[id]', params: { id: event.id } });

  const join = async () => {
    setJoining(true);
    await joinEvent(event.id);
    setJoining(false);
    openChat();
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}>
      <View style={styles.topRow}>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
        {event.host.id !== 'me' ? <SafetyMenu userId={event.host.id} firstName={hostName} onBlocked={() => router.back()} /> : null}
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

      {event.description ? (
        <View style={[styles.box, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }]}>
          <AppText>{event.description}</AppText>
        </View>
      ) : null}

      <View style={[styles.host, { gap: spacing.md }]}>
        <Avatar name={event.host.firstName} photoUri={event.host.photoUri} size={48} />
        <View>
          <AppText variant="caption" color="textSecondary">
            Hosted by
          </AppText>
          <AppText variant="bodyStrong">{hostName}</AppText>
        </View>
      </View>

      {event.joined ? (
        <Button label="Open group chat" icon="chatbubbles-outline" onPress={openChat} />
      ) : (
        <Button label="Join and open chat" icon="add-circle-outline" onPress={join} loading={joining} haptic />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  box: { borderWidth: StyleSheet.hairlineWidth },
  host: { flexDirection: 'row', alignItems: 'center' },
});
