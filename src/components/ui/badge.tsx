// Small green pill label, e.g. "here now".

import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = { label: string };

export function Badge({ label }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.greenSoft,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}>
      <AppText variant="caption" color="greenText">
        {label}
      </AppText>
    </View>
  );
}
