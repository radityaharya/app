import { useEffect, useState } from 'react';

import { api, type Schedule } from '@/lib/api';
import { dbGetScheduleCache, dbSetScheduleCache } from '@/lib/db';

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
        setSchedules(cached);
        setLoading(false);
        return;
      }
    }

    // 2. Fetch from backend, write to SQLite.
    try {
      const data = await api.schedule.byStation(stationId);
      const result = data ?? [];
      setSchedules(result);
      if (result.length > 0) {
        await dbSetScheduleCache(stationId, result);
      }
    } catch (err) {
      setError(String(err));
      // Show stale cache rather than nothing.
      const stale = await dbGetScheduleCache(stationId);
      if (stale && stale.length > 0) setSchedules(stale);
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
