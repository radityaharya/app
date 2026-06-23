import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "expo-router";
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { ThemeProvider, useThemeContext } from '@/context/ThemeContext';
import { UpdateProvider } from '@/context/UpdateContext';

if (Platform.OS !== 'web') {
  require('@/tasks/locationTask');
}

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.backgroundSelected,
    primary: Colors.light.accent,
    notification: Colors.light.accent,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundSelected,
    primary: Colors.dark.accent,
    notification: Colors.dark.accent,
  },
};

function useNotificationObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    function redirect(notification: { request: { content: { data?: Record<string, unknown> } } }) {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    }

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) redirect(response.notification);

    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      redirect(r.notification),
    );

    return () => sub.remove();
  }, []);
}

function AppShell() {
  const { scheme } = useThemeContext();
  useNotificationObserver();

  return (
    <NavThemeProvider value={scheme === 'dark' ? DarkNavTheme : LightNavTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="trains"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="stations"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="shortcuts"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="browser"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="geofences"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="integrations"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="hermes"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="qr-scan"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UpdateProvider autoCheckOnLaunch>
        <KeyboardProvider>
          <AppShell />
        </KeyboardProvider>
      </UpdateProvider>
    </ThemeProvider>
  );
}
