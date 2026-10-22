// Checks a photo straight from the picker before it is used, so a video, a broken file or a
// huge panorama is turned away with a clear message instead of failing (or running the phone
// out of memory) while the profile saves. Saving re-encodes every photo as a small JPEG.

import type { ImagePickerAsset } from 'expo-image-picker';

// Bigger than any phone camera's photo, but not a 100-megapixel panorama that takes hundreds
// of megabytes of memory to open.
const MAX_PIXELS = 50_000_000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Why this picked file can't be used, or null when it's fine. */
export function photoProblem(asset: ImagePickerAsset): string | null {
  // A Live Photo is a photo too; only its still image is used.
  if (asset.type === 'video' || asset.type === 'pairedVideo') {
    return 'Choose a photo, not a video.';
  }
  if (asset.width > 0 && asset.height > 0 && asset.width * asset.height > MAX_PIXELS) {
    return 'That photo is too big to use. Choose a smaller one, or a screenshot of it.';
  }
  if (asset.fileSize !== undefined && asset.fileSize > MAX_FILE_BYTES) {
    return 'That file is too big to use. Choose a photo under 50 MB.';
  }
  return null;
}
