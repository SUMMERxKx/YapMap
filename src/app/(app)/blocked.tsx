import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { unblockUser, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Blocked() {
  const { colors, spacing } = useTheme();
  const names = useStore((s) => s.blockedNames);
  const entries = Object.entries(names);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xxl, gap: spacing.md, flexGrow: 1 }}
      data={entries}
      keyExtractor={([id]) => id}
      renderItem={({ item: [id, name] }) => (
        <View style={styles.row}>
          <Avatar name={name} photoUri={null} size={48} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {name}
          </AppText>
          <Button label="Unblock" variant="secondary" onPress={() => unblockUser(id)} style={{ minHeight: 44 }} />
        </View>
      )}
      ListEmptyComponent={
        <AppText color="textSecondary" align="center" style={{ marginTop: spacing.huge }}>
          You haven't blocked anyone.
        </AppText>
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
});
