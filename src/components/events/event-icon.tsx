// An event's category icon in a green rounded square. The same badge is used in the
// create-event picker, on map pins, on the event screen and in the group chat header.

import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { eventCategory } from '@/lib/event-category';
import { useTheme } from '@/theme';

type Props = {
  value: string; // the event's stored category value
  size: number; // width and height of the badge
  // solid: green badge, the default. soft: pale green, for unselected picker options.
  // inverse: light badge, for when it sits on something already green (a joined event's pin).
  tone?: 'solid' | 'soft' | 'inverse';
};

export function EventIcon({ value, size, tone = 'solid' }: Props) {
  const { colors } = useTheme();
  const category = eventCategory(value);

  let backgroundColor = colors.green;
  let iconColor = colors.onGreen;
  if (tone === 'soft') {
    backgroundColor = colors.greenSoft;
    iconColor = colors.greenText;
  } else if (tone === 'inverse') {
    backgroundColor = colors.onGreen;
    iconColor = colors.green;
  }

  // The icon fills a little over half the badge; the corners stay in proportion at every size.
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={category.icon} size={Math.round(size * 0.56)} color={iconColor} />
    </View>
  );
}
