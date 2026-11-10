import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type TabIconProps = {
  focused: boolean;
  color: ColorValue;
  size: number;
  filled: IconName; // shown on the selected tab
  outline: IconName; // shown on the other tabs
};

function TabIcon({ focused, color, size, filled, outline }: TabIconProps) {
  let name = outline;
  if (focused) {
    name = filled;
  }
  // The tab bar passes our tint colours from the theme, which are always strings.
  return <Ionicons name={name} size={size} color={color as string} />;
}

// Go live (the button), Nearby (the list), Map (events) and Profile.
export default function TabsLayout() {
  const { colors, size, type } = useTheme();
  return (
    <Tabs
      // A light tick under the finger on every tab change.
      screenListeners={{ tabPress: () => Haptics.selectionAsync() }}
      screenOptions={{
        headerShown: false,
        // Screens slide a little and cross-fade when switching tabs.
        animation: 'shift',
        tabBarActiveTintColor: colors.greenText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: type.label.fontSize, fontWeight: '600', letterSpacing: 0.1 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Go live',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} size={size.iconLarge} filled="radio" outline="radio-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} size={size.iconLarge} filled="people" outline="people-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} size={size.iconLarge} filled="map" outline="map-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} size={size.iconLarge} filled="person-circle" outline="person-circle-outline" />
          ),
        }}
      />
    </Tabs>
  );
}
