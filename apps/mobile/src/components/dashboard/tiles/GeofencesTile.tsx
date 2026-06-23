import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { TileHero, TileLine } from './TileLines';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useGeofences } from '@/hooks/useGeofences';

interface GeofencesTileProps {
  C: ThemeColors;
}

export function GeofencesTile({ C }: GeofencesTileProps) {
  const { geofences } = useGeofences();
  const enabled = geofences.filter((g) => g.enabled);
  const preview = enabled.slice(0, 2);

  return (
    <Pressable
      onPress={() => router.push('/geofences')}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <TileHero
        value={`${enabled.length} active`}
        subtitle={`${geofences.length} total geofence${geofences.length === 1 ? '' : 's'}`}
        C={C}
      />
      <TileLine
        label="status"
        value={enabled.length > 0 ? 'monitoring enabled' : 'none active'}
        C={C}
      />
      {preview.length > 0 ? (
        <View style={{ marginTop: 10, gap: 6 }}>
          {preview.map((fence) => (
            <Text
              key={fence.id}
              numberOfLines={1}
              style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}
            >
              · {fence.name.toLowerCase()} ({fence.radius_metres}m)
            </Text>
          ))}
        </View>
      ) : (
        <TileLine label="setup" value="tap to add geofences ›" C={C} />
      )}
    </Pressable>
  );
}
