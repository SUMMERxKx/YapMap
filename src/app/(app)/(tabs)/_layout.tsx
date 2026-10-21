import Ionicons from '@expo/vector-icons/Ionicons';
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
  return <Ionicons name={name} size={size} color={color} />;
}

// Go live (the button), Nearby (the list), Map (events) and Profile.
export default function TabsLayout() {
  const { colors, size, type } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: type.label.fontSize, fontWeight: type.label.fontWeight },
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
