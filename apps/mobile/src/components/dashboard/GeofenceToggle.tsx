import { Pressable, Text, View } from 'react-native';

import { GeofenceStatusPanel } from '@/components/geofences/GeofenceStatusPanel';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useGeofenceStatus } from '@/hooks/useGeofenceStatus';
import { useLocation } from '@/hooks/useLocation';

interface GeofenceToggleProps {
  C: ThemeColors;
}

export function GeofenceToggle({ C }: GeofenceToggleProps) {
  const location = useLocation();
  const { isTracking, enabledCount } = useGeofenceStatus();

  async function handleToggle() {
    if (isTracking) {
      await location.stopTracking();
      return;
    }

    if (location.permissionStatus !== 'granted-always') {
      const granted = await location.requestPermissions();
      if (!granted) return;
    }

    await location.startTracking();
  }

  return (
    <View style={{ gap: 14 }}>
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: isTracking ? C.accent : C.textSecondary,
              }}
            />
            <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text }}>
              {isTracking ? 'tracking active' : 'tracking inactive'}
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 3 }}>
            {enabledCount} geofence{enabledCount !== 1 ? 's' : ''} armed
          </Text>
        </View>
        <View
          style={{
            width: 44,
            height: 24,
            borderRadius: 4,
            backgroundColor: isTracking ? C.text : C.backgroundSelected,
            justifyContent: 'center',
            paddingHorizontal: 2,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 3,
              backgroundColor: isTracking ? C.background : C.text,
              alignSelf: isTracking ? 'flex-end' : 'flex-start',
            }}
          />
        </View>
      </Pressable>

      <View style={{ borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 12 }}>
        <GeofenceStatusPanel C={C} />
      </View>
    </View>
  );
}
