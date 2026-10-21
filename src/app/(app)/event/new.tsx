import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { EventIcon } from '@/components/events/event-icon';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { EVENT_CATEGORIES, EVENT_MAX_AHEAD_MS, LIMITS } from '@/data/constants';
import { errorMessage } from '@/lib/error-message';
import { formatStartTime } from '@/lib/format-time';
import { createEvent } from '@/state/store';
import { useTheme } from '@/theme';

/** Create an event at the spot picked on the map: what kind it is, title, details and a start time. */
export default function NewEvent() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const { colors, layout, radius, size, spacing, scheme } = useTheme();
  const [category, setCategory] = useState<string>(EVENT_CATEGORIES[0].value);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => Date.now());
  // The picker's allowed range is captured when it opens (not during render, which must stay pure).
  const [iosPicker, setIosPicker] = useState<{ min: number; max: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Events can start any time from now up to a week ahead.
  const clamp = (time: number) => {
    const earliest = Date.now();
    const latest = Date.now() + EVENT_MAX_AHEAD_MS;
    return Math.min(Math.max(time, earliest), latest);
  };

  const pickStart = () => {
    if (Platform.OS === 'ios') {
      // Tapping again closes the inline picker.
      setIosPicker((open) => {
        if (open) return null;
        return { min: Date.now(), max: Date.now() + EVENT_MAX_AHEAD_MS };
      });
      return;
    }
    // Android has no combined picker, so it's two steps: the day, then the time.
    DateTimePickerAndroid.open({
      value: new Date(startsAt),
      mode: 'date',
      minimumDate: new Date(),
      maximumDate: new Date(Date.now() + EVENT_MAX_AHEAD_MS),
      onChange: (dateEvent, date) => {
        if (dateEvent.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (timeEvent, dateTime) => {
            if (timeEvent.type === 'set' && dateTime) setStartsAt(clamp(dateTime.getTime()));
          },
        });
      },
    });
  };

  const post = async () => {
    if (!title.trim()) return;
    setBusy(true);
    let id: string;
    try {
      id = await createEvent({
        emoji: category,
        title: title.trim(),
        description: description.trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        startsAt: clamp(startsAt),
      });
    } catch (error) {
      Alert.alert("Couldn't post the event", errorMessage(error, 'Try again.'));
      setBusy(false);
      return;
    }
    setBusy(false);
    router.replace({ pathname: '/group/[id]', params: { id } });
  };

  return (
    <Screen
      scroll
      surface="surface"
      edges={['bottom']}
      footer={
        <>
          <Button label="Post event" onPress={post} loading={busy} disabled={!title.trim()} haptic />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </>
      }>
      <ScreenHeader title="Create an event" subtitle="It goes on the map at the spot you picked. Anyone can join." />

      <FormSection label="What kind of event? Its icon is the pin on the map">
        <View accessibilityRole="radiogroup" accessibilityLabel="Kind of event" style={[styles.wrap, { gap: spacing.sm }]}>
          {EVENT_CATEGORIES.map((option) => {
            const selected = category === option.value;
            let backgroundColor = colors.surfaceMuted;
            let borderColor = 'transparent';
            let iconTone: 'solid' | 'soft' = 'soft';
            let labelColor: 'textSecondary' | 'greenText' = 'textSecondary';
            if (selected) {
              backgroundColor = colors.greenSoft;
              borderColor = colors.green;
              iconTone = 'solid';
              labelColor = 'greenText';
            }
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.name}
                onPress={() => setCategory(option.value)}
                style={[
                  styles.option,
                  { borderRadius: radius.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor, borderColor },
                ]}>
                <EventIcon value={option.value} size={size.avatarSmall} tone={iconTone} />
                <AppText variant="caption" color={labelColor} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {option.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </FormSection>

      <TextField
        label="What's happening?"
        required
        value={title}
        onChangeText={setTitle}
        maxLength={LIMITS.eventTitle}
        placeholder="e.g. Samar wants to go for coffee"
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

      <FormSection label="Starts">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Starts ${formatStartTime(startsAt)}. Change`}
          onPress={pickStart}
          style={[
            styles.startRow,
            {
              minHeight: layout.controlHeight,
              paddingHorizontal: spacing.lg,
              gap: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderColor: colors.inputBorder,
            },
          ]}>
          <Ionicons name="calendar-outline" size={size.iconMedium} color={colors.greenText} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {formatStartTime(startsAt)}
          </AppText>
          <AppText variant="fieldLabel" color="greenText">
            Change
          </AppText>
        </Pressable>
        {iosPicker !== null && Platform.OS === 'ios' && (
          <DateTimePicker
            value={new Date(startsAt)}
            mode="datetime"
            display="spinner"
            minimumDate={new Date(iosPicker.min)}
            maximumDate={new Date(iosPicker.max)}
            themeVariant={scheme}
            onChange={(_event, date) => {
              if (date) setStartsAt(clamp(date.getTime()));
            }}
          />
        )}
        <AppText variant="caption" color="textSecondary">
          Any time from now up to a week ahead.
        </AppText>
      </FormSection>

      <InfoNote icon="chatbubbles-outline">Everyone who joins is added to the event's group chat.</InfoNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  // Four to a row on every screen width: 22% leaves room for the gaps, and flexGrow fills the rest.
  option: { flexBasis: '22%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  startRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});
