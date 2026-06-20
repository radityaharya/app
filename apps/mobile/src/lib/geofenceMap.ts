import type { ThemeColors } from '@/components/tokens';
import type { GeofenceRow } from '@/lib/db';

export interface MapPolygon {
  id: string;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
  lineColor: string;
  lineWidth: number;
}

interface DraftZone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
}

function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): { latitude: number; longitude: number } {
  const R = 6_371_000;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
      Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { latitude: (lat2 * 180) / Math.PI, longitude: (lng2 * 180) / Math.PI };
}

export function circlePolygon(
  lat: number,
  lng: number,
  radiusMeters: number,
  segments = 72,
): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  for (let i = 0; i < segments; i++) {
    points.push(destinationPoint(lat, lng, (i / segments) * 360, radiusMeters));
  }
  return points;
}

function zoneStyle(
  fence: GeofenceRow,
  isInside: boolean,
  isDraft: boolean,
  C: ThemeColors,
): Pick<MapPolygon, 'color' | 'lineColor' | 'lineWidth'> {
  if (isDraft) {
    return {
      color: 'rgba(0,122,255,0.22)',
      lineColor: C.accent,
      lineWidth: 3,
    };
  }
  if (!fence.enabled) {
    return {
      color: 'rgba(100,98,98,0.05)',
      lineColor: 'rgba(100,98,98,0.28)',
      lineWidth: 1.5,
    };
  }
  if (isInside) {
    return {
      color: C.statusActiveSubtle,
      lineColor: C.statusActive,
      lineWidth: 3,
    };
  }
  return {
    color: C.accentSubtle,
    lineColor: C.accent,
    lineWidth: 2.5,
  };
}

export function buildMapPolygons(
  geofences: GeofenceRow[],
  insideIds: Set<string>,
  draft: DraftZone | null,
  C: ThemeColors,
): MapPolygon[] {
  const polygons: MapPolygon[] = [];

  for (const fence of geofences) {
    if (draft?.id === fence.id) continue;
    const style = zoneStyle(fence, insideIds.has(fence.id), false, C);
    polygons.push({
      id: fence.id,
      coordinates: circlePolygon(fence.latitude, fence.longitude, fence.radius_metres),
      ...style,
    });
  }

  if (draft) {
    const style = zoneStyle(
      { enabled: true } as GeofenceRow,
      false,
      true,
      C,
    );
    polygons.push({
      id: draft.id,
      coordinates: circlePolygon(draft.latitude, draft.longitude, draft.radius),
      ...style,
    });
  }

  return polygons;
}
