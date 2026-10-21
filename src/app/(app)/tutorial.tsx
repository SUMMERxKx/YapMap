import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
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
    key: 'map',
    icon: 'map',
    title: 'Make plans on the map',
    body: 'Drop an event on the map, like a coffee or a study break. Anyone can join and chat as a group.',
  },
  {
    key: 'control',
    icon: 'shield-checkmark',
    title: 'You’re in control',
    body: 'Tap the red button to get off any time. Block or report anyone in two taps.',
  },
];

export default function Tutorial() {
  const { colors, layout, spacing } = useTheme();
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

  const next = () => {
    if (last) {
      done();
      return;
    }
    list.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  // No Skip on the last page; an empty View keeps the top row's height.
  let skipButton = <View />;
  if (!last) {
    skipButton = <Button label="Skip" variant="ghost" size="compact" onPress={done} />;
  }

  let nextLabel = 'Next';
  if (last) {
    nextLabel = 'Let’s yap';
  }

  const renderPage = ({ item }: { item: Page }) => {
    // Pages with an icon show it on a soft circle; the first page shows the YAP button itself.
    let art;
    if (item.icon) {
      art = (
        <View style={[styles.art, { backgroundColor: colors.greenSoft }]}>
          <Ionicons name={item.icon} size={84} color={colors.greenText} />
        </View>
      );
    } else {
      art = (
        <View style={[styles.art, { backgroundColor: colors.green }]}>
          <AppText style={[styles.yap, { color: colors.onGreen }]} maxFontSizeMultiplier={1.2}>
            YAP
          </AppText>
        </View>
      );
    }
    return (
      <View style={[styles.page, { width, paddingHorizontal: spacing.xxxl, gap: spacing.md }]}>
        {art}
        <AppText variant="title" align="center" accessibilityRole="header">
          {item.title}
        </AppText>
        <AppText color="textSecondary" align="center" style={{ maxWidth: layout.maxTextWidth }}>
          {item.body}
        </AppText>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { minHeight: layout.topBarHeight, paddingHorizontal: spacing.md }]}>
        {skipButton}
      </View>

      <FlatList
        ref={list}
        data={PAGES}
        keyExtractor={(page) => page.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={renderPage}
      />

      <View style={{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.xl }}>
        <View style={[styles.dots, { gap: spacing.sm }]} accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`} accessible>
          {PAGES.map((page, pageIndex) => {
            // The current page's dot is wider and green.
            let dotColor = colors.border;
            let dotWidth = 8;
            if (pageIndex === index) {
              dotColor = colors.green;
              dotWidth = 22;
            }
            return <View key={page.key} style={[styles.dot, { backgroundColor: dotColor, width: dotWidth }]} />;
          })}
        </View>
        <Button label={nextLabel} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { alignItems: 'flex-end', justifyContent: 'center' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  art: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  yap: { fontSize: 56, lineHeight: 64, fontWeight: '900', letterSpacing: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
