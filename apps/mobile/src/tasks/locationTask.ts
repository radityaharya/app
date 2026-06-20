import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { getGeofences } from '@/hooks/useGeofences';
import { NOTIFICATION_COOLDOWN_MS, getMonitoredStations, type MonitoredStation } from '@/hooks/useMonitoredStations';
import { api, type Schedule } from '@/lib/api';
import { getDistanceMetres } from '@/lib/geofence';
import { triggerGeofenceEvent } from '@/lib/geofenceTrigger';

export const LOCATION_TASK_NAME = 'background-location-task';

// ── KRL station alerts ────────────────────────────────────────────────────────

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

// ── Custom geofences ─────────────────────────────────────────────────────────

const _insideGeofence: Record<string, boolean> = {};

// ── Background task ───────────────────────────────────────────────────────────

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

  const fences = getGeofences().filter((f) => f.enabled);
  for (const fence of fences) {
    const dist = getDistanceMetres(latitude, longitude, fence.latitude, fence.longitude);
    const isNow = dist <= fence.radius_metres;
    const wasBefore = _insideGeofence[fence.id] ?? false;

    if (isNow && !wasBefore) {
      _insideGeofence[fence.id] = true;
      await triggerGeofenceEvent(fence, latitude, longitude).catch(console.error);
    } else if (!isNow && wasBefore) {
      _insideGeofence[fence.id] = false;
    } else {
      _insideGeofence[fence.id] = isNow;
    }
  }
});
