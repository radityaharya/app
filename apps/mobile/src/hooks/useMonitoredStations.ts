import { useCallback, useEffect, useState } from 'react';

import {
  COORDINATED_STATION_IDS,
  DEFAULT_MONITORED_IDS,
  NOTIFICATION_COOLDOWN_MS,
  STATION_COORDS,
  type StationCoords,
} from '@/constants/stops';
import { dbGetMonitoredIds, dbSetMonitoredIds } from '@/lib/db';
import { type Station } from '@/lib/api';

export { NOTIFICATION_COOLDOWN_MS };

export interface MonitoredStation {
  id: string;
  name: string;
  coords: StationCoords;
}

// ── Module-level store (shared across all hook instances + locationTask) ───────

type Listener = (ids: string[]) => void;
const _listeners = new Set<Listener>();

// Load once synchronously from SQLite on module init.
let _ids: string[] = (() => {
  const saved = dbGetMonitoredIds();
  return saved.length > 0 ? saved : DEFAULT_MONITORED_IDS;
})();

// If we used defaults (first run), persist them now.
if (dbGetMonitoredIds().length === 0) {
  dbSetMonitoredIds(_ids);
}

function notify() {
  _listeners.forEach((fn) => fn([..._ids]));
}

function persistIds(next: string[]): void {
  _ids = next;
  notify();
  dbSetMonitoredIds(next); // sync write, no race condition
}

// For the background locationTask.
let _monitored: MonitoredStation[] = [];
export function getMonitoredStations(): MonitoredStation[] {
  return _monitored;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseMonitoredStationsResult {
  monitored: MonitoredStation[];
  loading: false;
  add: (station: Station) => void;
  remove: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  isMonitored: (id: string) => boolean;
  canMonitor: (id: string) => boolean;
}

export function useMonitoredStations(stations: Station[]): UseMonitoredStationsResult {
  const [ids, setIds] = useState<string[]>(_ids);

  useEffect(() => {
    const listener: Listener = (next) => setIds(next);
    _listeners.add(listener);
    // Sync state in case it changed between renders.
    setIds([..._ids]);
    return () => { _listeners.delete(listener); };
  }, []);

  const monitored: MonitoredStation[] = ids
    .map((id) => {
      const coords = STATION_COORDS[id];
      if (!coords) return null;
      const name = stations.find((s) => s.id === id)?.name ?? id;
      return { id, name, coords };
    })
    .filter((s): s is MonitoredStation => s !== null);

  // Keep module-level cache for background task in sync.
  _monitored = monitored;

  const add = useCallback((station: Station) => {
    if (!STATION_COORDS[station.id] || _ids.includes(station.id)) return;
    persistIds([..._ids, station.id]);
  }, []);

  const remove = useCallback((id: string) => {
    persistIds(_ids.filter((i) => i !== id));
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    const next = [..._ids];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persistIds(next);
  }, []);

  const isMonitored = useCallback((id: string) => _ids.includes(id), [ids]);
  const canMonitor = useCallback((id: string) => COORDINATED_STATION_IDS.has(id), []);

  return { monitored, loading: false, add, remove, reorder, isMonitored, canMonitor };
}
