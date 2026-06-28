import { useEffect, useState } from 'react';

import { api, type Schedule } from '@/lib/api';
import { dbGetKciFallback, dbGetScheduleCache, dbSetScheduleCache } from '@/lib/db';
import { kciSchedule, kciStations } from '@/lib/kci';

export interface UseScheduleResult {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSchedule(stationId: string | null): UseScheduleResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(!!stationId);
  const [error, setError] = useState<string | null>(null);

  async function load(forceNetwork = false) {
    if (!stationId) return;
    setLoading(true);
    setError(null);

    // 1. SQLite cache (today only).
    if (!forceNetwork) {
      const cached = await dbGetScheduleCache(stationId);
      if (cached && cached.length > 0) {
        console.log(`[schedule] ${stationId}: served ${cached.length} rows from sqlite cache`);
        setSchedules(cached);
        setLoading(false);
        return;
      }
    }

    // 2. Fetch from backend, write to SQLite.
    try {
      console.log(`[schedule] ${stationId}: fetching from api`);
      const data = await api.schedule.byStation(stationId);
      const result = data ?? [];
      console.log(`[schedule] ${stationId}: api returned ${result.length} rows`);
      setSchedules(result);
      if (result.length > 0) {
        await dbSetScheduleCache(stationId, result);
      }
    } catch (err) {
      console.warn(`[schedule] ${stationId}: api failed —`, err);
      if (dbGetKciFallback()) {
        try {
          console.log(`[schedule] ${stationId}: trying kci direct fallback`);
          const stations = await kciStations();
          const data = await kciSchedule(stationId, stations);
          const result = data ?? [];
          console.log(`[schedule] ${stationId}: kci returned ${result.length} rows`);
          setSchedules(result);
          if (result.length > 0) {
            await dbSetScheduleCache(stationId, result);
          }
          return;
        } catch (kciErr) {
          console.warn(`[schedule] ${stationId}: kci fallback also failed —`, kciErr);
        }
      }
      // Show stale cache rather than nothing.
      const stale = await dbGetScheduleCache(stationId);
      if (stale && stale.length > 0) {
        console.log(`[schedule] ${stationId}: showing ${stale.length} stale rows from sqlite`);
        setSchedules(stale);
      }
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!stationId) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    load(false);
  }, [stationId]);

  return { schedules, loading, error, refetch: () => load(true) };
}
