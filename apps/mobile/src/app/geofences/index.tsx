import { BlurView } from 'expo-blur';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GeofenceStatusPanel } from '@/components/geofences/GeofenceStatusPanel';
import { MONO } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useGeofenceDraft } from '@/hooks/useGeofenceDraft';
import { useGeofenceStatus } from '@/hooks/useGeofenceStatus';
import { useGeofences } from '@/hooks/useGeofences';
import { useStations } from '@/hooks/useStations';
import { buildMapPolygons } from '@/lib/geofenceMap';

const JAKARTA = { latitude: -6.2, longitude: 106.816 };

export default function GeofencesMapScreen() {
  const { colors: C, scheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { geofences, seedFromStations } = useGeofences();
  const { inside, refreshLocation } = useGeofenceStatus();
  const { stations } = useStations();
  const [seeding, setSeeding] = useState(false);
  const { draft } = useGeofenceDraft();
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshLocation();
    }, [refreshLocation]),
  );

  useEffect(() => {
    Location.getLastKnownPositionAsync()
      .then((loc) => {
        if (loc) {
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      })
      .catch(() => {});
  }, []);

  const insideIds = useMemo(() => new Set(inside.map((i) => i.fence.id)), [inside]);

  const polygons = useMemo(
    () => buildMapPolygons(geofences, insideIds, draft, C),
    [geofences, insideIds, draft, C],
  );

  const cameraPosition = {
    coordinates: userCoords ?? JAKARTA,
    zoom: 14,
  };

  const mapProperties = {
    isMyLocationEnabled: true,
    ...(Platform.OS === 'android'
      ? {
          colorScheme:
            scheme === 'dark' ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT,
        }
      : {}),
  };

  function openAdd(coords: { latitude: number; longitude: number }) {
    router.push({
      pathname: '/geofences/add',
      params: { lat: String(coords.latitude), lng: String(coords.longitude) },
    });
  }

  function openEdit(id: string) {
    router.push({ pathname: '/geofences/edit', params: { id } });
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const added = seedFromStations(stations);
      Alert.alert('seeded', `added ${added} station geofence${added !== 1 ? 's' : ''}`);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          polygons={polygons}
          colorScheme={
            scheme === 'dark' ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT
          }
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
          properties={mapProperties}
          onMapLongClick={(e) => {
            const { latitude, longitude } = e.coordinates;
            if (latitude == null || longitude == null) return;
            openAdd({ latitude, longitude });
          }}
          onPolygonClick={(e) => e.id && openEdit(e.id)}
        />
      )}

      {/* Header */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <BlurView
          intensity={scheme === 'dark' ? 40 : 72}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={styles.blurChip}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, paddingHorizontal: 14, paddingVertical: 10 })}
          >
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text }}>← back</Text>
          </Pressable>
        </BlurView>

        <BlurView
          intensity={scheme === 'dark' ? 40 : 72}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={styles.blurChip}
        >
          <Pressable
            onPress={() => void handleSeed()}
            disabled={seeding}
            style={({ pressed }) => ({ opacity: pressed || seeding ? 0.5 : 1, paddingHorizontal: 14, paddingVertical: 10 })}
          >
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text }}>
              {seeding ? '...' : 'seed stations'}
            </Text>
          </Pressable>
        </BlurView>

        <BlurView
          intensity={scheme === 'dark' ? 40 : 72}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={[styles.blurChip, { flex: 1 }]}
        >
          <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.text }}>
              geofences
            </Text>
            <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary, marginTop: 2 }}>
              {geofences.length} configured · {inside.length} active
            </Text>
          </View>
        </BlurView>
      </View>

      {/* Status dock */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 12, left: 16, right: 16 }}>
        <BlurView
          intensity={scheme === 'dark' ? 50 : 80}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={styles.statusDock}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              fontFamily: MONO,
              color: C.textSecondary,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            {Platform.OS === 'android' ? 'long-press map to add' : 'tap map to add'}
          </Text>
          <GeofenceStatusPanel C={C} compact />
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blurChip: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.25)',
  },
  statusDock: {
    borderRadius: 10,
    overflow: 'hidden',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.25)',
  },
});
