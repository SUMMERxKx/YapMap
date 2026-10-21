// The row at the top of a screen or sheet: a back or close button on the left and an
// optional action on the right, always the same height so titles below line up.

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  leading?: ReactNode; // e.g. a back or close IconButton
  trailing?: ReactNode; // e.g. the safety menu
  children?: ReactNode; // anything between the two (e.g. a progress bar)
};

export function TopBar({ leading, trailing, children }: Props) {
  const { layout, spacing } = useTheme();
  return (
    <View style={[styles.row, { minHeight: layout.topBarHeight, gap: spacing.md }]}>
      {leading}
      <View style={styles.middle}>{children}</View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, flexDirection: 'row', alignItems: 'center' },
});
