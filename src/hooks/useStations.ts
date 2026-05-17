import { useEffect, useState } from 'react';

import { api, type Station } from '@/lib/api';

/**
 * In-memory cache shared between the hook and the background location task.
 * Both run in the same JS runtime so a module-level variable is sufficient.
 */
let _cachedStations: Station[] = [];

export function getCachedStations(): Station[] {
  return _cachedStations;
}

export interface UseStationsResult {
  stations: Station[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStations(): UseStationsResult {
  const [stations, setStations] = useState<Station[]>(_cachedStations);
  const [loading, setLoading] = useState(_cachedStations.length === 0);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.stations.list();
      _cachedStations = data;
      setStations(data ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { stations, loading, error, refetch: load };
}
