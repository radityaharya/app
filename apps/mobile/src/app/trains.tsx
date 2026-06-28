import { router } from 'expo-router';
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

import { DepartureRow } from '@/components/trains/DepartureRow';
import { StationPickerModal } from '@/components/StationPickerModal';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useLocation } from '@/hooks/useLocation';
import { useMonitoredStations } from '@/hooks/useMonitoredStations';
import { useSchedule } from '@/hooks/useSchedule';
import { useStations } from '@/hooks/useStations';
import { type Schedule } from '@/lib/api';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatSyncedAt(d: Date | null): string {
  if (!d) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export default function TrainsScreen() {
  const { colors: C } = useThemeContext();
  const location = useLocation();
  const { stations } = useStations();
  const { monitored, add, remove } = useMonitoredStations(stations);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualId, setManualId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const listRef = useRef<FlatList>(null);
  const hasScrolledRef = useRef(false);

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

  const activeId =
    manualId && monitored.some((m) => m.id === manualId)
      ? manualId
      : nearestId ?? monitored[0]?.id ?? null;

  const { schedules, loading: scheduleLoading, source, syncedAt, refetch } = useSchedule(activeId);

  const stationNameById = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name])),
    [stations],
  );

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: Schedule[] = [];
    const pa: Schedule[] = [];
    for (const s of schedules) {
      if (new Date(s.departs_at) >= now) up.push(s);
      else pa.push(s);
    }
    return { upcoming: up, past: pa };
  }, [schedules]);

  const allRows = useMemo(() => [...upcoming, ...past], [upcoming, past]);

  const activeStation = monitored.find((m) => m.id === activeId);

  useEffect(() => {
    if (!scheduleLoading && upcoming.length > 0 && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      setTimeout(() => listRef.current?.scrollToIndex({ index: 0, animated: true }), 200);
    }
  }, [scheduleLoading, upcoming.length]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [activeId]);

  useEffect(() => {
    if (editMode && monitored.length <= 1) setEditMode(false);
  }, [monitored.length, editMode]);

  const renderItem = useCallback(
    ({ item, index }: { item: Schedule; index: number }) => {
      const isFirstPast = past.length > 0 && item.id === past[0]?.id;
      const mins = Math.round((new Date(item.departs_at).getTime() - Date.now()) / 60000);
      const isPast = mins < -1;

      return (
        <View style={{ opacity: isPast ? 0.38 : 1 }}>
          {isFirstPast && upcoming.length > 0 && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: C.hairline }} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  fontFamily: MONO,
                  color: C.textSecondary,
                  letterSpacing: 0.8,
                }}
              >
                EARLIER TODAY
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.hairline }} />
            </View>
          )}
          {index > 0 && !isFirstPast && (
            <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: 16 }} />
          )}
          <DepartureRow schedule={item} stationNameById={stationNameById} C={C} />
        </View>
      );
    },
    [C, past, upcoming.length, stationNameById],
  );

  const sourceLine = source
    ? `${source}${syncedAt ? ` · ${formatSyncedAt(syncedAt)}` : ''}`
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: C.hairline,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              fontFamily: MONO,
              color: C.text,
              letterSpacing: -0.3,
            }}
          >
            trains
          </Text>
          {activeStation ? (
            <Text
              style={{
                fontSize: 11,
                fontFamily: MONO,
                color: C.textSecondary,
                letterSpacing: 0.2,
              }}
            >
              {activeStation.name.replace(/\bSTASIUN\b/g, '').trim().toLowerCase()}
              {sourceLine ? ` · ${sourceLine}` : ''}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Force refresh */}
          <Pressable
            onPress={() => refetch()}
            disabled={scheduleLoading}
            hitSlop={12}
            style={({ pressed }) => ({
              opacity: scheduleLoading ? 0.3 : pressed ? 0.5 : 1,
              borderWidth: 1,
              borderColor: C.hairline,
              paddingHorizontal: 10,
              paddingVertical: 6,
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 32,
            })}
          >
            {scheduleLoading ? (
              <ActivityIndicator size="small" color={C.textSecondary} />
            ) : (
              <Text style={{ fontSize: 14, fontFamily: MONO, color: C.text }}>↻</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              borderWidth: 1,
              borderColor: C.hairline,
              paddingHorizontal: 12,
              paddingVertical: 6,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', fontFamily: MONO, color: C.text }}>
              done
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Station chips ── */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: C.hairline, paddingVertical: 10 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={monitored}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
          ListEmptyComponent={
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary }}>
                + add a station to get started
              </Text>
            </Pressable>
          }
          ListFooterComponent={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={() => setPickerOpen(true)}
                hitSlop={8}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: C.hairline,
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary }}>+</Text>
              </Pressable>
              {monitored.length > 1 && (
                <Pressable
                  onPress={() => setEditMode((v) => !v)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: editMode ? C.text : C.hairline,
                    backgroundColor: editMode ? C.text : 'transparent',
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: MONO,
                      color: editMode ? C.background : C.textSecondary,
                    }}
                  >
                    edit
                  </Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item: m }) => (
            <StationChipWithRemove
              name={m.name}
              active={m.id === activeId}
              editMode={editMode}
              onPress={() => {
                if (!editMode) setManualId(m.id);
              }}
              onRemove={() => {
                remove(m.id);
                if (manualId === m.id) setManualId(null);
              }}
              C={C}
            />
          )}
        />
      </View>

      {/* ── Schedule list ── */}
      {!activeId ? (
        <View
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 60 }}
        >
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary, lineHeight: 22 }}>
            add a station above to see departures.
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
                <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: MONO }}>
                  loading…
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !scheduleLoading ? (
              <View style={{ paddingTop: 48, paddingHorizontal: 20 }}>
                <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: MONO }}>
                  no schedules available.
                </Text>
              </View>
            ) : null
          }
          onScrollToIndexFailed={() => {}}
          contentContainerStyle={{ paddingBottom: 100 }}
          style={{ flex: 1 }}
        />
      )}

      <StationPickerModal
        visible={pickerOpen}
        stations={stations}
        selectedIds={new Set(monitored.map((m) => m.id))}
        coordsOnly
        title="add monitored station"
        onSelect={async (station) => {
          await add(station);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function StationChipWithRemove({
  name,
  active,
  editMode,
  onPress,
  onRemove,
  C,
}: {
  name: string;
  active: boolean;
  editMode: boolean;
  onPress: () => void;
  onRemove: () => void;
  C: ThemeColors;
}) {
  const label = name.replace(/\bSTASIUN\b/g, '').trim().toLowerCase();

  return (
    <Pressable
      onPress={editMode ? onRemove : onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: active && !editMode ? C.text : 'transparent',
        borderWidth: 1,
        borderColor: editMode ? C.destructive : active ? C.text : C.hairline,
        opacity: pressed ? 0.65 : 1,
        gap: 5,
      })}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: active && !editMode ? '700' : '400',
          fontFamily: MONO,
          color: editMode ? C.destructive : active ? C.background : C.textSecondary,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
      {editMode && (
        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.destructive }}>×</Text>
      )}
    </Pressable>
  );
}
