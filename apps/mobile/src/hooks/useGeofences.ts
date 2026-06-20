import { useCallback, useEffect, useState } from 'react';

import {
  dbAddGeofence,
  dbDeleteGeofence,
  dbGetGeofences,
  dbUpdateGeofence,
  type GeofenceRow,
} from '@/lib/db';

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

  return { geofences, add, update, remove, toggle };
}
