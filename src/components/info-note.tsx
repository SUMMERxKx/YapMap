import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = {
  icon?: ComponentProps<typeof Ionicons>['name'];
  tone?: 'neutral' | 'green' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
};

export function InfoNote({ icon = 'information-circle-outline', tone = 'neutral', title, children, onDismiss }: Props) {
  const { colors, radius, spacing } = useTheme();
  const look = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary, icon: colors.textSecondary },
    green: { bg: colors.greenSoft, fg: colors.greenText, icon: colors.greenText },
    warning: { bg: colors.warningSoft, fg: colors.warningText, icon: colors.warningText },
    danger: { bg: colors.destructiveSoft, fg: colors.destructive, icon: colors.destructive },
  }[tone];

  return (
    <View style={[styles.box, { backgroundColor: look.bg, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }]}>
      <Ionicons name={icon} size={20} color={look.icon} style={{ marginTop: 1 }} />
      <AppText variant="caption" style={{ color: look.fg, flex: 1 }}>
        {title ? <AppText variant="caption" style={{ color: look.fg, fontWeight: '700' }}>{title} </AppText> : null}
        {children}
      </AppText>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={12}>
          <Ionicons name="close" size={20} color={look.icon} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ box: { flexDirection: 'row', alignItems: 'flex-start' } });
