// Report someone (and optionally block them at the same time).

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button, IconButton } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { RadioOption } from '@/components/ui/radio-option';
import { Screen } from '@/components/ui/screen';
import { TopBar } from '@/components/ui/top-bar';
import { TextField } from '@/components/ui/text-field';
import { REPORT_REASONS } from '@/data/constants';
import type { ReportReason } from '@/data/types';
import { errorMessage } from '@/lib/error-message';
import { blockUser, reportUser } from '@/state/store';
import { useTheme } from '@/theme';

export default function Report() {
  const { id, name = 'this person' } = useLocalSearchParams<{ id: string; name?: string }>();
  const { spacing } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await reportUser(id, reason, details.trim());
    } catch (error) {
      Alert.alert("Couldn't send the report", errorMessage(error, 'Try again.'));
      setSending(false);
      return;
    }
    if (alsoBlock) {
      try {
        await blockUser(id, name);
      } catch (error) {
        // The report went through; say so, and that the block didn't.
        Alert.alert(`Report sent, but we couldn't block ${name}`, errorMessage(error, 'Try blocking them again.'));
        setAlsoBlock(false);
      }
    }
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
        <EmptyState icon="shield-checkmark-outline" tone="green" title="Thanks for telling us" body={thanksText} />
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
      <TopBar trailing={<IconButton icon="close" label="Close" onPress={() => router.back()} />} />
      <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          Report {name}
        </AppText>
      {/* Improvement: no promised response time. A two-person team can't guarantee "within 1 hour". */}
        <AppText color="textSecondary">
          Pick a reason. We review every report, and {name} won't know who reported them.
        </AppText>
      </View>

      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {REPORT_REASONS.map((option) => (
          <RadioOption
            key={option.value}
            label={option.label}
            tone="danger"
            selected={reason === option.value}
            onPress={() => setReason(option.value)}
          />
        ))}
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

