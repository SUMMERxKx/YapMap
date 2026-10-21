import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveChatBar } from '@/components/chat/active-chat-bar';
import { AppText } from '@/components/ui/app-text';
import { GlassBackdrop } from '@/components/ui/glass-backdrop';
import { HeroButton } from '@/components/live/hero-button';
import { InfoNote } from '@/components/ui/info-note';
import { useCountdown } from '@/hooks/use-countdown';
import { formatMinutesLeft } from '@/lib/format-time';
import { dismissExpired, goOffline, useStore } from '@/state/store';
import { useTheme } from '@/theme';

/** Go live: just the button. Green YAP to go live, red while live, tap again to get off. */
export default function GoLive() {
  const { colors, layout, spacing } = useTheme();
  const availability = useStore((state) => state.availability);
  const expired = useStore((state) => state.availabilityExpired);
  const left = useCountdown(availability?.expiresAt);
  const live = availability !== null;

  let backdropTint: 'live' | 'green' = 'green';
  if (live) {
    backdropTint = 'live';
  }

  // Tapping the big button gets you off while live, or opens the go-live sheet otherwise.
  const onHeroPress = () => {
    if (live) {
      goOffline('done');
    } else {
      router.push('/go-available');
    }
  };

  // While live: your note and a way to edit it. Otherwise: a short explanation.
  let belowButton;
  if (live) {
    const note = availability.note;
    let noteText = 'No note';
    let noteAction = 'Add';
    if (note) {
      noteText = `"${note}"`;
      noteAction = 'Edit';
    }
    belowButton = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Your note: ${note || 'none'}. Edit note`}
        onPress={() => router.push({ pathname: '/go-available', params: { mode: 'edit' } })}
        hitSlop={8}
        style={styles.noteRow}>
        <AppText color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {noteText}
        </AppText>
        <AppText variant="bodyStrong" color="greenText">
          {noteAction}
        </AppText>
      </Pressable>
    );
  } else {
    belowButton = (
      <AppText color="textSecondary" align="center" style={{ maxWidth: 280 }}>
        Tap to go live. People near you who are live too will see you.
      </AppText>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <GlassBackdrop tint={backdropTint} />
      <View style={[styles.header, { paddingHorizontal: layout.screenPadding }]}>
        <AppText variant="heading" style={{ color: colors.green, fontWeight: '800' }}>
          Yap
        </AppText>
      </View>

      <View style={{ paddingHorizontal: layout.screenPadding }}>
        <ActiveChatBar />
      </View>

      {expired && !live && (
        <View style={{ paddingHorizontal: layout.screenPadding }}>
          <InfoNote icon="time-outline" title="Your time's up." onDismiss={dismissExpired}>
            You're no longer visible. Tap YAP whenever you want to go live again.
          </InfoNote>
        </View>
      )}

      <View style={[styles.center, { padding: spacing.xxl, gap: spacing.lg }]}>
        <HeroButton live={live} timeLeft={formatMinutesLeft(left)} onPress={onHeroPress} />
        {belowButton}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, maxWidth: '100%' },
});
