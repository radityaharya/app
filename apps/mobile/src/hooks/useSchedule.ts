import { useCallback, useEffect, useRef, useState } from 'react';

import { api, type Schedule } from '@/lib/api';
import {
  dbGetFetchSource,
  dbGetScheduleCache,
  dbGetScheduleSyncedAt,
  dbSetScheduleCache,
} from '@/lib/db';
import { kciSchedule, kciStations } from '@/lib/kci';

export type ScheduleSource = 'cache' | 'server' | 'direct' | null;

export interface UseScheduleResult {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  source: ScheduleSource;
  syncedAt: Date | null;
  refetch: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useSchedule(stationId: string | null): UseScheduleResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(!!stationId);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ScheduleSource>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);

  // Stable ref so callbacks never need stationId in their dep array
  const stationIdRef = useRef(stationId);
  stationIdRef.current = stationId;

  async function load(forceNetwork: boolean) {
    const sid = stationIdRef.current;
    if (!sid) return;
    setLoading(true);
    setError(null);

    const fetchSource = dbGetFetchSource();

    if (!forceNetwork) {
      const cached = await dbGetScheduleCache(sid);
      if (cached && cached.length > 0) {
        console.log(`[schedule] ${sid}: cache (${cached.length} rows)`);
        setSchedules(cached);
        setSource('cache');
        setSyncedAt(await dbGetScheduleSyncedAt(sid));
        setLoading(false);
        return;
      }
    }

    if (fetchSource === 'direct') {
      try {
        console.log(`[schedule] ${sid}: direct → KCI`);
        const stations = await kciStations();
        const data = await kciSchedule(sid, stations);
        const result = data ?? [];
        setSchedules(result);
        setSource('direct');
        if (result.length > 0) {
          await dbSetScheduleCache(sid, result);
          setSyncedAt(await dbGetScheduleSyncedAt(sid));
          api.schedule.push(sid, result).catch((e) =>
            console.warn(`[schedule] ${sid}: push-back failed —`, e),
          );
        }
      } catch (err) {
        console.warn(`[schedule] ${sid}: direct fetch failed —`, err);
        const stale = await dbGetScheduleCache(sid);
        if (stale?.length) {
          setSchedules(stale);
          setSource('cache');
          setSyncedAt(await dbGetScheduleSyncedAt(sid));
        }
        setError(String(err));
      }
    } else {
      try {
        console.log(`[schedule] ${sid}: server → API`);
        const data = await api.schedule.byStation(sid);
        const result = data ?? [];
        setSchedules(result);
        setSource('server');
        if (result.length > 0) {
          await dbSetScheduleCache(sid, result);
          setSyncedAt(await dbGetScheduleSyncedAt(sid));
        }
      } catch (err) {
        console.warn(`[schedule] ${sid}: server fetch failed —`, err);
        const stale = await dbGetScheduleCache(sid);
        if (stale?.length) {
          setSchedules(stale);
          setSource('cache');
          setSyncedAt(await dbGetScheduleSyncedAt(sid));
        }
        setError(String(err));
      }
    }

    setLoading(false);
  }

  // Stable callbacks — empty dep array is safe because load reads stationId via ref
  const refetch = useCallback(() => load(true), []);
  const reload = useCallback(() => load(false), []);

  useEffect(() => {
    if (!stationId) {
      setSchedules([]);
      setSource(null);
      setSyncedAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    load(false);
  }, [stationId]);

  return { schedules, loading, error, source, syncedAt, refetch, reload };
}
