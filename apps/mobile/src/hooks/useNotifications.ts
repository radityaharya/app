import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Set global handler so notifications show as banners when app is foregrounded
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setLastNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Notifications] User tapped notification:', response.notification.request.content);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function registerForPushNotifications(): Promise<void> {
    setError(null);

    // Create default notification channel on Android (required before requesting permissions on Android 13+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#208AEF',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      setError('Notification permission denied.');
      setPermissionGranted(false);
      return;
    }

    setPermissionGranted(true);

    // Get Expo push token (requires EAS projectId configured in app.json)
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (projectId) {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        setExpoPushToken(tokenData.data);
        console.log('[Notifications] Expo push token:', tokenData.data);
      } else {
        console.warn('[Notifications] No EAS projectId found. Push token unavailable until EAS is configured.');
      }
    } catch (err) {
      console.warn('[Notifications] Could not get push token:', err);
    }
  }

  async function scheduleLocalNotification(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: true },
      trigger: null,
    });
  }

  return {
    expoPushToken,
    permissionGranted,
    lastNotification,
    error,
    scheduleLocalNotification,
  };
}
