// The go-live sheet: pick a duration and an optional note, then turn green.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DurationChips } from '@/components/live/duration-chips';
import { InfoNote } from '@/components/ui/info-note';
import { TextField } from '@/components/ui/text-field';
import { LIMITS } from '@/data/types';
import { useForegroundLocation } from '@/hooks/use-foreground-location';
import { goGreen, updateNote, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function GoAvailable() {
  const { mode } = useLocalSearchParams<{ mode?: 'edit' }>();
  const editing = mode === 'edit';
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const current = useStore((s) => s.availability);
  const [minutes, setMinutes] = useState<30 | 60 | 120>(current?.minutes ?? 60);
  const [note, setNote] = useState(current?.note ?? '');
  const [busy, setBusy] = useState(false);
  const location = useForegroundLocation();

  const confirm = async () => {
    if (editing) {
      updateNote(note.trim());
      router.back();
      return;
    }
    setBusy(true);
    const result = await location.request();
    if (!result.ok) {
      setBusy(false);
      return;
    }
    try {
      await goGreen({ minutes, note: note.trim(), latitude: result.latitude, longitude: result.longitude, accuracy: result.accuracy });
      router.back();
    } catch (e) {
      Alert.alert('Could not go live', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.xl }}
      keyboardShouldPersistTaps="handled">
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title" accessibilityRole="header">
          {editing ? 'Edit your note' : 'Go available'}
        </AppText>
        <AppText color="textSecondary">
          {editing
            ? 'People near you see this while you\'re live.'
            : 'Pick how long you want to be visible to people nearby.'}
        </AppText>
      </View>

      {editing ? null : (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="caption">Duration</AppText>
          <DurationChips value={minutes} onChange={setMinutes} />
        </View>
      )}

      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={LIMITS.note}
        showCounter
        placeholder="e.g. Here till 4, happy to talk about anything"
      />

      {location.denied ? (
        <InfoNote tone="warning" icon="location-outline" title="Location is off.">
          Yap needs your location only while you're available, to find people in the same place. You can
          turn it on in Settings.
        </InfoNote>
      ) : (
        <InfoNote tone="green" icon="shield-checkmark-outline" title="Your location stays private.">
          It's only used to find people in this place while you're available. Nobody sees where you are, and
          it's deleted when you stop.
        </InfoNote>
      )}

      <View style={{ gap: spacing.sm }}>
        {location.denied ? (
          <Button label="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
        ) : (
          <Button label={editing ? 'Save note' : 'Go live'} onPress={confirm} loading={busy} haptic />
        )}
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
