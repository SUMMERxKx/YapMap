import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './app-text';

/** Shown on profiles whose selfie matched their photo. */
export function VerifiedBadge({ align = 'center' }: { align?: 'center' | 'flex-start' }) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Verified profile"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.greenSoft,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: align,
      }}>
      <Ionicons name="checkmark-circle" size={16} color={colors.greenText} />
      <AppText variant="caption" color="greenText">
        Verified
      </AppText>
    </View>
  );
}
