// The people you've blocked, with unblock.

import { FlatList, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { unblockUser, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Blocked() {
  const { colors, layout, size, spacing } = useTheme();
  const names = useStore((state) => state.blockedNames);
  const entries = Object.entries(names);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingVertical: spacing.lg,
        gap: spacing.sm,
        flexGrow: 1,
      }}
      data={entries}
      keyExtractor={([id]) => id}
      renderItem={({ item: [id, name] }) => (
        <Card padding="compact" style={{ ...styles.row, gap: spacing.md }}>
          <Avatar name={name} photoUri={null} size={size.avatarMedium} />
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          <Button label="Unblock" variant="secondary" size="compact" onPress={() => unblockUser(id)} />
        </Card>
      )}
      ListEmptyComponent={<EmptyState icon="people-outline" title="You haven't blocked anyone." />}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1 },
});
