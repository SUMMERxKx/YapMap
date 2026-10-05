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

export function Screen({ children, scroll, footer, backdrop, edges = ['top', 'bottom'], surface = 'background' }: Props) {
  const { colors, spacing } = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ padding: spacing.xxl, gap: spacing.lg, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: spacing.xxl, gap: spacing.lg }}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors[surface] }]}>
      {backdrop}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? (
          <View style={{ paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, gap: spacing.sm }}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
