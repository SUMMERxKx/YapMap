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
      {RINGS.map((scale) => {
        const ringSize = size * scale;
        return (
          <View
            key={scale}
            style={{
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              backgroundColor: color,
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

export function GlassBackdrop({ tint = 'green' }: Props) {
  const { scheme, colors } = useTheme();
  let accent = colors.green;
  if (tint === 'live') {
    accent = colors.destructive;
  }

  // Amber, the café counterpart to the green.
  let warm = '#F59E0B';
  // Per-ring opacity; five rings overlap, so the centre ends up around four times this.
  let strength = 0.04;
  if (scheme === 'dark') {
    warm = '#B45309';
    strength = 0.035;
  }

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
