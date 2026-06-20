import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useGeofenceStatus } from '@/hooks/useGeofenceStatus';
import { triggerGeofenceEvent, triggerManualPing } from '@/lib/geofenceTrigger';

interface GeofenceStatusPanelProps {
  C: ThemeColors;
  compact?: boolean;
}

export function GeofenceStatusPanel({ C, compact }: GeofenceStatusPanelProps) {
  const { coords, inside, nearest, refreshLocation } = useGeofenceStatus();
  const [triggering, setTriggering] = useState(false);

  async function handleManualTrigger() {
    setTriggering(true);
    try {
      let current = coords;
      if (!current) {
        await refreshLocation();
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('location', 'enable location to trigger.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        current = loc.coords;
      }

      const { latitude, longitude } = current;

      if (inside.length > 0) {
        await Promise.all(
          inside.map(({ fence }) =>
            triggerGeofenceEvent(fence, latitude, longitude, { skipCooldown: true }),
          ),
        );
        Alert.alert(
          'triggered',
          `${inside.length} geofence${inside.length !== 1 ? 's' : ''} fired.`,
        );
        return;
      }

      await triggerManualPing(latitude, longitude);
      Alert.alert('sent', 'location ping sent to server.');
    } catch (err) {
      Alert.alert('failed', err instanceof Error ? err.message : 'trigger failed');
    } finally {
      setTriggering(false);
    }
  }

  const lat = coords?.latitude.toFixed(5);
  const lon = coords?.longitude.toFixed(5);

  return (
    <View style={{ gap: 10 }}>
      {coords && (
        <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary, fontVariant: ['tabular-nums'] }}>
          you: {lat}, {lon}
        </Text>
      )}

      {inside.length > 0 ? (
        inside.map(({ fence, distanceMetres }) => (
          <Text key={fence.id} style={{ fontSize: 12, fontFamily: MONO, color: C.accent }}>
            [+] inside {fence.name} · {Math.round(distanceMetres)}m
          </Text>
        ))
      ) : (
        <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary, textAlign: compact ? 'center' : 'left' }}>
          [-] not inside any geofence
          {nearest ? ` · nearest ${nearest.fence.name} (${Math.round(nearest.distanceMetres)}m)` : ''}
        </Text>
      )}

      <Pressable
        onPress={handleManualTrigger}
        disabled={triggering}
        style={({ pressed }) => ({
          borderWidth: 1,
          borderColor: C.hairline,
          paddingVertical: 10,
          alignItems: 'center',
          opacity: pressed || triggering ? 0.6 : 1,
        })}
      >
        {triggering ? (
          <ActivityIndicator size="small" color={C.textSecondary} />
        ) : (
          <Text style={{ fontSize: 12, fontWeight: '600', fontFamily: MONO, color: C.text }}>
            {inside.length > 0 ? 'trigger now' : 'send location ping'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
