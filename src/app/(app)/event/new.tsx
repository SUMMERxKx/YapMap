import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { InfoNote } from '@/components/info-note';
import { TextField } from '@/components/text-field';
import { EVENT_EMOJIS, EVENT_MAX_AHEAD_MS, LIMITS } from '@/data/types';
import { formatStartTime } from '@/hooks/use-countdown';
import { createEvent } from '@/state/store';
import { useTheme } from '@/theme';

/** Create an event at the spot picked on the map: emoji, title, details and a start time. */
export default function NewEvent() {
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const { colors, radius, spacing, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [emoji, setEmoji] = useState<string>(EVENT_EMOJIS[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => Date.now());
  // The picker's allowed range is captured when it opens (not during render, which must stay pure).
  const [iosPicker, setIosPicker] = useState<{ min: number; max: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Events can start any time from now up to a week ahead.
  const clamp = (t: number) => Math.min(Math.max(t, Date.now()), Date.now() + EVENT_MAX_AHEAD_MS);

  const pickStart = () => {
    if (Platform.OS === 'ios') {
      setIosPicker((open) => (open ? null : { min: Date.now(), max: Date.now() + EVENT_MAX_AHEAD_MS }));
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
    const id = await createEvent({
      emoji,
      title: title.trim(),
      description: description.trim(),
      latitude: Number(lat),
      longitude: Number(lng),
      startsAt: clamp(startsAt),
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

      <View style={{ gap: spacing.sm }}>
        <AppText variant="caption">Pick an emoji — it's the pin on the map</AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Event emoji" style={styles.wrap}>
          {EVENT_EMOJIS.map((option) => {
            const selected = emoji === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option}
                onPress={() => setEmoji(option)}
                style={[
                  styles.emoji,
                  {
                    borderRadius: radius.md,
                    backgroundColor: selected ? colors.greenSoft : colors.surfaceMuted,
                    borderColor: selected ? colors.green : 'transparent',
                  },
                ]}>
                <AppText style={styles.emojiGlyph} maxFontSizeMultiplier={1.2}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

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

      <View style={{ gap: spacing.sm }}>
        <AppText variant="caption">Starts</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Starts ${formatStartTime(startsAt)}. Change`}
          onPress={pickStart}
          style={[
            styles.startRow,
            { borderRadius: radius.md, backgroundColor: colors.surface, borderColor: colors.inputBorder },
          ]}>
          <Ionicons name="calendar-outline" size={20} color={colors.greenText} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {formatStartTime(startsAt)}
          </AppText>
          <AppText variant="caption" color="greenText">
            Change
          </AppText>
        </Pressable>
        {iosPicker && Platform.OS === 'ios' ? (
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
        ) : null}
        <AppText variant="caption" color="textSecondary">
          Any time from now up to a week ahead.
        </AppText>
      </View>

      <InfoNote icon="chatbubbles-outline">Everyone who joins is added to the event's group chat.</InfoNote>

      <View style={{ gap: spacing.sm }}>
        <Button label="Post event" onPress={post} loading={busy} disabled={!title.trim()} haptic />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoji: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  emojiGlyph: { fontSize: 26, lineHeight: 32 },
  startRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1 },
});
