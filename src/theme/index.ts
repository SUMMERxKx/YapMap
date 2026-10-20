// The theming entry point: useTheme() hands every component the palette for the
// current light/dark scheme plus the shared spacing, radius and type scales.

import { useColorScheme } from 'react-native';

import { elevation, palette, radius, spacing, type, type Colors } from './tokens';

export type { ColorName, TypeVariant } from './tokens';

export function useTheme() {
  const systemScheme = useColorScheme();
  let scheme: 'light' | 'dark' = 'light';
  if (systemScheme === 'dark') {
    scheme = 'dark';
  }
  const colors: Colors = palette[scheme];
  return { scheme, colors, spacing, radius, type, elevation } as const;
}
