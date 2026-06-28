import { useCallback, useEffect, useState } from 'react';

import {
  dbAddGeofence,
  dbDeleteGeofence,
  dbGetGeofences,
  dbUpdateGeofence,
  type GeofenceRow,
} from '@/lib/db';
import { STATION_COORDS } from '@/constants/stops';
import type { Station } from '@/lib/api';

export type { GeofenceRow };

// ── Module-level store (shared with locationTask — no React required) ─────────

type Listener = (fences: GeofenceRow[]) => void;
const _listeners = new Set<Listener>();
let _fences: GeofenceRow[] = dbGetGeofences();

function notify() {
  _listeners.forEach((fn) => fn([..._fences]));
}

function reload() {
  _fences = dbGetGeofences();
  notify();
}

export function getGeofences(): GeofenceRow[] {
  return _fences;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGeofences() {
  const [geofences, setGeofences] = useState<GeofenceRow[]>(_fences);

  useEffect(() => {
    const listener: Listener = (next) => setGeofences(next);
    _listeners.add(listener);
    setGeofences([..._fences]);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const add = useCallback((fence: Omit<GeofenceRow, 'id' | 'created_at'>): string => {
    const id = dbAddGeofence(fence);
    reload();
    return id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Omit<GeofenceRow, 'id' | 'created_at'>>) => {
      dbUpdateGeofence(id, patch);
      reload();
    },
    [],
  );

  const remove = useCallback((id: string) => {
    dbDeleteGeofence(id);
    reload();
  }, []);

  const toggle = useCallback((id: string) => {
    const fence = _fences.find((f) => f.id === id);
    if (!fence) return;
    dbUpdateGeofence(id, { enabled: !fence.enabled });
    reload();
  }, []);

  const seedFromStations = useCallback((stations: Station[]): number => {
    const nameById = new Map(stations.map((s) => [s.id, s.name]));
    const existingEventNames = new Set(_fences.map((f) => f.event_name));
    let added = 0;
    for (const [id, coords] of Object.entries(STATION_COORDS)) {
      const eventName = `arrive_${id.toLowerCase()}`;
      if (existingEventNames.has(eventName)) continue;
      const name = nameById.get(id) ?? id;
      dbAddGeofence({
        name,
        event_name: eventName,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius_metres: coords.radiusMetres,
        enabled: true,
      });
      added++;
    }
    if (added > 0) reload();
    return added;
  }, []);

  return { geofences, add, update, remove, toggle, seedFromStations };
}
