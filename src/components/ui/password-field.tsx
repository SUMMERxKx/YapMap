// Password input: a TextField that hides what's typed, with an eye button to show it.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { TextField } from '@/components/ui/text-field';

type Props = Omit<ComponentProps<typeof TextField>, 'secureTextEntry' | 'accessory'>;

export function PasswordField(props: Props) {
  const { colors, layout, size } = useTheme();
  const [visible, setVisible] = useState(false);

  let icon: 'eye-outline' | 'eye-off-outline' = 'eye-outline';
  let toggleLabel = 'Show password';
  if (visible) {
    icon = 'eye-off-outline';
    toggleLabel = 'Hide password';
  }

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      accessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toggleLabel}
          onPress={() => setVisible((current) => !current)}
          hitSlop={4}
          style={[styles.toggle, { width: layout.touchTarget, height: layout.touchTarget }]}>
          <Ionicons name={icon} size={size.iconLarge} color={colors.textSecondary} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: { alignItems: 'center', justifyContent: 'center' },
});
