import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { DepartureRow } from '@/components/trains/DepartureRow';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useLocation } from '@/hooks/useLocation';
import { useMonitoredStations } from '@/hooks/useMonitoredStations';
import { useSchedule } from '@/hooks/useSchedule';
import { useStations } from '@/hooks/useStations';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface TrainsTileProps {
  C: ThemeColors;
}

export function TrainsTile({ C }: TrainsTileProps) {
  const location = useLocation();
  const { stations } = useStations();
  const { monitored } = useMonitoredStations(stations);

  const nearestId = useMemo(() => {
    if (!location.coords || monitored.length === 0) return null;
    const { latitude, longitude } = location.coords;
    let bestId = monitored[0].id;
    let bestDist = Infinity;
    for (const m of monitored) {
      const d = haversineKm(latitude, longitude, m.coords.latitude, m.coords.longitude);
      if (d < bestDist) {
        bestDist = d;
        bestId = m.id;
      }
    }
    return bestId;
  }, [location.coords, monitored]);

  const activeId = nearestId ?? monitored[0]?.id ?? null;
  const { schedules, loading, source, syncedAt, reload } = useSchedule(activeId);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const stationNameById = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name])),
    [stations],
  );

  const now = new Date();
  const upcoming = schedules.filter((s) => new Date(s.departs_at) >= now).slice(0, 4);
  const activeStation = monitored.find((m) => m.id === activeId);

  function formatSyncedAt(d: Date | null): string {
    if (!d) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  }

  if (monitored.length === 0) {
    return (
      <Pressable
        onPress={() => router.push('/trains')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary, lineHeight: 20 }}>
          [+] add stations in tools → krl trains
        </Text>
      </Pressable>
    );
  }

  return (
    <View>
      <Pressable
        onPress={() => router.push('/trains')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.text }}>
          {activeStation
            ? activeStation.name.replace(/\bSTASIUN\b/g, '').trim().toLowerCase()
            : 'trains'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {source ? (
            <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary }}>
              {source === 'cache' ? `cached` : source}{syncedAt ? ` · ${formatSyncedAt(syncedAt)}` : ''}
            </Text>
          ) : null}
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>›</Text>
        </View>
      </Pressable>

      {loading && upcoming.length === 0 ? (
        <ActivityIndicator size="small" color={C.textSecondary} />
      ) : upcoming.length === 0 ? (
        <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary }}>
          [-] no upcoming departures
        </Text>
      ) : (
        upcoming.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <View style={{ height: 1, backgroundColor: C.hairline, marginVertical: 4 }} />}
            <DepartureRow schedule={s} stationNameById={stationNameById} C={C} compact />
          </View>
        ))
      )}
    </View>
  );
}
