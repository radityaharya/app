import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useGeofenceDraft } from '@/hooks/useGeofenceDraft';
import { useGeofenceStatus } from '@/hooks/useGeofenceStatus';
import { useGeofences } from '@/hooks/useGeofences';
import { useStations } from '@/hooks/useStations';
import type { GeofenceRow } from '@/lib/db';
import { buildMapPolygons } from '@/lib/geofenceMap';
import { triggerGeofenceEvent, triggerManualPing } from '@/lib/geofenceTrigger';

const JAKARTA = { latitude: -6.2, longitude: 106.816 };

export default function GeofencesMapScreen() {
  const { colors: C, scheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { geofences, seedFromStations, toggle } = useGeofences();
  const { coords, inside, nearest, refreshLocation } = useGeofenceStatus();
  const { stations } = useStations();
  const [seeding, setSeeding] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { draft } = useGeofenceDraft();
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshLocation();
    }, [refreshLocation]),
  );

  useEffect(() => {
    Location.getLastKnownPositionAsync()
      .then((loc) => {
        if (loc) setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      })
      .catch(() => {});
  }, []);

  const insideIds = useMemo(() => new Set(inside.map((i) => i.fence.id)), [inside]);

  const polygons = useMemo(
    () => buildMapPolygons(geofences, insideIds, draft, C),
    [geofences, insideIds, draft, C],
  );


  const cameraPosition = { coordinates: userCoords ?? JAKARTA, zoom: 13 };

  const filtered = useMemo(() => {
    if (!query.trim()) return geofences;
    const q = query.toLowerCase();
    return geofences.filter((f) => f.name.toLowerCase().includes(q) || f.event_name.toLowerCase().includes(q));
  }, [geofences, query]);

  function openAdd(c: { latitude: number; longitude: number }) {
    router.push({ pathname: '/geofences/add', params: { lat: String(c.latitude), lng: String(c.longitude) } });
  }

  function openEdit(id: string) {
    router.push({ pathname: '/geofences/edit', params: { id } });
  }

  async function handleSeed() {
    setMenuOpen(false);
    setSeeding(true);
    try {
      const added = seedFromStations(stations);
      Alert.alert('seeded', `added ${added} station geofence${added !== 1 ? 's' : ''}`);
    } finally {
      setSeeding(false);
    }
  }

  async function handleTrigger() {
    setTriggering(true);
    try {
      let current = coords;
      if (!current) {
        await refreshLocation();
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') { Alert.alert('location', 'enable location to trigger.'); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        current = loc.coords;
      }
      const { latitude, longitude } = current;
      if (inside.length > 0) {
        await Promise.all(inside.map(({ fence }) => triggerGeofenceEvent(fence, latitude, longitude, { skipCooldown: true })));
        Alert.alert('triggered', `${inside.length} geofence${inside.length !== 1 ? 's' : ''} fired.`);
      } else {
        await triggerManualPing(latitude, longitude);
        Alert.alert('sent', 'location ping sent.');
      }
    } catch (err) {
      Alert.alert('failed', err instanceof Error ? err.message : 'trigger failed');
    } finally {
      setTriggering(false);
    }
  }

  const activeCount = inside.length;
  const enabledCount = geofences.filter((f) => f.enabled).length;
  const isDark = scheme === 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6, borderBottomColor: C.hairline, backgroundColor: C.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerSide}>
          <Text style={{ fontFamily: MONO, fontSize: 13, color: C.textSecondary }}>← back</Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: MONO, fontSize: 14, fontWeight: '600', color: C.text }}>geofences</Text>
          <Text style={{ fontFamily: MONO, fontSize: 10, color: C.textSecondary }}>
            {enabledCount} enabled{activeCount > 0 ? ` · ${activeCount} active` : ''}
          </Text>
        </View>

        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={8}>
            <Text style={{ fontFamily: MONO, fontSize: 18, color: C.textSecondary, lineHeight: 20 }}>⋯</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Dropdown menu ── */}
      {menuOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[styles.menu, { backgroundColor: C.background, borderColor: C.hairline, top: insets.top + 52, right: 16 }]}
            onPress={() => {}}
          >
            <Pressable
              style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => { setMenuOpen(false); void handleSeed(); }}
              disabled={seeding}
            >
              <Text style={{ fontFamily: MONO, fontSize: 13, color: C.text }}>{seeding ? 'seeding…' : 'seed from stations'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}

      {/* ── Map ── */}
      <View style={{ flex: 1 }}>
        {Platform.OS === 'ios' ? (
          <AppleMaps.View
            style={StyleSheet.absoluteFill}
            cameraPosition={cameraPosition}
            polygons={polygons}

            colorScheme={isDark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
            properties={{ isMyLocationEnabled: true }}
            onMapClick={(e) => {
              const { latitude, longitude } = e.coordinates;
              if (latitude == null || longitude == null) return;
              openAdd({ latitude, longitude });
            }}
            onPolygonClick={(e) => e.id && openEdit(e.id)}
          />
        ) : (
          <GoogleMaps.View
            style={StyleSheet.absoluteFill}
            cameraPosition={cameraPosition}
            polygons={polygons}

            colorScheme={isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
            properties={{ isMyLocationEnabled: true }}
            onMapLongClick={(e) => {
              const { latitude, longitude } = e.coordinates;
              if (latitude == null || longitude == null) return;
              openAdd({ latitude, longitude });
            }}
            onPolygonClick={(e) => e.id && openEdit(e.id)}

          />
        )}
      </View>

      {/* ── Bottom Sheet ── */}
      <BottomSheet
        ref={sheetRef}
        snapPoints={['22%', '52%', '88%']}
        index={0}
        backgroundStyle={{ backgroundColor: C.background }}
        handleIndicatorStyle={{ backgroundColor: C.hairlineStrong, width: 32 }}
      >
        {/* Status bar — always visible at 22% */}
        <View style={[styles.statusBar, { borderBottomColor: C.hairline }]}>
          <View style={{ flex: 1 }}>
            {coords ? (
              <Text style={{ fontFamily: MONO, fontSize: 10, color: C.textSecondary, fontVariant: ['tabular-nums'] }}>
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </Text>
            ) : null}
            {inside.length > 0 ? (
              inside.map(({ fence, distanceMetres }) => (
                <Text key={fence.id} style={{ fontFamily: MONO, fontSize: 12, color: C.statusActive, marginTop: 2 }}>
                  ● {fence.name} · {Math.round(distanceMetres)}m
                </Text>
              ))
            ) : (
              <Text style={{ fontFamily: MONO, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                {nearest
                  ? `nearest: ${nearest.fence.name} (${Math.round(nearest.distanceMetres)}m)`
                  : 'not inside any fence'}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => void handleTrigger()}
            disabled={triggering}
            style={({ pressed }) => [styles.triggerBtn, { borderColor: C.hairline, opacity: pressed || triggering ? 0.5 : 1 }]}
          >
            <Text style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>
              {triggering ? '…' : inside.length > 0 ? 'trigger' : 'ping'}
            </Text>
          </Pressable>
        </View>

        {/* Search + fence list */}
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={[styles.searchRow, { borderBottomColor: C.hairline }]}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="search fences…"
              placeholderTextColor={C.textSecondary}
              style={{ fontFamily: MONO, fontSize: 13, color: C.text, flex: 1 }}
              clearButtonMode="while-editing"
            />
          </View>

          {filtered.map((fence) => (
            <FenceRow
              key={fence.id}
              fence={fence}
              isInside={insideIds.has(fence.id)}
              C={C}
              onEdit={() => openEdit(fence.id)}
              onToggle={() => toggle(fence.id)}
            />
          ))}

          {filtered.length === 0 && (
            <Text style={{ fontFamily: MONO, fontSize: 12, color: C.textSecondary, padding: 16 }}>
              no fences match "{query}"
            </Text>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

function FenceRow({ fence, isInside, C, onEdit, onToggle }: {
  fence: GeofenceRow;
  isInside: boolean;
  C: ThemeColors;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const dot = isInside ? C.statusActive : fence.enabled ? C.accent : C.textSecondary;
  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [styles.fenceRow, { borderBottomColor: C.hairline, opacity: pressed ? 0.65 : 1 }]}
    >
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: MONO, fontSize: 13, color: fence.enabled ? C.text : C.textSecondary }}>{fence.name}</Text>
        <Text style={{ fontFamily: MONO, fontSize: 10, color: C.textSecondary }}>{fence.radius_metres}m · {fence.event_name}</Text>
      </View>
      <Pressable onPress={onToggle} hitSlop={12} style={{ paddingLeft: 16 }}>
        <Text style={{ fontFamily: MONO, fontSize: 11, color: fence.enabled ? C.accent : C.textSecondary }}>
          {fence.enabled ? 'on' : 'off'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    minWidth: 56,
  },
  menu: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  triggerBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
