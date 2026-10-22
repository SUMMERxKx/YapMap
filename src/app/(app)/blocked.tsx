// The people you've blocked, with unblock.

import { router } from 'expo-router';
import { Alert, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/profile/avatar';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TopBar } from '@/components/ui/top-bar';
import { errorMessage } from '@/lib/error-message';
import { unblockUser, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function Blocked() {
  const { colors, layout, size, spacing } = useTheme();
  const names = useStore((state) => state.blockedNames);
  const entries = Object.entries(names);

  const unblock = async (id: string, name: string) => {
    try {
      await unblockUser(id);
    } catch (error) {
      Alert.alert(`Couldn't unblock ${name}`, errorMessage(error, 'Try again.'));
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.sm,
          flexGrow: 1,
        }}
        data={entries}
        keyExtractor={([id]) => id}
        ListHeaderComponent={
          <>
            <TopBar leading={<IconButton icon="arrow-back" label="Back" onPress={() => router.back()} />} />
            <ScreenHeader title="Blocked people" />
          </>
        }
        renderItem={({ item: [id, name] }) => (
          <Card padding="compact" style={{ ...styles.row, gap: spacing.md }}>
            <Avatar name={name} photoUri={null} size={size.avatarMedium} />
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
              {name}
            </AppText>
            <Button label="Unblock" variant="secondary" size="compact" onPress={() => void unblock(id, name)} />
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="people-outline" title="You haven't blocked anyone." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1 },
});
