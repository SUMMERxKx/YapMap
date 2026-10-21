import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

/** Shown on profiles whose selfie matched their photo. */
export function VerifiedBadge({ align = 'center' }: { align?: 'center' | 'flex-start' }) {
  const { colors, radius, size, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Verified profile"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.greenSoft,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        alignSelf: align,
      }}>
      <Ionicons name="checkmark-circle" size={size.iconSmall} color={colors.greenText} />
      <AppText variant="caption" color="greenText">
        Verified
      </AppText>
    </View>
  );
}
