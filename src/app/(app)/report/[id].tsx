// Report someone (and optionally block them at the same time).

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { REPORT_REASONS } from '@/data/constants';
import type { ReportReason } from '@/data/types';
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
    let thanksText = "We'll review this. Thanks for helping keep Yap safe.";
    if (alsoBlock) {
      thanksText = `We'll review this. ${name} can't see you any more, and you won't see them.`;
    }
    return (
      <Screen footer={<Button label="Done" onPress={() => router.dismissTo('/')} />}>
        <View style={[styles.center, { gap: spacing.md }]}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.greenText} />
          <AppText variant="title" align="center" accessibilityRole="header">
            Thanks for telling us
          </AppText>
          <AppText color="textSecondary" align="center">
            {thanksText}
          </AppText>
        </View>
      </Screen>
    );
  }

  let submitLabel = 'Submit report';
  if (alsoBlock) {
    submitLabel = 'Submit report and block';
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          label={submitLabel}
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
        {REPORT_REASONS.map((option) => {
          const selected = reason === option.value;
          // The chosen reason gets a thicker red border and a filled radio button.
          let borderColor = colors.border;
          let borderWidth = 1;
          let radioIcon: 'radio-button-on' | 'radio-button-off' = 'radio-button-off';
          let radioColor = colors.inputBorder;
          if (selected) {
            borderColor = colors.destructive;
            borderWidth = 2;
            radioIcon = 'radio-button-on';
            radioColor = colors.destructive;
          }
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => setReason(option.value)}
              style={[
                styles.option,
                { borderRadius: radius.md, backgroundColor: colors.surface, borderColor, borderWidth },
              ]}>
              <AppText style={{ flex: 1 }}>{option.label}</AppText>
              <Ionicons name={radioIcon} size={22} color={radioColor} />
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
