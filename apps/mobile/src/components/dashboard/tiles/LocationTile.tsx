import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { TileHero, TileLine } from './TileLines';
import { type ThemeColors } from '@/components/tokens';
import { useLocation } from '@/hooks/useLocation';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';

interface LocationTileProps {
  C: ThemeColors;
}

function permissionLabel(
  status: ReturnType<typeof useLocation>['permissionStatus'],
): string {
  switch (status) {
    case 'granted-always':
      return 'always';
    case 'granted-foreground':
      return 'while open';
    case 'denied':
      return 'denied';
    default:
      return 'not set';
  }
}

export function LocationTile({ C }: LocationTileProps) {
  const { coords, permissionStatus, isTracking } = useLocation();
  const place = useReverseGeocode(coords);

  const lat = coords ? coords.latitude.toFixed(4) : null;
  const lng = coords ? coords.longitude.toFixed(4) : null;
  const accuracy = coords?.accuracy != null ? `${Math.round(coords.accuracy)} m` : '—';

  return (
    <Pressable
      onPress={() => router.push('/geofences')}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <TileHero
        value={place ?? (coords ? `${lat}, ${lng}` : 'no fix')}
        subtitle={isTracking ? 'background tracking on' : 'tracking off'}
        C={C}
      />
      {coords ? (
        <>
          <TileLine label="coords" value={`${lat}, ${lng}`} C={C} />
          <TileLine label="accuracy" value={accuracy} C={C} />
        </>
      ) : null}
      <TileLine label="permission" value={permissionLabel(permissionStatus)} C={C} />
      <TileLine label="geofences" value="tap to manage ›" C={C} />
    </Pressable>
  );
}
