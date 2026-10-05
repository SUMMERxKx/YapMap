import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { InfoNote } from '@/components/info-note';
import { TextField } from '@/components/text-field';
import { EVENT_STARTS, LIMITS } from '@/data/types';
import { createEvent } from '@/state/store';
import { useTheme } from '@/theme';

export default function NewEvent() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startIn, setStartIn] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const id = await createEvent({
      title: title.trim(),
      description: description.trim(),
      latitude: Number(lat),
      longitude: Number(lng),
      startsAt: Date.now() + startIn * 60 * 1000,
    });
    setBusy(false);
    router.replace({ pathname: '/group/[id]', params: { id } });
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}
      keyboardShouldPersistTaps="handled">
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title" accessibilityRole="header">
          Create an event
        </AppText>
        <AppText color="textSecondary">It goes on the map at the spot you picked. Anyone can join.</AppText>
      </View>

      <TextField
        label="What's happening?"
        required
        value={title}
        onChangeText={setTitle}
        maxLength={LIMITS.eventTitle}
        placeholder="e.g. Samar wants to go for coffee"
        autoFocus
      />
      <TextField
        label="Details (optional)"
        value={description}
        onChangeText={setDescription}
        maxLength={LIMITS.eventDescription}
        showCounter
        multiline
        placeholder="e.g. Whoever wants to join, join. I'll be at the big table."
      />

      <View style={{ gap: spacing.sm }}>
        <AppText variant="caption">Starts</AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Starts" style={styles.wrap}>
          {EVENT_STARTS.map((s) => (
            <Chip key={s.label} role="radio" label={s.label} selected={startIn === s.minutes} onPress={() => setStartIn(s.minutes)} />
          ))}
        </View>
      </View>

      <InfoNote icon="chatbubbles-outline">Everyone who joins is added to the event's group chat.</InfoNote>

      <View style={{ gap: spacing.sm }}>
        <Button label="Post event" onPress={post} loading={busy} disabled={!title.trim()} haptic />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
