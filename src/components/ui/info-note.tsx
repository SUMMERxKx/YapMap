// Inline note with an icon: neutral, green, warning or danger, optionally dismissible.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  icon?: ComponentProps<typeof Ionicons>['name'];
  tone?: 'neutral' | 'green' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
};

export function InfoNote({ icon = 'information-circle-outline', tone = 'neutral', title, children, onDismiss }: Props) {
  const { colors, radius, size, spacing } = useTheme();
  const looks = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary, icon: colors.textSecondary },
    green: { bg: colors.greenSoft, fg: colors.greenText, icon: colors.greenText },
    warning: { bg: colors.warningSoft, fg: colors.warningText, icon: colors.warningText },
    danger: { bg: colors.destructiveSoft, fg: colors.destructive, icon: colors.destructive },
  };
  const look = looks[tone];

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: look.bg, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
      ]}>
      <Ionicons name={icon} size={size.iconMedium} color={look.icon} />
      <AppText variant="caption" style={{ color: look.fg, flex: 1 }}>
        {Boolean(title) && (
          <AppText variant="caption" style={{ color: look.fg, fontWeight: '700' }}>
            {title}{' '}
          </AppText>
        )}
        {children}
      </AppText>
      {onDismiss !== undefined && (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={12}>
          <Ionicons name="close" size={size.iconMedium} color={look.icon} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ box: { flexDirection: 'row', alignItems: 'flex-start' } });
