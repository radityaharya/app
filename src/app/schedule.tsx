import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationPickerModal } from '@/components/StationPickerModal';
import { useThemeContext } from '@/context/ThemeContext';
import { useSchedule } from '@/hooks/useSchedule';
import { useStations } from '@/hooks/useStations';
import { type Schedule, type Station } from '@/lib/api';
import { lineColor } from '@/lib/color';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({
  item,
  stationNameById,
  C,
}: {
  item: Schedule;
  stationNameById: Map<string, string>;
  C: ReturnType<typeof useThemeContext>['colors'];
}) {
  const mins = minutesUntil(item.departs_at);
  const isPast = mins < -1;
  const isSoon = !isPast && mins <= 10;
  const destName =
    stationNameById.get(item.station_destination_id) ?? item.station_destination_id;
  const safeColor = lineColor(item.metadata?.origin?.color, item.line, destName);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 13,
        opacity: isPast ? 0.4 : 1,
        gap: 14,
      }}
    >
      {/* Line colour stripe */}
      <View style={{ width: 3, height: 34, borderRadius: 2, backgroundColor: safeColor, flexShrink: 0 }} />

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '500', color: C.text }}
          numberOfLines={1}
        >
          {destName.replace(/\bSTASIUN\b/g, '').trim()}
        </Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>
          {item.line.replace('COMMUTER LINE ', '')}
          {' · '}
          {item.train_id}
        </Text>
      </View>

      {/* Time + badge */}
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: isSoon ? C.statusActive : isPast ? C.textSecondary : C.text,
            fontVariant: ['tabular-nums'],
            letterSpacing: -0.5,
          }}
        >
          {fmtTime(item.departs_at)}
        </Text>
        <View
          style={{
            backgroundColor: isPast
              ? C.backgroundSelected
              : isSoon
              ? C.statusActiveSubtle
              : C.backgroundElement,
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: isPast
                ? C.textSecondary
                : isSoon
                ? C.statusActive
                : C.textSecondary,
              letterSpacing: 0.2,
            }}
          >
            {isPast
              ? 'passed'
              : mins === 0
              ? 'NOW'
              : mins < 0
              ? `${Math.abs(mins)}m ago`
              : `${mins}m`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const { colors: C } = useThemeContext();
  const { stations, loading: stationsLoading } = useStations();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const listRef = useRef<FlatList>(null);
  const hasScrolledRef = useRef(false);

  const { schedules, loading: scheduleLoading, refetch } = useSchedule(
    selectedStation?.id ?? null,
  );

  const stationNameById = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name])),
    [stations],
  );

  // Split into upcoming / past
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcoming: Schedule[] = [];
    const past: Schedule[] = [];
    for (const s of schedules) {
      if (new Date(s.departs_at) >= now) upcoming.push(s);
      else past.push(s);
    }
    return { upcoming, past };
  }, [schedules]);

  const allRows = useMemo(() => [...upcoming, ...past], [upcoming, past]);

  // Autoscroll to first upcoming train when data loads
  useEffect(() => {
    if (!scheduleLoading && upcoming.length > 0 && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      // upcoming starts at index 0 in allRows
      setTimeout(
        () => listRef.current?.scrollToIndex({ index: 0, animated: true }),
        200,
      );
    }
  }, [scheduleLoading, upcoming.length]);

  // Reset scroll flag on station change
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [selectedStation?.id]);

  const renderItem = useCallback(
    ({ item, index }: { item: Schedule; index: number }) => {
      const isFirstPast = past.length > 0 && item.id === past[0]?.id;
      return (
        <>
          {isFirstPast && upcoming.length > 0 && (
            <View
              style={{
                marginHorizontal: 20,
                marginVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: C.backgroundSelected }} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: C.textSecondary,
                  letterSpacing: 0.8,
                }}
              >
                EARLIER TODAY
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.backgroundSelected }} />
            </View>
          )}
          {index > 0 && (
            <View
              style={{
                height: 1,
                backgroundColor: C.backgroundSelected,
                marginHorizontal: 20,
              }}
            />
          )}
          <Row item={item} stationNameById={stationNameById} C={C} />
        </>
      );
    },
    [C, past, upcoming.length, stationNameById],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 }}>
        <Text
          style={{
            fontSize: 26,
            fontWeight: '700',
            color: C.text,
            letterSpacing: -0.5,
          }}
        >
          Schedule
        </Text>

        {/* Station selector */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => ({
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: C.backgroundElement,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 13,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flex: 1 }}>
            {selectedStation ? (
              <>
                <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>
                  {selectedStation.name.replace(/\bSTASIUN\b/g, '').trim()}
                </Text>
                {upcoming.length > 0 && (
                  <Text style={{ fontSize: 12, color: C.statusActive, marginTop: 2 }}>
                    {upcoming.length} upcoming departure{upcoming.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </>
            ) : (
              <Text style={{ fontSize: 16, color: C.textSecondary }}>
                {stationsLoading ? 'Loading stations…' : 'Choose a station'}
              </Text>
            )}
          </View>
          <View
            style={{
              backgroundColor: C.accentSubtle,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.accent }}>
              {selectedStation ? 'Change' : 'Pick'}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {!selectedStation ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}
        >
          <Text
            style={{
              fontSize: 15,
              color: C.textSecondary,
              textAlign: 'center',
              maxWidth: 240,
              lineHeight: 22,
            }}
          >
            Select a station above to see the full day's departure schedule.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={allRows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={scheduleLoading}
              onRefresh={refetch}
              tintColor={C.textSecondary}
              colors={[C.accent]}
            />
          }
          ListHeaderComponent={
            scheduleLoading && allRows.length === 0 ? (
              <View style={{ paddingTop: 48, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="small" color={C.textSecondary} />
                <Text style={{ color: C.textSecondary, fontSize: 13 }}>
                  Loading schedule…
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !scheduleLoading ? (
              <View style={{ paddingTop: 48, alignItems: 'center' }}>
                <Text style={{ color: C.textSecondary, fontSize: 14 }}>
                  No schedules available.
                </Text>
              </View>
            ) : null
          }
          onScrollToIndexFailed={() => {}}
          contentContainerStyle={{ paddingBottom: 100 }}
          style={{ flex: 1 }}
        />
      )}

      {/* ── Picker modal ─────────────────────────────────────────────────── */}
      <StationPickerModal
        visible={pickerOpen}
        stations={stations}
        selectedIds={selectedStation ? new Set([selectedStation.id]) : new Set()}
        coordsOnly={false}
        title="Select station"
        onSelect={(station) => {
          setSelectedStation(station);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
