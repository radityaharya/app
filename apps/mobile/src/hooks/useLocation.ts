import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { LOCATION_TASK_NAME } from '@/tasks/locationTask';

export type LocationPermissionStatus = 'undetermined' | 'granted-foreground' | 'granted-always' | 'denied';

export function useLocation() {
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
    checkTracking();
    fetchCurrentLocation();
  }, []);

  async function checkPermissions() {
    const { status: fg } = await Location.getForegroundPermissionsAsync();
    const { status: bg } = await Location.getBackgroundPermissionsAsync();

    if (bg === 'granted') {
      setPermissionStatus('granted-always');
    } else if (fg === 'granted') {
      setPermissionStatus('granted-foreground');
    } else if (fg === 'denied' || bg === 'denied') {
      setPermissionStatus('denied');
    } else {
      setPermissionStatus('undetermined');
    }
  }

  async function checkTracking() {
    const tracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    setIsTracking(tracking);
  }

  async function fetchCurrentLocation() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentLocation(loc);
    } catch {
      // non-critical
    }
  }

  async function requestPermissions(): Promise<boolean> {
    setError(null);
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      setError('Foreground location permission denied.');
      setPermissionStatus('denied');
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      setError('Background location permission denied. Stop detection will only work while the app is open.');
      setPermissionStatus('granted-foreground');
      return false;
    }

    setPermissionStatus('granted-always');
    return true;
  }

  async function startTracking(): Promise<void> {
    if (isTracking) return;
    setError(null);

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30_000,       // update every 30 seconds
        distanceInterval: 50,        // or every 50 metres
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Commuter is tracking your route',
          notificationBody: "We'll notify you when you're near your stop.",
          notificationColor: '#208AEF',
        },
      });
      setIsTracking(true);

      // Also get current location for display
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentLocation(loc);
    } catch (err) {
      setError(`Failed to start location tracking: ${String(err)}`);
    }
  }

  async function stopTracking(): Promise<void> {
    if (!isTracking) return;
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setIsTracking(false);
    } catch (err) {
      setError(`Failed to stop location tracking: ${String(err)}`);
    }
  }

  return {
    permissionStatus,
    isTracking,
    currentLocation,
    coords: currentLocation?.coords ?? null,
    error,
    requestPermissions,
    startTracking,
      stopTracking,
      refreshLocation: fetchCurrentLocation,
  };
}
