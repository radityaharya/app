import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useGeofences } from '@/hooks/useGeofences';
import { useLocation } from '@/hooks/useLocation';
import { getInsideGeofences, getNearestGeofence } from '@/lib/geofence';

export function useGeofenceStatus() {
  const location = useLocation();
  const { geofences } = useGeofences();

  useFocusEffect(
    useCallback(() => {
      void location.refreshLocation();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const enabledGeofences = useMemo(
    () => geofences.filter((g) => g.enabled),
    [geofences],
  );

  const inside = useMemo(() => {
    if (!location.coords) return [];
    return getInsideGeofences(location.coords, geofences);
  }, [location.coords, geofences]);

  const nearest = useMemo(() => {
    if (!location.coords) return null;
    return getNearestGeofence(location.coords, geofences);
  }, [location.coords, geofences]);

  return {
    coords: location.coords,
    isTracking: location.isTracking,
    enabledCount: enabledGeofences.length,
    inside,
    nearest,
    refreshLocation: location.refreshLocation,
  };
}
