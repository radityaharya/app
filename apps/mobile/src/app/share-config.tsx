import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Copy, Download, X } from 'lucide-react-native';

import { MONO } from '@/components/tokens';
import { Radius } from '@/constants/theme';
import { useThemeContext } from '@/context/ThemeContext';
import {
  dbGetApiUrl,
  dbGetHermesDashboardUrl,
  dbGetHermesUrl,
  dbGetMonitoredIds,
  dbGetGeofences,
  dbGetShortcuts,
} from '@/lib/db';
import { getHermesApiKey } from '@/lib/hermesConfig';
import {
  getDashboardUsername,
  getDashboardPassword,
} from '@/lib/hermesDashboardConfig';

// QR codes top out around 2900 bytes for version 40 error-correction L
const QR_MAX_BYTES = 2800;

type Tab = 'qr' | 'json';

interface ConfigPayload {
  v: number;
  api_url?: string;
  hermes_url?: string;
  hermes_dashboard_url?: string;
  hermes_api_key?: string;
  hermes_dashboard_username?: string;
  hermes_dashboard_password?: string;
  monitored_stations?: string[];
  geofences?: object[];
  shortcuts?: object[];
}

async function buildPayload(includeSecrets: boolean): Promise<ConfigPayload> {
  const payload: ConfigPayload = { v: 2 };

  const apiUrl = dbGetApiUrl();
  if (apiUrl) payload.api_url = apiUrl;

  const hermesUrl = dbGetHermesUrl();
  if (hermesUrl) payload.hermes_url = hermesUrl;

  const hermesDashUrl = dbGetHermesDashboardUrl();
  if (hermesDashUrl) payload.hermes_dashboard_url = hermesDashUrl;

  if (includeSecrets) {
    const apiKey = await getHermesApiKey();
    if (apiKey) payload.hermes_api_key = apiKey;

    const username = await getDashboardUsername();
    if (username) payload.hermes_dashboard_username = username;

    const password = await getDashboardPassword();
    if (password) payload.hermes_dashboard_password = password;
  }

  const monitoredIds = dbGetMonitoredIds();
  if (monitoredIds.length > 0) payload.monitored_stations = monitoredIds;

  const geofences = dbGetGeofences().map(({ id: _id, created_at: _ca, ...rest }) => rest);
  if (geofences.length > 0) payload.geofences = geofences;

  const shortcuts = dbGetShortcuts().map(({ favicon: _f, ...rest }) => rest);
  if (shortcuts.length > 0) payload.shortcuts = shortcuts;

  return payload;
}

export default function ShareConfigScreen() {
  const { colors: C } = useThemeContext();
  const [tab, setTab] = useState<Tab>('qr');
  const [includeSecrets, setIncludeSecrets] = useState(true);
  const [json, setJson] = useState('');
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void buildPayload(includeSecrets).then((p) => {
      setJson(JSON.stringify(p, null, 2));
    });
  }, [includeSecrets]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const jsonBytes = new TextEncoder().encode(json).length;
  const qrFits = jsonBytes <= QR_MAX_BYTES;
  const compactJson = JSON.stringify(JSON.parse(json || '{}'));

  async function handleCopy() {
    await Clipboard.setStringAsync(compactJson);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      const path = `${FileSystem.cacheDirectory}commuter-config.json`;
      await FileSystem.writeAsStringAsync(path, compactJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: 'Share Commuter config',
      });
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: C.hairline,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            fontFamily: MONO,
            color: C.text,
            letterSpacing: -0.3,
          }}
        >
          share config
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <X size={20} color={C.textSecondary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Include secrets toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.hairline,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.text }}>
              include credentials
            </Text>
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, lineHeight: 16 }}>
              hermes api key, dashboard username & password
            </Text>
          </View>
          <Pressable
            onPress={() => setIncludeSecrets((v) => !v)}
            style={({ pressed }) => ({
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: includeSecrets ? C.text : C.backgroundSelected,
              borderWidth: 1,
              borderColor: C.hairline,
              justifyContent: 'center',
              paddingHorizontal: 3,
              alignItems: includeSecrets ? 'flex-end' : 'flex-start',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: includeSecrets ? C.background : C.textSecondary,
              }}
            />
          </Pressable>
        </View>

        {/* Tab picker */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            marginTop: 20,
            borderWidth: 1,
            borderColor: C.hairline,
            borderRadius: Radius.sm,
            overflow: 'hidden',
          }}
        >
          {(['qr', 'json'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: tab === t ? C.text : 'transparent',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: tab === t ? '700' : '500',
                  fontFamily: MONO,
                  color: tab === t ? C.background : C.textSecondary,
                }}
              >
                {t === 'qr' ? 'QR code' : 'JSON'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'qr' ? (
          <View style={{ marginHorizontal: 20, marginTop: 24, gap: 16 }}>
            {qrFits ? (
              <View
                style={{
                  alignSelf: 'center',
                  padding: 16,
                  borderRadius: Radius.sm,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: C.hairline,
                }}
              >
                <QRCode
                  value={compactJson}
                  size={240}
                  backgroundColor="#fff"
                  color="#000"
                />
              </View>
            ) : (
              <View
                style={{
                  padding: 20,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: C.destructive,
                  backgroundColor: C.destructiveSubtle,
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    fontFamily: MONO,
                    color: C.destructive,
                  }}
                >
                  config too large for QR
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: MONO,
                    color: C.text,
                    lineHeight: 17,
                  }}
                >
                  {jsonBytes.toLocaleString()} bytes — exceeds {QR_MAX_BYTES.toLocaleString()} byte QR limit.
                  Use the JSON tab to share.
                </Text>
              </View>
            )}
            <Text
              style={{
                fontSize: 11,
                fontFamily: MONO,
                color: C.textSecondary,
                textAlign: 'center',
                lineHeight: 17,
              }}
            >
              {jsonBytes.toLocaleString()} bytes · scan with the import QR option on another device
            </Text>
          </View>
        ) : (
          <View style={{ marginHorizontal: 20, marginTop: 24, gap: 12 }}>
            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: copied ? C.statusActive : C.hairline,
                  backgroundColor: copied ? C.statusActiveSubtle : C.backgroundElement,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {copied ? (
                  <Check size={14} color={C.statusActive} strokeWidth={2} />
                ) : (
                  <Copy size={14} color={C.text} strokeWidth={1.75} />
                )}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    fontFamily: MONO,
                    color: copied ? C.statusActive : C.text,
                  }}
                >
                  {copied ? 'copied' : 'copy'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleShare}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: C.hairline,
                  backgroundColor: C.backgroundElement,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Download size={14} color={C.text} strokeWidth={1.75} />
                <Text
                  style={{ fontSize: 12, fontWeight: '600', fontFamily: MONO, color: C.text }}
                >
                  share file
                </Text>
              </Pressable>
            </View>

            {/* JSON preview */}
            <View
              style={{
                borderWidth: 1,
                borderColor: C.hairline,
                borderRadius: Radius.sm,
                backgroundColor: C.backgroundElement,
                padding: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: MONO,
                  color: C.textSecondary,
                  lineHeight: 16,
                }}
                selectable
              >
                {json}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 11,
                fontFamily: MONO,
                color: C.textSecondary,
                lineHeight: 17,
              }}
            >
              {jsonBytes.toLocaleString()} bytes · import on another device via Settings → import via QR or paste JSON
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
