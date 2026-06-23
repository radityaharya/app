import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { MONO } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import {
  dbSetApiUrl,
  dbSetHermesUrl,
  dbSetHermesDashboardUrl,
  dbSetMonitoredIds,
  dbAddGeofence,
  dbGetGeofences,
  dbDeleteGeofence,
} from '@/lib/db';

interface QRPayloadGeofence {
  name: string;
  event_name: string;
  latitude: number;
  longitude: number;
  radius_metres?: number;
  enabled?: boolean;
}

interface QRPayload {
  v: number;
  api_url?: string;
  hermes_url?: string;
  hermes_dashboard_url?: string;
  monitored_stations?: string[];
  geofences?: QRPayloadGeofence[];
}

function parsePayload(raw: string): QRPayload | null {
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== 'object' || obj === null) return null;
    const p = obj as Record<string, unknown>;
    if (typeof p.v !== 'number') return null;
    return p as unknown as QRPayload;
  } catch {
    return null;
  }
}

function applyPayload(payload: QRPayload): string[] {
  const applied: string[] = [];

  if (payload.api_url) {
    dbSetApiUrl(payload.api_url);
    applied.push(`api url → ${payload.api_url}`);
  }
  if (payload.hermes_url) {
    dbSetHermesUrl(payload.hermes_url);
    applied.push(`hermes url → ${payload.hermes_url}`);
  }
  if (payload.hermes_dashboard_url) {
    dbSetHermesDashboardUrl(payload.hermes_dashboard_url);
    applied.push(`hermes dashboard url → ${payload.hermes_dashboard_url}`);
  }
  if (Array.isArray(payload.monitored_stations)) {
    dbSetMonitoredIds(payload.monitored_stations);
    applied.push(`monitored stations → ${payload.monitored_stations.join(', ') || 'cleared'}`);
  }
  if (Array.isArray(payload.geofences) && payload.geofences.length > 0) {
    const existing = dbGetGeofences();
    for (const g of existing) dbDeleteGeofence(g.id);
    for (const g of payload.geofences) {
      dbAddGeofence({
        name: g.name,
        event_name: g.event_name,
        latitude: g.latitude,
        longitude: g.longitude,
        radius_metres: g.radius_metres ?? 300,
        enabled: g.enabled ?? true,
      });
    }
    applied.push(`geofences → ${payload.geofences.length} imported`);
  }

  return applied;
}

export default function QRScanScreen() {
  const { colors: C } = useThemeContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const processingRef = useRef(false);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (processingRef.current || scanned) return;
      processingRef.current = true;
      setScanned(true);

      const payload = parsePayload(data);
      if (!payload) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('invalid QR', 'this QR code is not a commuter config.', [
          {
            text: 'scan again',
            onPress: () => {
              setScanned(false);
              processingRef.current = false;
            },
          },
          { text: 'cancel', style: 'cancel', onPress: () => router.back() },
        ]);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const applied = applyPayload(payload);
      const summary = applied.length > 0 ? applied.join('\n') : 'no changes';

      Alert.alert('config imported', summary, [
        { text: 'done', onPress: () => router.back() },
      ]);
    },
    [scanned],
  );

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: C.background }} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }}>
        <Text style={{ fontSize: 14, fontFamily: MONO, color: C.text, textAlign: 'center', lineHeight: 22 }}>
          camera access is needed to scan QR codes.
        </Text>
        <Pressable
          onPress={() => void requestPermission()}
          style={({ pressed }) => ({
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: C.text,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.background }}>
            grant camera
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary }}>cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Dimmed overlay with cutout hint */}
      <View style={styles.overlay}>
        <View style={styles.topDim} />
        <View style={styles.middleRow}>
          <View style={styles.sideDim} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.sideDim} />
        </View>
        <View style={styles.bottomDim}>
          <Text style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
            point at a commuter config QR code
          </Text>
        </View>
      </View>

      {/* Close button */}
      <SafeAreaView style={{ position: 'absolute', top: 0, right: 0 }} edges={['top']}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            margin: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <X size={18} color="#fff" strokeWidth={1.75} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const CUTOUT = 240;
const DIM = 'rgba(0,0,0,0.55)';
const CORNER_SIZE = 22;
const CORNER_W = 3;

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  topDim: { flex: 1, backgroundColor: DIM },
  middleRow: { flexDirection: 'row', height: CUTOUT },
  sideDim: { flex: 1, backgroundColor: DIM },
  bottomDim: {
    flex: 1,
    backgroundColor: DIM,
    paddingTop: 20,
    alignItems: 'center',
  },
  viewfinder: {
    width: CUTOUT,
    height: CUTOUT,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },
});
