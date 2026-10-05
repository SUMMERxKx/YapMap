import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { markTutorialSeen } from '@/state/store';
import { useTheme } from '@/theme';

type Page = {
  key: string;
  title: string;
  body: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

const PAGES: Page[] = [
  {
    key: 'yap',
    title: 'Tap YAP to go live',
    body: 'Choose how long, add a note if you like. Your button turns red while you’re live.',
  },
  {
    key: 'nearby',
    icon: 'people',
    title: 'See who’s around',
    body: 'People near you who are live can see you, and you can see them. Nobody sees exactly where you are.',
  },
  {
    key: 'chat',
    icon: 'chatbubbles',
    title: 'Say hi, then meet',
    body: 'Say hi to one person at a time. If they accept, you chat, then go and talk in person.',
  },
  {
    key: 'control',
    icon: 'shield-checkmark',
    title: 'You’re in control',
    body: 'Tap the red button to get off any time. Block or report anyone in two taps.',
  },
];

export default function Tutorial() {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(0);
  const last = index === PAGES.length - 1;

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken<Page>[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }, []);

  const done = () => {
    markTutorialSeen();
    router.back();
  };

  const next = () => (last ? done() : list.current?.scrollToIndex({ index: index + 1, animated: true }));

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { paddingHorizontal: spacing.xxl }]}>
        {last ? <View /> : <Button label="Skip" variant="ghost" onPress={done} style={{ minHeight: 44 }} />}
      </View>

      <FlatList
        ref={list}
        data={PAGES}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.page, { width, paddingHorizontal: spacing.xxxl, gap: spacing.lg }]}>
            {item.icon ? (
              <View style={[styles.art, { backgroundColor: colors.greenSoft }]}>
                <Ionicons name={item.icon} size={84} color={colors.greenText} />
              </View>
            ) : (
              <View style={[styles.art, { backgroundColor: colors.green }]}>
                <AppText style={[styles.yap, { color: colors.onGreen }]} maxFontSizeMultiplier={1.2}>
                  YAP
                </AppText>
              </View>
            )}
            <AppText variant="title" align="center" accessibilityRole="header">
              {item.title}
            </AppText>
            <AppText color="textSecondary" align="center">
              {item.body}
            </AppText>
          </View>
        )}
      />

      <View style={[styles.bottom, { padding: spacing.xxl, gap: spacing.lg }]}>
        <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`} accessible>
          {PAGES.map((p, i) => (
            <View
              key={p.key}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.green : colors.border, width: i === index ? 22 : 8 },
              ]}
            />
          ))}
        </View>
        <Button label={last ? 'Let’s yap' : 'Next'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { minHeight: 52, alignItems: 'flex-end', justifyContent: 'center' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  art: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  yap: { fontSize: 56, lineHeight: 64, fontWeight: '900', letterSpacing: 2 },
  bottom: {},
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
