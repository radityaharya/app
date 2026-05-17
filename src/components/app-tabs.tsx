import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { useThemeContext } from '@/context/ThemeContext';

export default function AppTabs() {
  const { colors: C } = useThemeContext();

  return (
    <NativeTabs
      backgroundColor={C.background}
      iconColor={C.textSecondary}
      labelStyle={{
        default: { color: C.textSecondary, fontSize: 10 },
        selected: { color: C.text, fontWeight: '600', fontSize: 10 },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
          selectedColor={C.text}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="schedule">
        <NativeTabs.Trigger.Label>Schedule</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
          selectedColor={C.text}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
          selectedColor={C.text}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
