/**
 * Custom JS-rendered tab bar using Lucide icons.
 * Replaces NativeTabs to align with the monospace brand system.
 */
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, LayoutGrid, Settings } from 'lucide-react-native';

import { useThemeContext } from '@/context/ThemeContext';

const MONO = 'monospace';

function TabButton({
  children,
  isFocused,
  icon: Icon,
  ...props
}: TabTriggerSlotProps & { icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }) {
  const { colors: C } = useThemeContext();
  const color = isFocused ? C.text : C.textSecondary;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon size={20} color={color} strokeWidth={isFocused ? 2 : 1.5} />
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
        {children}
      </Text>
    </Pressable>
  );
}

export default function AppTabs() {
  const { colors: C } = useThemeContext();
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        style={{
          flexDirection: 'row',
          backgroundColor: C.background,
          borderTopWidth: 1,
          borderTopColor: C.hairline,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon={House}>home</TabButton>
        </TabTrigger>
        <TabTrigger name="tools" href="/tools" asChild>
          <TabButton icon={LayoutGrid}>tools</TabButton>
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild>
          <TabButton icon={Settings}>settings</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
