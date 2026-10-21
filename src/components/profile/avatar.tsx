import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { photoSource } from '@/lib/photo-source';
import { useTheme } from '@/theme';

import { AppText } from '@/components/ui/app-text';

type Props = {
  name: string;
  photoUri: string | null;
  thumbUri?: string | null; // a small copy of the photo, used when the avatar is small
  size?: number;
  ring?: boolean;
};

// At or below this size (in points) the small copy is sharp enough, even on 3x screens.
const THUMB_MAX_SIZE = 64;

// Warm, readable initials backgrounds (dark text on light tints, 4.5:1 or better).
const TINTS = ['#FDE68A', '#BBF7D0', '#FECACA', '#BFDBFE', '#DDD6FE', '#FED7AA'];

export function Avatar({ name, photoUri, thumbUri, size = 56, ring }: Props) {
  const { colors } = useTheme();
  // Pick a tint from the first letter, so the same name always gets the same colour.
  let firstLetterCode = name.charCodeAt(0);
  if (Number.isNaN(firstLetterCode)) {
    firstLetterCode = 0; // empty name
  }
  const tint = TINTS[firstLetterCode % TINTS.length];
  const radius = size * 0.28;

  let photo = photoUri;
  if (thumbUri && size <= THUMB_MAX_SIZE) {
    photo = thumbUri;
  }

  let content;
  if (photo) {
    content = <Image source={photoSource(photo)} style={StyleSheet.absoluteFill} contentFit="cover" />;
  } else {
    content = (
      <AppText style={{ fontSize: size * 0.4, lineHeight: size * 0.5, fontWeight: '700', color: '#1C1917' }}>
        {name.slice(0, 1).toUpperCase()}
      </AppText>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Photo of ${name}`}
      style={[
        styles.box,
        { width: size, height: size, borderRadius: radius, backgroundColor: tint },
        ring && { borderWidth: 3, borderColor: colors.green },
      ]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
