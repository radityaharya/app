import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { NOTIFICATION_COOLDOWN_MS, getMonitoredStations, type MonitoredStation } from '@/hooks/useMonitoredStations';
import { api, type Schedule } from '@/lib/api';

export const LOCATION_TASK_NAME = 'background-location-task';

function getDistanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const lastNotified: Record<string, number> = {};

async function buildNotification(station: MonitoredStation): Promise<{ title: string; body: string }> {
  const title = `Approaching ${station.name}`;
  try {
    const schedules: Schedule[] = await api.schedule.byStation(station.id);
    const now = new Date();
    const next = schedules
      .map((s) => ({ ...s, d: new Date(s.departs_at) }))
      .filter((s) => s.d > now)
      .sort((a, b) => a.d.getTime() - b.d.getTime())[0];
    if (next) {
      const time = next.d.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
      });
      return { title, body: `Next: ${next.line} → ${next.station_destination_id} at ${time}.` };
    }
  } catch {}
  return { title, body: `You are within ${station.coords.radiusMetres}m of ${station.name}. Prepare to alight.` };
}

async function notifyNear(station: MonitoredStation): Promise<void> {
  const now = Date.now();
  if (lastNotified[station.id] && now - lastNotified[station.id] < NOTIFICATION_COOLDOWN_MS) return;
  lastNotified[station.id] = now;
  const { title, body } = await buildNotification(station);
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { stationId: station.id }, sound: true },
    trigger: null,
  });
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) { console.error('[LocationTask]', error.message); return; }
  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const { latitude, longitude } = locations[locations.length - 1].coords;
  const monitored = getMonitoredStations();

  for (const station of monitored) {
    const dist = getDistanceMetres(latitude, longitude, station.coords.latitude, station.coords.longitude);
    if (dist <= station.coords.radiusMetres) {
      await notifyNear(station).catch(console.error);
    }
  }
});
