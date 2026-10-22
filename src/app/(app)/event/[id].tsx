import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { EventIcon } from '@/components/events/event-icon';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SafetyMenu } from '@/components/safety/safety-menu';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import { useForegroundLocation } from '@/hooks/use-foreground-location';
import { errorMessage } from '@/lib/error-message';
import { eventCategory } from '@/lib/event-category';
import { formatEventTime } from '@/lib/format-time';
import { deleteEvent, joinEvent, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, layout, size, spacing } = useTheme();
  const event = useStore((state) => state.events.find((mapEvent) => mapEvent.id === id));
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const myId = useStore((state) => state.myId);
  const location = useForegroundLocation();

  // No longer in the store: the server says the host deleted it.
  if (!event) {
    return (
      <Screen surface="surface" edges={['bottom']}>
        <TopBar leading={<IconButton icon="close" label="Close" onPress={() => router.back()} />} />
        <EmptyState mascot="sleepy" title="This event was deleted" body="The host deleted it, and its group chat too." />
      </Screen>
    );
  }

  // Signed out (no myId) means you can't be the host.
  const hostedByMe = myId !== null && event.host.id === myId;
  let hostName = `${event.host.firstName} ${event.host.lastInitial}.`;
  if (hostedByMe) {
    hostName = 'You';
  }

  const openChat = () => router.replace({ pathname: '/group/[id]', params: { id: event.id } });

  // Joining checks where you are: the server only lets you join from within about 5 km.
  const join = async () => {
    setJoining(true);
    try {
      const position = await location.request();
      if (!position.ok) {
        Alert.alert('Location is off', "Yap checks that you're near an event before you join it.", [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      await joinEvent(event.id, position);
      openChat();
    } catch (error) {
      Alert.alert("Couldn't join", errorMessage(error, 'Try again.'));
    } finally {
      setJoining(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete this event?', 'Everyone who joined will lose the group chat.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteEvent(event.id);
          } catch (error) {
            Alert.alert("Couldn't delete the event", errorMessage(error, 'Try again.'));
            setDeleting(false);
            return;
          }
          router.back();
        },
      },
    ]);

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
        <EventIcon value={event.emoji} size={size.avatarLarge} />
        <AppText
          variant="title"
          accessibilityRole="header"
          accessibilityLabel={`${eventCategory(event.emoji).name}: ${event.title}`}>
          {event.title}
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

      {hostedByMe && (
        <Button
          label="Delete event"
          icon="trash-outline"
          variant="destructiveSoft"
          onPress={confirmDelete}
          loading={deleting}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center' },
  host: { flexDirection: 'row', alignItems: 'center' },
});
