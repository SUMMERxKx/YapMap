import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { blockUser } from '@/state/store';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/button';

type Props = {
  userId: string;
  firstName: string;
  onBlocked?: () => void; // e.g. close the screen the person was on
};

/** The corner "..." menu. Report and Block are always two taps away. */
export function SafetyMenu({ userId, firstName, onBlocked }: Props) {
  const [open, setOpen] = useState(false);
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const report = () => {
    setOpen(false);
    router.push({ pathname: '/report/[id]', params: { id: userId, name: firstName } });
  };

  const block = () => {
    setOpen(false);
    Alert.alert(`Block ${firstName}?`, "They won't see you, and you won't see them.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          await blockUser(userId, firstName);
          onBlocked?.();
        },
      },
    ]);
  };

  return (
    <>
      <IconButton icon="ellipsis-horizontal" label={`Safety options for ${firstName}`} onPress={() => setOpen(true)} />
      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="Close menu"
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
          onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + spacing.lg,
                paddingTop: spacing.sm,
              },
            ]}>
            <MenuItem icon="flag-outline" label={`Report ${firstName}`} onPress={report} />
            <MenuItem icon="person-remove-outline" label={`Block ${firstName}`} onPress={block} danger />
            <MenuItem icon="close" label="Cancel" onPress={() => setOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: 'flag-outline' | 'person-remove-outline' | 'close';
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const color = danger ? colors.destructive : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { paddingHorizontal: spacing.xxl, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' },
      ]}>
      <Ionicons name={icon} size={22} color={color} />
      <AppText variant="bodyStrong" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: {},
  item: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14 },
});
