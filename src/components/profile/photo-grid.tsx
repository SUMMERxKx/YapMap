import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { PHOTO_RANGE } from '@/data/constants';
import { useTheme } from '@/theme';

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
    if (result.canceled) return;
    const pickedUris = result.assets.map((asset) => asset.uri);
    const allPhotos = [...photos, ...pickedUris];
    onChange(allPhotos.slice(0, PHOTO_RANGE.max));
  };

  const replace = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const picked = result.assets[0];
    if (!picked) return;
    const updated = [...photos];
    updated[index] = picked.uri;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(photos.filter((_, photoIndex) => photoIndex !== index));
  };

  const edit = (index: number) =>
    Alert.alert('Photo', undefined, [
      { text: 'Replace', onPress: () => replace(index) },
      { text: 'Remove', style: 'destructive', onPress: () => remove(index) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const renderSlot = (index: number) => {
    const uri = photos[index];
    const required = index < PHOTO_RANGE.min;

    if (uri) {
      return (
        <Pressable
          key={index}
          accessibilityRole="button"
          accessibilityLabel={`Photo ${index + 1}. Replace or remove`}
          onPress={() => edit(index)}
          style={[
            styles.slot,
            {
              borderRadius: radius.lg,
              backgroundColor: colors.surfaceMuted,
              borderColor: 'transparent',
              borderStyle: 'solid',
            },
          ]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[styles.badge, { backgroundColor: colors.surface }]}>
            <Ionicons name="ellipsis-horizontal" size={14} color={colors.textPrimary} />
          </View>
        </Pressable>
      );
    }

    // An empty slot: required slots get a stronger dashed outline.
    let accessibilityLabel = `Add photo ${index + 1}`;
    let borderColor = colors.border;
    if (required) {
      accessibilityLabel = `Add photo ${index + 1}, required`;
      borderColor = colors.inputBorder;
    }

    return (
      <Pressable
        key={index}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => addPhotos()}
        style={[
          styles.slot,
          {
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceMuted,
            borderColor,
            borderStyle: 'dashed',
          },
        ]}>
        <Ionicons name="add" size={28} color={colors.textSecondary} />
      </Pressable>
    );
  };

  const slotIndexes = Array.from({ length: PHOTO_RANGE.max }, (_, index) => index);

  return <View style={styles.grid}>{slotIndexes.map((index) => renderSlot(index))}</View>;
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
