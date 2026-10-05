import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { PHOTO_RANGE } from '@/data/types';
import { useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = { photos: string[]; onChange: (photos: string[]) => void };

/** Grid of photo slots: the first few are required, the rest optional. */
export function PhotoGrid({ photos, onChange }: Props) {
  const { colors, radius } = useTheme();

  const addPhotos = async () => {
    const remaining = PHOTO_RANGE.max - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, PHOTO_RANGE.max));
    }
  };

  const replace = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      onChange(photos.map((p, i) => (i === index ? result.assets[0]!.uri : p)));
    }
  };

  const edit = (index: number) =>
    Alert.alert('Photo', undefined, [
      { text: 'Replace', onPress: () => replace(index) },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(photos.filter((_, i) => i !== index)) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <View style={styles.grid}>
      {Array.from({ length: PHOTO_RANGE.max }).map((_, i) => {
        const uri = photos[i];
        const required = i < PHOTO_RANGE.min;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={uri ? `Photo ${i + 1}. Replace or remove` : `Add photo ${i + 1}${required ? ', required' : ''}`}
            onPress={() => (uri ? edit(i) : addPhotos())}
            style={[
              styles.slot,
              {
                borderRadius: radius.lg,
                backgroundColor: colors.surfaceMuted,
                borderColor: uri ? 'transparent' : required ? colors.inputBorder : colors.border,
                borderStyle: uri ? 'solid' : 'dashed',
              },
            ]}>
            {uri ? (
              <>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={[styles.badge, { backgroundColor: colors.surface }]}>
                  <Ionicons name="ellipsis-horizontal" size={14} color={colors.textPrimary} />
                </View>
              </>
            ) : (
              <>
                <Ionicons name="add" size={28} color={colors.textSecondary} />
                {required ? (
                  <AppText variant="caption" color="textSecondary">
                    Required
                  </AppText>
                ) : null}
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    width: '31%',
    aspectRatio: 3 / 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
