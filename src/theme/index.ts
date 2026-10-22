// The theming entry point: useTheme() hands every component the palette for the
// current light/dark scheme plus the shared spacing, layout, radius, size, type and motion scales.

import { useColorScheme } from 'react-native';

import { elevation, layout, motion, palette, radius, size, spacing, type, type Colors } from './tokens';

export type { ColorName, TypeVariant } from './tokens';

export function useTheme() {
  const systemScheme = useColorScheme();
  let scheme: 'light' | 'dark' = 'light';
  if (systemScheme === 'dark') {
    scheme = 'dark';
  }
  const colors: Colors = palette[scheme];
  return { scheme, colors, spacing, layout, radius, size, type, elevation, motion } as const;
}
