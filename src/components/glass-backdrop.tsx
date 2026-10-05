import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

// Decorative "glass" backdrop: large soft colour glows behind a screen's content.
// Pure views (no images, no blur library): each glow is a stack of concentric circles
// whose opacities add up towards the centre, which reads as a soft frosted gradient.
// Purely cosmetic, so it never takes touches and is hidden from screen readers.

type Props = {
  /** Which colour family the glows lean on. `live` is the red used while you're live. */
  tint?: 'green' | 'live';
};

const RINGS = [1, 0.82, 0.64, 0.46, 0.3];

function Glow({ color, size, opacity, style }: { color: string; size: number; opacity: number; style: ViewStyle }) {
  return (
    <View style={[styles.glow, style, { width: size, height: size }]}>
      {RINGS.map((scale) => (
        <View
          key={scale}
          style={{
            position: 'absolute',
            width: size * scale,
            height: size * scale,
            borderRadius: (size * scale) / 2,
            backgroundColor: color,
            opacity,
          }}
        />
      ))}
    </View>
  );
}

export function GlassBackdrop({ tint = 'green' }: Props) {
  const { scheme, colors } = useTheme();
  const accent = tint === 'live' ? colors.destructive : colors.green;
  const warm = scheme === 'dark' ? '#B45309' : '#F59E0B'; // amber, the café counterpart to the green
  // Per-ring opacity; five rings overlap, so the centre ends up around four times this.
  const strength = scheme === 'dark' ? 0.035 : 0.04;

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Glow color={accent} size={420} opacity={strength} style={{ top: -160, left: -130 }} />
      <Glow color={warm} size={300} opacity={strength * 0.8} style={{ top: 120, right: -150 }} />
      <Glow color={accent} size={460} opacity={strength * 0.9} style={{ bottom: -180, right: -110 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
