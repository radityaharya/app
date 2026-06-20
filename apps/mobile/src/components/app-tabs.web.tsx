/**
 * Web tab bar — uses expo-router's Tabs navigator with a custom tabBar.
 * Lucide icons, monospace labels, brand-aligned.
 */
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { House, LayoutGrid, Settings, type LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from "expo-router/js-tabs";

import { useThemeContext } from '@/context/ThemeContext';
import { MaxContentWidth } from '@/constants/theme';

const MONO = 'monospace';

const TAB_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: House, label: 'home' },
  tools: { icon: LayoutGrid, label: 'tools' },
  settings: { icon: Settings, label: 'settings' },
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors: C } = useThemeContext();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: C.background,
        borderTopWidth: 1,
        borderTopColor: C.hairline,
        paddingBottom: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          maxWidth: MaxContentWidth,
          width: '100%',
          justifyContent: 'center',
          gap: 32,
        }}
      >
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const isFocused = state.index === index;
          const color = isFocused ? C.text : C.textSecondary;
          const Icon = config.icon;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => ({
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                paddingHorizontal: 24,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon size={18} color={color} strokeWidth={isFocused ? 2 : 1.5} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: MONO,
                  fontWeight: isFocused ? '600' : '400',
                  color,
                  marginTop: 3,
                  letterSpacing: 0.3,
                }}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tools" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
