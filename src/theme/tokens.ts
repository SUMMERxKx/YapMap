// YapMap design tokens.
// Based on the Stitch board ("YapMap Mobile UI Design System"), with contrast fixes:
// every text/background pair below meets WCAG AA (4.5:1 for text, 3:1 for UI parts).

export const palette = {
  light: {
    background: '#FAF8F5', // warm oat
    surface: '#FFFFFF',
    surfaceMuted: '#F3EFEA',
    border: '#E7E2DA', // decorative dividers only
    inputBorder: '#8A847E', // 3.7:1 on white, visible input outlines
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    green: '#15803D', // button fill: white text 5.0:1 (the board's #16A34A was 3.3:1)
    greenPressed: '#166534',
    onGreen: '#FFFFFF',
    greenSoft: '#DCFCE7', // soft badges and the available card background
    greenText: '#166534', // green text on light surfaces
    destructive: '#B91C1C',
    destructivePressed: '#991B1B',
    onDestructive: '#FFFFFF',
    destructiveSoft: '#FEE2E2',
    warningText: '#92400E', // the board's #D97706 text was 3.2:1
    warningSoft: '#FEF3C7',
    scrim: 'rgba(28, 25, 23, 0.45)',
  },
  dark: {
    background: '#181715', // deep espresso
    surface: '#24221F',
    surfaceMuted: '#2E2B27',
    border: '#383531',
    inputBorder: '#8A847E',
    textPrimary: '#FAF8F5',
    textSecondary: '#B5AFA8',
    green: '#22C55E',
    greenPressed: '#16A34A',
    onGreen: '#052E16', // dark text on bright green, 6.5:1
    greenSoft: '#14532D',
    greenText: '#86EFAC',
    destructive: '#DC2626',
    destructivePressed: '#B91C1C',
    onDestructive: '#FFFFFF',
    destructiveSoft: '#3B1414',
    warningText: '#FCD34D',
    warningSoft: '#422006',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ColorName = keyof typeof palette.light;
export type Colors = Record<ColorName, string>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12, // inputs, chips
  lg: 16, // cards
  xl: 24, // sheets
  pill: 9999,
} as const;

// System fonts (SF Pro on iOS, Roboto on Android) so Dynamic Type and font scaling just work.
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6 },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
} as const;

export type TypeVariant = keyof typeof type;

export const touch = { min: 48 } as const; // covers 44pt (iOS) and 48dp (Android)

export const elevation = {
  card: {
    shadowColor: '#1C1917',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#1C1917',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
