import * as IntentLauncher from 'expo-intent-launcher';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';import { SafeAreaView } from 'react-native-safe-area-context';

import { StationPickerModal } from '@/components/StationPickerModal';
import { useThemeContext } from '@/context/ThemeContext';
import { useMonitoredStations } from '@/hooks/useMonitoredStations';
import { useStations } from '@/hooks/useStations';
import { dbGetApiUrl, dbSetApiUrl, dbResetApiUrl, DEFAULT_API_URL } from '@/lib/db';

async function openAndroidSettings(action: IntentLauncher.ActivityAction) {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync(action);
  } catch {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS).catch(() => {});
  }
}

export default function SettingsScreen() {
  const { colors: C, scheme, toggle } = useThemeContext();
  const { stations } = useStations();
  const { monitored, add, remove } = useMonitoredStations(stations);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiUrlDirty, setApiUrlDirty] = useState(false);
  const apiInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setApiUrl(dbGetApiUrl());
  }, []);

  function handleSaveApiUrl() {
    if (!apiUrl.trim()) return;
    Keyboard.dismiss();
    dbSetApiUrl(apiUrl);
    setApiUrlDirty(false);
    Alert.alert('Saved', 'API URL updated. Pull to refresh data.');
  }

  function handleResetApiUrl() {
    Alert.alert('Reset API URL', `Reset to default:\n${DEFAULT_API_URL}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
            dbResetApiUrl();
            setApiUrl(DEFAULT_API_URL);
            setApiUrlDirty(false);
          },
      },
    ]);
  }

  async function handlePickDataDir() {}
  function handleResetDataDir() {}

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: C.text,
            letterSpacing: -0.5,
            marginBottom: 32,
          }}
        >
          Settings
        </Text>

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <SectionLabel C={C}>Appearance</SectionLabel>
        <TouchableOpacity
          onPress={toggle}
          activeOpacity={0.8}
          style={{
            backgroundColor: C.backgroundElement,
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
          }}
        >
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>Theme</Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              {scheme === 'light' ? 'Light' : 'Dark'}
            </Text>
          </View>
          {/* Toggle pill */}
          <View
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              backgroundColor: scheme === 'dark' ? C.accent : C.backgroundSelected,
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: scheme === 'dark' ? '#fff' : C.text,
                alignSelf: scheme === 'dark' ? 'flex-end' : 'flex-start',
              }}
            />
          </View>
        </TouchableOpacity>

        {/* ── API server ────────────────────────────────────────────────────── */}
        <SectionLabel C={C}>API server</SectionLabel>
        <View style={{ backgroundColor: C.backgroundElement, borderRadius: 20, overflow: 'hidden', marginBottom: 6 }}>
          {/* URL input */}
          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
              Base URL
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: C.backgroundSelected, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10,
            }}>
              <TextInput
                ref={apiInputRef}
                value={apiUrl}
                onChangeText={(v) => { setApiUrl(v); setApiUrlDirty(true); }}
                placeholder="http://192.168.x.x:8080"
                placeholderTextColor={C.textSecondary}
                style={{ flex: 1, fontSize: 13, color: C.text, padding: 0, fontFamily: 'monospace' }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleSaveApiUrl}
              />
              {apiUrlDirty && (
                <Pressable
                  onPress={handleSaveApiUrl}
                  style={({ pressed }) => ({
                    backgroundColor: C.accent, borderRadius: 8,
                    paddingHorizontal: 12, paddingVertical: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Save</Text>
                </Pressable>
              )}
            </View>
          </View>
          <Divider C={C} />
          {/* Reset */}
          <Pressable
            onPress={handleResetApiUrl}
            style={({ pressed }) => ({
              paddingHorizontal: 20, paddingVertical: 14, opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: C.destructive }}>
              Reset to default
            </Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              {DEFAULT_API_URL}
            </Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 28, lineHeight: 18 }}>
          Changes take effect immediately on the next API call. Pull to refresh after saving.
        </Text>

        {/* ── Monitored stations ───────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          <SectionLabel C={C} noMargin>Monitored stations</SectionLabel>
          <Pressable
            onPress={() => setPickerOpen(true)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.accent }}>+ Add</Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: C.backgroundElement,
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          {monitored.length === 0 ? (
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => ({
                padding: 20,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 14, color: C.textSecondary }}>
                No stations monitored. Tap to add.
              </Text>
            </Pressable>
          ) : (
            monitored.map((m, index) => (
              <View key={m.id}>
                {index > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: C.backgroundSelected,
                      marginHorizontal: 20,
                    }}
                  />
                )}
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>
                      {m.name.replace(/\bSTASIUN\b/g, '').trim()}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: C.textSecondary,
                        marginTop: 2,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {m.id} · {m.coords.radiusMetres}m radius
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => remove(m.id)}
                    hitSlop={10}
                    style={({ pressed }) => ({
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: C.destructiveSubtle,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <Text
                      style={{ fontSize: 16, color: C.destructive, lineHeight: 18 }}
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
        <Text
          style={{
            fontSize: 12,
            color: C.textSecondary,
            paddingHorizontal: 4,
            marginBottom: 28,
            lineHeight: 18,
          }}
        >
          Only stations with known coordinates can trigger proximity alerts.
          Tap + Add to choose from the full KRL station list.
        </Text>

        {/* ── Data storage ─────────────────────────────────────────────────── */}
        <SectionLabel C={C}>Data storage</SectionLabel>
        <View style={{ backgroundColor: C.backgroundElement, borderRadius: 20, overflow: 'hidden', marginBottom: 6 }}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: C.text, marginBottom: 4 }}>Storage location</Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 18 }}>
              App private storage (system-managed SQLite)
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: C.textSecondary, paddingHorizontal: 4, marginBottom: 28, lineHeight: 18 }}>
          Data is stored in the app's private SQLite database. It is not accessible by other apps and persists across restarts.
        </Text>

        {/* ── System settings ─────────────────────────────────────────────── */}
        <SectionLabel C={C}>System settings</SectionLabel>
        <View
          style={{
            backgroundColor: C.backgroundElement,
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          <SettingsRow
            label="Location services"
            detail="GPS, Wi-Fi, Bluetooth scanning"
            C={C}
            onPress={() =>
              openAndroidSettings(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS)
            }
          />
          <Divider C={C} />
          <SettingsRow
            label="Notifications"
            detail="Permissions, channels, behavior"
            C={C}
            onPress={() =>
              openAndroidSettings(IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS)
            }
          />
          <Divider C={C} />
          <SettingsRow
            label="Battery optimization"
            detail="Background restrictions and saver"
            C={C}
            onPress={() =>
              openAndroidSettings(
                IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
              )
            }
          />
          <Divider C={C} />
          <SettingsRow
            label="App details"
            detail="Permissions, storage, background"
            C={C}
            onPress={() =>
              openAndroidSettings(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS)
            }
          />
        </View>
        <Text
          style={{
            fontSize: 12,
            color: C.textSecondary,
            paddingHorizontal: 4,
            marginBottom: 28,
            lineHeight: 18,
          }}
        >
          These shortcuts open Android system settings. Not available on iOS.
        </Text>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <SectionLabel C={C}>About</SectionLabel>
        <View
          style={{ backgroundColor: C.backgroundElement, borderRadius: 20, overflow: 'hidden' }}
        >
          <InfoRow label="App" value="Commuter" C={C} />
          <Divider C={C} />
          <InfoRow label="Version" value="1.0.0" C={C} />
          <Divider C={C} />
          <InfoRow label="Data" value="KRL Commuter API" C={C} />
          <Divider C={C} />
          <InfoRow label="SDK" value="Expo 55" C={C} />
        </View>
      </ScrollView>

      {/* Station picker */}
      <StationPickerModal
        visible={pickerOpen}
        stations={stations}
        selectedIds={new Set(monitored.map((m) => m.id))}
        coordsOnly
        title="Add monitored station"
        onSelect={async (station) => {
          await add(station);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type Colors = ReturnType<typeof useThemeContext>['colors'];

function SectionLabel({
  children,
  C,
  noMargin,
}: {
  children: React.ReactNode;
  C: Colors;
  noMargin?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: C.textSecondary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: noMargin ? 0 : 10,
        paddingHorizontal: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Divider({ C }: { C: Colors }) {
  return (
    <View style={{ height: 1, backgroundColor: C.backgroundSelected, marginHorizontal: 20 }} />
  );
}

function SettingsRow({
  label,
  detail,
  C,
  onPress,
}: {
  label: string;
  detail: string;
  C: Colors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        opacity: Platform.OS !== 'android' ? 0.4 : 1,
      }}
      disabled={Platform.OS !== 'android'}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{detail}</Text>
      </View>
      <Text style={{ fontSize: 18, color: C.textSecondary }}>›</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value, C }: { label: string; value: string; C: Colors }) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 14, color: C.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>{value}</Text>
    </View>
  );
}
