import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { PHOTO_RANGE } from '@/data/constants';
import { photoProblem } from '@/lib/picked-photo';
import { useTheme } from '@/theme';

type Props = { photos: string[]; onChange: (photos: string[]) => void };

const COLUMNS = 3;

/** Grid of photo slots, three to a row: the first few are required, the rest optional. */
export function PhotoGrid({ photos, onChange }: Props) {
  const { colors, radius, size, spacing } = useTheme();

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
    // Photos that can't be used are left out, and the first reason is shown.
    const pickedUris: string[] = [];
    let firstProblem: string | null = null;
    for (const asset of result.assets) {
      const problem = photoProblem(asset);
      if (problem) {
        firstProblem ??= problem;
      } else {
        pickedUris.push(asset.uri);
      }
    }
    if (firstProblem) Alert.alert("Some photos couldn't be added", firstProblem);
    const allPhotos = [...photos, ...pickedUris];
    onChange(allPhotos.slice(0, PHOTO_RANGE.max));
  };

  const replace = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const picked = result.assets[0];
    if (!picked) return;
    const problem = photoProblem(picked);
    if (problem) {
      Alert.alert("Can't use that photo", problem);
      return;
    }
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
          <View style={[styles.badge, { top: spacing.sm, right: spacing.sm, backgroundColor: colors.surface }]}>
            <Ionicons name="ellipsis-horizontal" size={size.iconSmall} color={colors.textPrimary} />
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
        <Ionicons name="add" size={size.iconLarge} color={colors.textSecondary} />
      </Pressable>
    );
  };

  // Rows of equal-width slots, so the grid stays three across on every screen width.
  const rows: number[][] = [];
  for (let start = 0; start < PHOTO_RANGE.max; start += COLUMNS) {
    const row: number[] = [];
    for (let index = start; index < start + COLUMNS && index < PHOTO_RANGE.max; index += 1) {
      row.push(index);
    }
    rows.push(row);
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {rows.map((row) => (
        <View key={row[0]} style={[styles.row, { gap: spacing.sm }]}>
          {row.map((index) => renderSlot(index))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  slot: {
    flex: 1,
    aspectRatio: 3 / 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
