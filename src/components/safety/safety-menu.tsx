import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReportContext } from '@/data/types';
import { errorMessage } from '@/lib/error-message';
import { blockUser } from '@/state/store';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/button';
import { useGuardedPress } from '@/components/ui/press-feedback';

type Props = {
  userId: string;
  firstName: string;
  reportContext?: ReportContext; // the event, say-hi or chat the menu is on, so the report keeps it
  onBlocked?: () => void; // e.g. close the screen the person was on
};

/** The corner "..." menu. Report and Block are always two taps away. */
export function SafetyMenu({ userId, firstName, reportContext, onBlocked }: Props) {
  const [open, setOpen] = useState(false);
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  let reportLabel = `Report ${firstName}`;
  if (reportContext?.eventId) {
    reportLabel = 'Report this event';
  }

  const report = () => {
    setOpen(false);
    router.push({ pathname: '/report/[id]', params: { ...reportContext, id: userId, name: firstName } });
  };

  const block = () => {
    setOpen(false);
    Alert.alert(`Block ${firstName}?`, "They won't see you, and you won't see them.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(userId, firstName);
          } catch (error) {
            Alert.alert(`Couldn't block ${firstName}`, errorMessage(error, 'Try again.'));
            return;
          }
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
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: insets.bottom + spacing.lg,
              paddingTop: spacing.sm,
            }}>
            <MenuItem icon="flag-outline" label={reportLabel} onPress={report} />
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
  const { colors, layout, size, spacing } = useTheme();
  // The menu takes a moment to close, so a second tap could open Report twice.
  const guarded = useGuardedPress(onPress);
  let color = colors.textPrimary;
  if (danger) {
    color = colors.destructive;
  }

  const itemStyle = ({ pressed }: { pressed: boolean }) => {
    let backgroundColor = 'transparent';
    if (pressed) {
      backgroundColor = colors.surfaceMuted;
    }
    return [styles.item, { minHeight: layout.controlHeight + spacing.xs, paddingHorizontal: layout.screenPadding, gap: spacing.lg, backgroundColor }];
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={guarded.onPress} style={itemStyle}>
      <Ionicons name={icon} size={size.iconLarge} color={color} />
      <AppText variant="bodyStrong" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  item: { flexDirection: 'row', alignItems: 'center' },
});
