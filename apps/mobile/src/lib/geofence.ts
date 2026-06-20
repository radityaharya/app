import type { GeofenceRow } from '@/lib/db';

export function getDistanceMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface InsideGeofence {
  fence: GeofenceRow;
  distanceMetres: number;
}

export function getInsideGeofences(
  coords: { latitude: number; longitude: number },
  geofences: GeofenceRow[],
): InsideGeofence[] {
  return geofences
    .filter((f) => f.enabled)
    .map((fence) => ({
      fence,
      distanceMetres: getDistanceMetres(
        coords.latitude,
        coords.longitude,
        fence.latitude,
        fence.longitude,
      ),
    }))
    .filter(({ fence, distanceMetres }) => distanceMetres <= fence.radius_metres)
    .sort((a, b) => a.distanceMetres - b.distanceMetres);
}

export function getNearestGeofence(
  coords: { latitude: number; longitude: number },
  geofences: GeofenceRow[],
): InsideGeofence | null {
  const enabled = geofences.filter((f) => f.enabled);
  if (enabled.length === 0) return null;

  let nearest: InsideGeofence | null = null;
  for (const fence of enabled) {
    const distanceMetres = getDistanceMetres(
      coords.latitude,
      coords.longitude,
      fence.latitude,
      fence.longitude,
    );
    if (!nearest || distanceMetres < nearest.distanceMetres) {
      nearest = { fence, distanceMetres };
    }
  }
  return nearest;
}
