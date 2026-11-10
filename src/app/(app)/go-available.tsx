// The go-live sheet: pick a duration and an optional note, then turn green.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Button } from '@/components/ui/button';
import { DurationChips } from '@/components/live/duration-chips';
import { FormSection } from '@/components/ui/form-section';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { LIMITS } from '@/data/constants';
import { useForegroundLocation } from '@/hooks/use-foreground-location';
import { errorMessage } from '@/lib/error-message';
import { goGreen, updateNote, useStore } from '@/state/store';

export default function GoAvailable() {
  const { mode } = useLocalSearchParams<{ mode?: 'edit' }>();
  const editing = mode === 'edit';
  const current = useStore((state) => state.availability);
  const [minutes, setMinutes] = useState<30 | 60 | 120>(current?.minutes ?? 60);
  const [note, setNote] = useState(current?.note ?? '');
  const [busy, setBusy] = useState(false);
  const location = useForegroundLocation();

  const confirm = async () => {
    if (editing) {
      setBusy(true);
      try {
        await updateNote(note.trim());
        router.back();
      } catch (error) {
        Alert.alert("Couldn't save your note", errorMessage(error, 'Try again.'));
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    const result = await location.request();
    if (!result.ok) {
      setBusy(false);
      return;
    }
    try {
      await goGreen({
        minutes,
        note: note.trim(),
        latitude: result.latitude,
        longitude: result.longitude,
        accuracy: result.accuracy,
      });
      router.back();
    } catch (error) {
      Alert.alert('Could not go live', errorMessage(error, 'Try again.'));
    } finally {
      setBusy(false);
    }
  };

  // The same sheet adds a note while you're live ("edit" mode) or takes you live.
  let title = 'Go available';
  let subtitle = 'Pick how long you want to be visible to people nearby.';
  let confirmLabel = 'Go live';
  if (editing) {
    title = 'Edit your note';
    subtitle = "People near you see this while you're live.";
    confirmLabel = 'Save note';
  }

  let locationNote;
  let mainButton;
  if (location.denied) {
    locationNote = (
      <InfoNote tone="warning" icon="location-outline" title="Location is off.">
        Yap needs your location only while you're available, to find people in the same place. You can
        turn it on in Settings.
      </InfoNote>
    );
    mainButton = <Button label="Open Settings" icon="settings-outline" onPress={() => Linking.openSettings()} />;
  } else {
    locationNote = (
      <InfoNote tone="green" icon="shield-checkmark-outline" title="Your location stays private.">
        It's only used to find people in this place while you're available. Nobody sees where you are, and
        when you stop, only the area of about 100 m you were last in is kept.
      </InfoNote>
    );
    mainButton = <Button label={confirmLabel} onPress={confirm} loading={busy} haptic />;
  }

  return (
    <Screen
      scroll
      surface="surface"
      edges={['bottom']}
      footer={
        <>
          {mainButton}
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </>
      }>
      <ScreenHeader title={title} subtitle={subtitle} />

      {!editing && (
        <FormSection label="Duration">
          <DurationChips value={minutes} onChange={setMinutes} />
        </FormSection>
      )}

      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={LIMITS.note}
        showCounter
        placeholder="e.g. Here till 4, happy to talk about anything"
      />

      {locationNote}
    </Screen>
  );
}
