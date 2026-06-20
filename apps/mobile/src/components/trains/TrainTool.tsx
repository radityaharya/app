/**
 * TrainTool — self-contained KRL departure widget.
 *
 * Owns its own state and data fetching. Drop into any screen.
 * Links to /trains for full schedule + station management.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { DepartureRow } from './DepartureRow';
import { StationChip } from './StationChip';
import { MONO, type ThemeColors } from '@/components/tokens';
import { StationPickerModal } from '@/components/StationPickerModal';
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

interface TrainToolProps {
  C: ThemeColors;
}

export function TrainTool({ C }: TrainToolProps) {
  const location = useLocation();
  const { stations, loading: stationsLoading } = useStations();
  const { monitored, add } = useMonitoredStations(stations);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualId, setManualId] = useState<string | null>(null);

  // Pick nearest monitored station automatically; honour manual override
  const nearestId = useMemo(() => {
    if (!location.coords || monitored.length === 0) return null;
    const { latitude, longitude } = location.coords;
    let bestId = monitored[0].id;
    let bestDist = Infinity;
    for (const m of monitored) {
      const d = haversineKm(latitude, longitude, m.coords.latitude, m.coords.longitude);
      if (d < bestDist) { bestDist = d; bestId = m.id; }
    }
    return bestId;
  }, [location.coords, monitored]);

  const activeId =
    manualId && monitored.some((m) => m.id === manualId)
      ? manualId
      : nearestId ?? monitored[0]?.id ?? null;

  const { schedules, loading: scheduleLoading, refetch } = useSchedule(activeId);

  const stationNameById = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name])),
    [stations],
  );

  const now = new Date();
  const upcoming = schedules.filter((s) => new Date(s.departs_at) >= now).slice(0, 5);
  const activeStation = monitored.find((m) => m.id === activeId);

  const isEmpty = monitored.length === 0;
  const isLoading = scheduleLoading && upcoming.length === 0;

  return (
    <View>
      {/* Tool header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable
          onPress={() => router.push('/trains')}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 6 })}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', fontFamily: MONO, color: C.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {activeStation
              ? `trains · ${activeStation.name.replace(/\bSTASIUN\b/g, '').trim().toLowerCase()}`
              : 'trains'}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>›</Text>
        </Pressable>
        {activeId && (
          <Pressable onPress={refetch} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.accent }}>refresh</Text>
          </Pressable>
        )}
      </View>

      {/* Station chips */}
      {monitored.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, flexDirection: 'row', marginBottom: 12 }}
        >
          {monitored.map((m) => (
            <StationChip
              key={m.id}
              name={m.name}
              active={m.id === activeId}
              onPress={() => setManualId(m.id)}
              C={C}
            />
          ))}
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: C.hairline,
              opacity: pressed ? 0.7 : 1,
              justifyContent: 'center',
            })}
          >
            <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary }}>[+]</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Departure list */}
      <View style={{ borderWidth: 1, borderColor: C.hairline }}>
        {isEmpty ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary, lineHeight: 20 }}>
              [+] add a station to see upcoming trains.
            </Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 4,
                backgroundColor: C.text,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', fontFamily: MONO, color: C.background }}>
                add station
              </Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={{ paddingVertical: 28, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color={C.textSecondary} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: MONO }}>loading…</Text>
          </View>
        ) : upcoming.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary }}>
              [-] no upcoming departures today.
            </Text>
          </View>
        ) : (
          upcoming.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: C.hairline }} />}
              <DepartureRow schedule={s} stationNameById={stationNameById} C={C} />
            </View>
          ))
        )}
      </View>

      <StationPickerModal
        visible={pickerOpen}
        stations={stations}
        selectedIds={new Set(monitored.map((m) => m.id))}
        coordsOnly
        title="add monitored station"
        onSelect={async (station) => { await add(station); }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
