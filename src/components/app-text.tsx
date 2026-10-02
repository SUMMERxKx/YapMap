import { Text, type TextProps } from 'react-native';

import { useTheme, type ColorName, type TypeVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: ColorName;
  align?: 'left' | 'center' | 'right';
};

export function AppText({ variant = 'body', color = 'textPrimary', align, style, ...rest }: Props) {
  const { colors, type } = useTheme();
  return (
    <Text
      {...rest}
      // Respect the system text size, but cap it so layouts stay usable at the largest sizes.
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 1.8}
      style={[type[variant], { color: colors[color], textAlign: align }, style]}
    />
  );
}
