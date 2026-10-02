import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { signInWithProvider } from '@/state/store';
import { useTheme } from '@/theme';

export default function Welcome() {
  const { colors, radius, spacing } = useTheme();

  return (
    <Screen
      footer={
        <>
          {/* Sign in with Apple is iOS-only (expo-apple-authentication). Swap in its official
              AppleAuthenticationButton when Supabase Auth is connected. */}
          {Platform.OS === 'ios' ? (
            <Button
              label="Continue with Apple"
              icon="logo-apple"
              variant="inverse"
              onPress={() => signInWithProvider('apple')}
            />
          ) : null}
          <Button
            label="Continue with Google"
            icon="logo-google"
            variant="secondary"
            onPress={() => signInWithProvider('google')}
          />
          <Button label="Continue with email" icon="mail-outline" variant="ghost" onPress={() => router.push('/email')} />
          <AppText variant="caption" color="textSecondary" align="center" style={{ marginTop: spacing.sm }}>
            By continuing you agree to the Community Rules and Privacy Policy.
          </AppText>
        </>
      }>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: colors.green, borderRadius: radius.xl }]}>
          <Ionicons name="chatbubbles" size={44} color={colors.onGreen} />
        </View>
        <AppText variant="display" accessibilityRole="header">
          YapMap
        </AppText>
        <AppText variant="body" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
          Turn green to have a spontaneous conversation with someone right here in the room.
        </AppText>
        <View style={[styles.chip, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
          <Ionicons name="cafe-outline" size={16} color={colors.greenText} />
          <AppText variant="caption" color="textSecondary">
            For cafés, lounges and common spaces
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logo: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
});
