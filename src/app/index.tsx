import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationPickerModal } from '@/components/StationPickerModal';
import { useThemeContext } from '@/context/ThemeContext';
import { useLocation } from '@/hooks/useLocation';
import { useMonitoredStations } from '@/hooks/useMonitoredStations';
import { useNotifications } from '@/hooks/useNotifications';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { useSchedule } from '@/hooks/useSchedule';
import { useStations } from '@/hooks/useStations';
import { type Schedule } from '@/lib/api';
import { lineColor } from '@/lib/color';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Departure row ─────────────────────────────────────────────────────────────
function DepartureRow({
  s,
  stationNameById,
  C,
}: {
  s: Schedule;
  stationNameById: Map<string, string>;
  C: ReturnType<typeof useThemeContext>['colors'];
}) {
  const mins = minutesUntil(s.departs_at);
  const isSoon = mins >= 0 && mins <= 5;
  const destName = stationNameById.get(s.station_destination_id) ?? s.station_destination_id;
  const safeColor = lineColor(s.metadata?.origin?.color, s.line, destName);
  const lineName = s.line.replace('COMMUTER LINE ', '');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 }}>
      {/* Line colour stripe */}
      <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: safeColor, flexShrink: 0 }} />

      {/* Destination + line name */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>
          {destName.replace(/\bSTASIUN\b/g, '').trim()}
        </Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>
          {lineName}
        </Text>
      </View>

      {/* Time + countdown */}
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ fontSize: 19, fontWeight: '700', color: isSoon ? safeColor : C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.5 }}>
          {fmtTime(s.departs_at)}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: isSoon ? safeColor : C.textSecondary }}>
          {mins === 0 ? 'NOW' : mins < 0 ? `${Math.abs(mins)}m ago` : `${mins}m`}
        </Text>
      </View>
    </View>
  );
}

// ── Stop chip ─────────────────────────────────────────────────────────────────
function StopChip({ name, active, onPress, C }: {
  name: string; active: boolean; onPress: () => void;
  C: ReturnType<typeof useThemeContext>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
        backgroundColor: active ? C.accent : C.backgroundElement,
        borderWidth: active ? 0 : 1, borderColor: C.backgroundSelected,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontWeight: active ? '600' : '400', color: active ? '#fff' : C.text }}>
        {name.replace(/\bSTASIUN\b/g, '').trim()}
      </Text>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors: C } = useThemeContext();
  const location = useLocation();
  const notifications = useNotifications();
  const { stations, loading: stationsLoading, refetch: refetchStations } = useStations();
  const { monitored, add, isMonitored } = useMonitoredStations(stations);
  const locationLabel = useReverseGeocode(location.coords);

  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Auto-select the monitored station nearest to current location.
  // If the user has manually tapped a chip (primaryId set), honour that instead.
  const nearestMonitoredId = useMemo(() => {
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

  const effectivePrimaryId =
    primaryId && monitored.some((m) => m.id === primaryId)
      ? primaryId
      : nearestMonitoredId ?? monitored[0]?.id ?? null;

  const { schedules, loading: scheduleLoading, refetch: refetchSchedule } = useSchedule(effectivePrimaryId);

  const stationNameById = new Map(stations.map((s) => [s.id, s.name]));
  const now = new Date();
  const upcoming = schedules.filter((s) => new Date(s.departs_at) >= now).slice(0, 5);
  const primaryStation = monitored.find((m) => m.id === effectivePrimaryId);

  const refreshing = stationsLoading || scheduleLoading;
  async function onRefresh() {
    setPrimaryId(null);
    await Promise.all([refetchStations(), refetchSchedule(), location.refreshLocation()]);
  }

  async function handleStartTracking() {
    const granted = await location.requestPermissions();
    if (granted) await location.startTracking();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textSecondary} colors={[C.accent]} />
        }
      >
        {/* ── Location + tracking pill ── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '600', color: C.text, letterSpacing: -0.5, lineHeight: 34 }} numberOfLines={1}>
            {locationLabel ?? (location.permissionStatus === 'granted-always' || location.permissionStatus === 'granted-foreground' ? 'Locating…' : 'Commuter')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>
              {location.coords
                ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                : location.permissionStatus === 'denied'
                  ? 'Location permission denied'
                  : ''}
            </Text>
            <Pressable
              onPress={location.isTracking ? location.stopTracking : handleStartTracking}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: location.isTracking ? C.statusActiveSubtle : C.backgroundElement,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: location.isTracking ? C.statusActive : C.statusInactive }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: location.isTracking ? C.statusActive : C.textSecondary, letterSpacing: 0.3 }}>
                {location.isTracking ? 'Tracking' : 'Off'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Station chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          {monitored.map((m) => (
            <StopChip key={m.id} name={m.name} active={m.id === effectivePrimaryId} onPress={() => setPrimaryId(m.id)} C={C} />
          ))}
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => ({
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
              borderWidth: 1, borderColor: C.backgroundSelected,
              opacity: pressed ? 0.7 : 1, justifyContent: 'center',
            })}
          >
            <Text style={{ fontSize: 18, color: C.textSecondary, lineHeight: 20 }}>+</Text>
          </Pressable>
        </ScrollView>

        {/* ── Departures card ── */}
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {primaryStation ? `Departures · ${primaryStation.name.replace(/\bSTASIUN\b/g, '').trim()}` : 'Departures'}
            </Text>
            {effectivePrimaryId && (
              <Pressable onPress={refetchSchedule} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <Text style={{ fontSize: 12, color: C.accent }}>Refresh</Text>
              </Pressable>
            )}
          </View>

          <View style={{ backgroundColor: C.backgroundElement, borderRadius: 20, overflow: 'hidden' }}>
            {!effectivePrimaryId ? (
              <View style={{ padding: 24, alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                  Add a station to see upcoming trains.
                </Text>
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={({ pressed }) => ({ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: C.accent, opacity: pressed ? 0.8 : 1 })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Add station</Text>
                </Pressable>
              </View>
            ) : scheduleLoading && upcoming.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="small" color={C.textSecondary} />
                <Text style={{ color: C.textSecondary, fontSize: 13 }}>Loading schedule…</Text>
              </View>
            ) : upcoming.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: C.textSecondary }}>No upcoming departures today.</Text>
              </View>
            ) : (
              upcoming.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: C.backgroundSelected, marginHorizontal: 20 }} />}
                  <DepartureRow s={s} stationNameById={stationNameById} C={C} />
                </View>
              ))
            )}
          </View>
        </View>

        {/* ── Permission warnings ── */}
        {(!notifications.permissionGranted || location.permissionStatus !== 'granted-always') && (
          <View style={{ marginHorizontal: 16, gap: 8 }}>
            {!notifications.permissionGranted && (
              <View style={{ backgroundColor: C.destructiveSubtle, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 16 }}>🔔</Text>
                <Text style={{ flex: 1, fontSize: 13, color: C.destructive, lineHeight: 18 }}>
                  Notifications disabled. Proximity alerts won't work.
                </Text>
              </View>
            )}
            {location.permissionStatus !== 'granted-always' && (
              <View style={{ backgroundColor: C.destructiveSubtle, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 16 }}>📍</Text>
                <Text style={{ flex: 1, fontSize: 13, color: C.destructive, lineHeight: 18 }}>
                  {location.permissionStatus === 'denied'
                    ? 'Location denied. Enable "Always" in settings.'
                    : 'Set location to "Always" for background alerts.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Start tracking CTA ── */}
        {!location.isTracking && location.permissionStatus === 'granted-always' && notifications.permissionGranted && (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity
              style={{ backgroundColor: C.accent, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
              onPress={handleStartTracking}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>Start tracking</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <StationPickerModal
        visible={pickerOpen}
        stations={stations}
        selectedIds={new Set(monitored.map((m) => m.id))}
        coordsOnly
        title="Add monitored station"
        onSelect={async (station) => { await add(station); }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
