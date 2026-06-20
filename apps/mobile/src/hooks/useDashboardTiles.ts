import { useCallback, useState } from 'react';

import {
  DASHBOARD_TILE_IDS,
  dbGetDashboardTiles,
  dbSetDashboardTiles,
  type DashboardTileId,
} from '@/lib/db';

export function useDashboardTiles() {
  const [tiles, setTiles] = useState<DashboardTileId[]>(() => dbGetDashboardTiles());

  const persist = useCallback((next: DashboardTileId[]) => {
    dbSetDashboardTiles(next);
    setTiles(next);
  }, []);

  const addTile = useCallback(
    (id: DashboardTileId) => {
      if (tiles.includes(id)) return;
      persist([...tiles, id]);
    },
    [tiles, persist],
  );

  const removeTile = useCallback(
    (id: DashboardTileId) => {
      persist(tiles.filter((t) => t !== id));
    },
    [tiles, persist],
  );

  const available = DASHBOARD_TILE_IDS.filter((id) => !tiles.includes(id));

  return { tiles, available, addTile, removeTile };
}
