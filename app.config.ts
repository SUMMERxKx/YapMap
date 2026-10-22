// Adds the settings that come from the build environment to app.json, which holds everything else.
//
// The map on Android is Google Maps, and it needs an API key: an Android build without one
// crashes as soon as the Map tab opens. The key is not a secret (it ships inside the app, and
// is restricted to this app's package name and signing certificate in Google Cloud), but it is
// kept out of git and set as an EAS environment variable. See docs/STORE_SUBMISSION.md.
// iOS uses Apple Maps, which needs no key.

import type { ConfigContext, ExpoConfig } from 'expo/config';

const googleMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

// Stop an Android cloud build early instead of shipping one whose map crashes.
if (process.env.EAS_BUILD_PLATFORM === 'android' && !googleMapsKey) {
  throw new Error('GOOGLE_MAPS_ANDROID_API_KEY is not set. Add it with `eas env:create` (see docs/STORE_SUBMISSION.md).');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Yap',
  slug: config.slug ?? 'yap',
  plugins: [...(config.plugins ?? []), ['react-native-maps', { androidGoogleMapsApiKey: googleMapsKey }]],
});
