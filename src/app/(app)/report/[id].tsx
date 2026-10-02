import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button, IconButton } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { REPORT_REASONS, type ReportReason } from '@/data/types';
import { blockUser, reportUser } from '@/state/store';
import { useTheme } from '@/theme';

export default function Report() {
  const { id, name = 'this person' } = useLocalSearchParams<{ id: string; name?: string }>();
  const { colors, radius, spacing } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    await reportUser(id, reason, details.trim());
    if (alsoBlock) await blockUser(id, name);
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <Screen footer={<Button label="Done" onPress={() => router.dismissTo('/')} />}>
        <View style={[styles.center, { gap: spacing.md }]}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.greenText} />
          <AppText variant="title" align="center" accessibilityRole="header">
            Thanks for telling us
          </AppText>
          <AppText color="textSecondary" align="center">
            {alsoBlock
              ? `We'll review this. ${name} can't see you any more, and you won't see them.`
              : "We'll review this. Thanks for helping keep YapMap safe."}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          label={alsoBlock ? 'Submit report and block' : 'Submit report'}
          variant="destructive"
          onPress={submit}
          loading={sending}
          disabled={!reason}
        />
      }>
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header" style={{ flex: 1 }}>
          Report {name}
        </AppText>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
      </View>
      {/* Improvement: no promised response time. A two-person team can't guarantee "within 1 hour". */}
      <AppText color="textSecondary">
        Pick a reason. We review every report, and {name} won't know who reported them.
      </AppText>

      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {REPORT_REASONS.map((r) => {
          const selected = reason === r.value;
          return (
            <Pressable
              key={r.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={r.label}
              onPress={() => setReason(r.value)}
              style={[
                styles.option,
                {
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderColor: selected ? colors.destructive : colors.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}>
              <AppText style={{ flex: 1 }}>{r.label}</AppText>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? colors.destructive : colors.inputBorder}
              />
            </Pressable>
          );
        })}
      </View>

      <TextField
        label="Anything else? (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={500}
        placeholder="What happened"
      />

      <Checkbox checked={alsoBlock} onChange={setAlsoBlock} label={`Also block ${name}`} tone="danger">
        <AppText variant="caption" color="textSecondary">
          They won't see you, and you won't see them anywhere in the app.
        </AppText>
      </Checkbox>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
});
