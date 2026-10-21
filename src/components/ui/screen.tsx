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
  const { colors, layout, spacing } = useTheme();

  // The same edges on every screen: the side padding lines content up with the top bar,
  // and the bottom padding is smaller when a pinned footer follows.
  let paddingBottom: number = spacing.xxl;
  if (footer) {
    paddingBottom = spacing.sm;
  }
  const contentStyle = {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom,
    gap: layout.stackGap,
  };

  let body;
  if (scroll) {
    body = (
      <ScrollView
        contentContainerStyle={[contentStyle, styles.grow]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {children}
      </ScrollView>
    );
  } else {
    body = <View style={[contentStyle, styles.flex]}>{children}</View>;
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
          <View
            style={{
              paddingHorizontal: layout.screenPadding,
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
              gap: spacing.sm,
            }}>
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, grow: { flexGrow: 1 } });
