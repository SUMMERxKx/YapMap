import { useColorScheme } from 'react-native';

import { elevation, palette, radius, spacing, touch, type, type Colors } from './tokens';

export { elevation, palette, radius, spacing, touch, type };
export type { Colors, ColorName, TypeVariant } from './tokens';

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors: Colors = palette[scheme];
  return { scheme, colors, spacing, radius, type, touch, elevation } as const;
}
