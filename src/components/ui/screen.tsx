// Page scaffold: safe areas, padding, keyboard avoidance, an optional pinned footer and backdrop.

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode; // pinned to the bottom, above the home indicator
  backdrop?: ReactNode; // decorative layer behind everything (e.g. <GlassBackdrop />)
  edges?: Edge[];
  surface?: 'background' | 'surface';
};

export function Screen({
  children,
  scroll,
  footer,
  backdrop,
  edges = ['top', 'bottom'],
  surface = 'background',
}: Props) {
  const { colors, spacing } = useTheme();

  let body;
  if (scroll) {
    body = (
      <ScrollView
        contentContainerStyle={{ padding: spacing.xxl, gap: spacing.lg, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    );
  } else {
    body = <View style={{ flex: 1, padding: spacing.xxl, gap: spacing.lg }}>{children}</View>;
  }

  let keyboardBehavior: 'padding' | undefined;
  if (Platform.OS === 'ios') {
    keyboardBehavior = 'padding';
  }

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors[surface] }]}>
      {backdrop}
      <KeyboardAvoidingView style={styles.flex} behavior={keyboardBehavior}>
        {body}
        {Boolean(footer) && (
          <View style={{ paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, gap: spacing.sm }}>
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
