import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = { label: string; tone?: 'green' | 'neutral' };

export function Badge({ label, tone = 'green' }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tone === 'green' ? colors.greenSoft : colors.surfaceMuted,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}>
      <AppText variant="caption" color={tone === 'green' ? 'greenText' : 'textSecondary'}>
        {label}
      </AppText>
    </View>
  );
}
