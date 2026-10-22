// Community guidelines: the rules everyone agrees to when they create an account, and what
// happens when someone breaks them. Opened from sign-up and from Settings, so it works signed
// in or out, and offline. docs/legal/moderation.md describes the same process for the owner.

import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/info-note';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';
import { useTheme } from '@/theme';

const RULES = [
  {
    title: 'Adults only',
    body: 'You must be 18 or older to use Yap. Report anyone who seems younger.',
  },
  {
    title: 'Be respectful',
    body: 'No harassment, bullying, threats, hate speech or slurs, in messages, profiles, notes or events. Nobody is owed a chat: when someone says "not this time" or ends a chat, leave it there.',
  },
  {
    title: 'Keep it clean',
    body: 'No nudity or sexual content in photos, profiles, events or messages, and no asking for it.',
  },
  {
    title: 'Be yourself',
    body: 'Use your real first name and photos of you. No pretending to be someone else, fake accounts, spam, ads or selling.',
  },
  {
    title: 'Nothing illegal or dangerous',
    body: 'No violence, weapons, drugs, or encouraging anyone to hurt themselves or others.',
  },
  {
    title: 'Meet safely',
    body: 'Meet in public places, tell a friend where you are, and leave whenever you want to. Yap never shows anyone where you are.',
  },
];

export default function Guidelines() {
  const { spacing } = useTheme();

  return (
    <Screen scroll>
      <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
      <ScreenHeader
        title="Community guidelines"
        subtitle="Yap is for meeting people nearby in real life. These rules keep that safe and friendly for everyone."
      />

      {RULES.map((rule) => (
        <View key={rule.title} style={{ gap: spacing.xs }}>
          <AppText variant="heading" accessibilityRole="header">
            {rule.title}
          </AppText>
          <AppText color="textSecondary">{rule.body}</AppText>
        </View>
      ))}

      <View style={{ gap: spacing.xs }}>
        <AppText variant="heading" accessibilityRole="header">
          If someone breaks the rules
        </AppText>
        <AppText color="textSecondary">
          Tap ··· on their profile or in your chat, or long-press their message in a group chat, to report or block
          them. Blocking is instant: you stop seeing each other. Every report is reviewed within 24 hours. Content
          that breaks these rules is removed, and people who break them are suspended or removed from Yap. A profile
          reported by three different people is hidden straight away until it has been reviewed.
        </AppText>
        <AppText color="textSecondary">
          Words that break these rules are refused when you post them. There is zero tolerance for objectionable
          content or abusive behaviour.
        </AppText>
      </View>

      <InfoNote icon="warning-outline" tone="warning">
        In danger? Call your local emergency number first. Yap can't send help.
      </InfoNote>
    </Screen>
  );
}
