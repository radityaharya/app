import * as Notifications from 'expo-notifications';

import { api } from '@/lib/api';

const _lastTriggered: Record<string, number> = {};
export const GEOFENCE_COOLDOWN_MS = 3 * 60 * 1000;

export interface GeofenceTriggerTarget {
  id: string;
  name: string;
  event_name: string;
}

export async function triggerGeofenceEvent(
  target: GeofenceTriggerTarget,
  latitude: number,
  longitude: number,
  options?: { skipCooldown?: boolean; notify?: boolean },
): Promise<void> {
  const now = Date.now();
  const skipCooldown = options?.skipCooldown ?? false;
  const notify = options?.notify ?? true;

  if (!skipCooldown) {
    const lastFired = _lastTriggered[target.id] ?? 0;
    if (now - lastFired < GEOFENCE_COOLDOWN_MS) return;
  }
  _lastTriggered[target.id] = now;

  if (notify) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: target.name,
        body: `event "${target.event_name}" triggered`,
        data: { geofenceId: target.id, eventName: target.event_name },
        sound: true,
      },
      trigger: null,
    });
  }

  await api.geofence.trigger({
    event_name: target.event_name,
    geofence_id: target.id,
    latitude,
    longitude,
    triggered_at: new Date(now).toISOString(),
  });
}

export async function triggerManualPing(latitude: number, longitude: number): Promise<void> {
  const now = Date.now();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'manual trigger',
      body: `location sent · ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      data: { eventName: 'manual_ping' },
      sound: true,
    },
    trigger: null,
  });

  await api.geofence.trigger({
    event_name: 'manual_ping',
    geofence_id: 'manual',
    latitude,
    longitude,
    triggered_at: new Date(now).toISOString(),
  });
}
