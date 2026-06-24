import * as Haptics from 'expo-haptics';
import * as IntentLauncher from 'expo-intent-launcher';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Moon,
  RefreshCw,
  Sun,
} from 'lucide-react-native';

import { MONO, type ThemeColors } from '@/components/tokens';
import { Radius } from '@/constants/theme';
import { useThemeContext } from '@/context/ThemeContext';
import { useUpdateContext } from '@/context/UpdateContext';
import { shortUpdateId, updateStatusLabel } from '@/hooks/useUpdate';
import { useGeofences } from '@/hooks/useGeofences';
import { useLocation } from '@/hooks/useLocation';
import { useNotifications } from '@/hooks/useNotifications';
import { useShortcuts } from '@/hooks/useShortcuts';
import type { ThemeScheme } from '@/lib/db';

async function openAndroidSettings(action: IntentLauncher.ActivityAction) {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync(action);
  } catch {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS).catch(
      () => {},
    );
  }
}

export default function SettingsScreen() {
  const { colors: C, scheme, setScheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const location = useLocation();
  const notifications = useNotifications();
  const { geofences } = useGeofences();
  const { shortcuts } = useShortcuts();
  const { status: updateStatus, error: updateError, info: updateInfo, checkForUpdate, applyUpdate } =
    useUpdateContext();

  const needsLocation = location.permissionStatus !== 'granted-always';
  const needsNotifications = !notifications.permissionGranted;
  const updateBusy = updateStatus === 'checking' || updateStatus === 'downloading';
  const tabBarOffset = 56 + insets.bottom;
  const alertsOk = !needsLocation && !needsNotifications;

  async function handleUpdatePress() {
    if (updateStatus === 'ready') {
      await applyUpdate();
      return;
    }

    const result = await checkForUpdate({ reloadIfReady: false });
    if (result.status === 'ready') {
      Alert.alert('Update ready', 'Restart Commuter to apply the latest update?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart', onPress: () => void applyUpdate() },
      ]);
      return;
    }

    if (result.status === 'up-to-date') {
      Alert.alert('Up to date', 'You already have the latest update for this build.');
      return;
    }

    if (result.status === 'error') {
      Alert.alert('Update check failed', result.error ?? 'Unknown error');
    }
  }

  function handleThemeChange(next: ThemeScheme) {
    if (next === scheme) return;
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setScheme(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <KeyboardAwareScrollView
        bottomOffset={tabBarOffset}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 28,
          paddingBottom: tabBarOffset + 32,
          gap: 28,
        }}
      >
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              fontFamily: MONO,
              color: C.text,
              letterSpacing: -0.5,
            }}
          >
            settings
          </Text>
          <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary, lineHeight: 18 }}>
            tracking, integrations, and app preferences
          </Text>
        </View>

        <StatusCard
          C={C}
          tracking={location.isTracking}
          geofenceCount={geofences.length}
          alertsOk={alertsOk}
        />

        {(needsLocation || needsNotifications) && (
          <PermissionCard
            C={C}
            needsNotifications={needsNotifications}
            needsLocation={needsLocation}
            locationDenied={location.permissionStatus === 'denied'}
            onRequestLocation={() => void location.requestPermissions()}
          />
        )}

        <Section title="appearance" C={C}>
          <ThemePicker C={C} scheme={scheme} onChange={handleThemeChange} />
        </Section>

        <Section title="tracking" C={C}>
          <ActionRow
            C={C}
            label="geofences"
            detail={`${geofences.length} configured · ${location.isTracking ? 'active' : 'inactive'}`}
            onPress={() => router.push('/geofences' as never)}
          />
          <Divider C={C} />
          <InfoBlock
            C={C}
            label="background tracking"
            detail={location.isTracking ? 'running — toggle from home' : 'off — toggle from home'}
          />
        </Section>

        <Section title="integrations" C={C}>
          <ActionRow
            C={C}
            label="share config"
            detail="export settings as QR code or JSON file"
            onPress={() => router.push('/share-config' as never)}
          />
          <Divider C={C} />
          <ActionRow
            C={C}
            label="import via QR"
            detail="scan a config QR to set urls & geofences"
            onPress={() => router.push('/qr-scan' as never)}
          />
          <Divider C={C} />
          <ActionRow
            C={C}
            label="connected services"
            detail="krl transit, hermes, api server"
            onPress={() => router.push('/integrations' as never)}
          />
          <Divider C={C} />
          <ActionRow
            C={C}
            label="web shortcuts"
            detail={`${shortcuts.length} shortcut${shortcuts.length !== 1 ? 's' : ''} saved`}
            onPress={() => router.push('/shortcuts')}
          />
        </Section>

        {Platform.OS === 'android' && (
          <Section title="android system" C={C}>
            <ActionRow
              C={C}
              label="location services"
              detail="gps, wi-fi, bluetooth scanning"
              onPress={() =>
                openAndroidSettings(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS)
              }
            />
            <Divider C={C} />
            <ActionRow
              C={C}
              label="notifications"
              detail="permissions, channels, behavior"
              onPress={() =>
                openAndroidSettings(IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS)
              }
            />
            <Divider C={C} />
            <ActionRow
              C={C}
              label="battery optimization"
              detail="background restrictions and saver"
              onPress={() =>
                openAndroidSettings(
                  IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
                )
              }
            />
            <Divider C={C} />
            <ActionRow
              C={C}
              label="app details"
              detail="permissions, storage, background"
              onPress={() =>
                openAndroidSettings(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS)
              }
            />
          </Section>
        )}

        <Section title="app" C={C}>
          <MetaRow C={C} label="name" value="commuter" />
          <Divider C={C} />
          <MetaRow C={C} label="version" value={updateInfo.appVersion} />
          <Divider C={C} />
          <Pressable
            onPress={() => void handleUpdatePress()}
            disabled={updateBusy}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed ? 0.75 : updateBusy ? 0.6 : 1,
            })}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: Radius.sm,
                backgroundColor: C.backgroundSelected,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {updateBusy ? (
                <ActivityIndicator size="small" color={C.textSecondary} />
              ) : (
                <RefreshCw size={16} color={C.text} strokeWidth={1.75} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text }}>
                check for updates
              </Text>
              <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>
                {updateStatusLabel(updateStatus)}
              </Text>
              {updateError ? (
                <Text style={{ fontSize: 11, fontFamily: MONO, color: C.destructive, marginTop: 2 }}>
                  {updateError}
                </Text>
              ) : null}
            </View>
            <ChevronRight size={16} color={C.textSecondary} strokeWidth={1.75} />
          </Pressable>
          <Divider C={C} />
          <MetaRow C={C} label="runtime" value={updateInfo.runtimeVersion ?? '—'} />
          <Divider C={C} />
          <MetaRow C={C} label="channel" value={updateInfo.channel ?? 'default'} />
          <Divider C={C} />
          <MetaRow C={C} label="update" value={shortUpdateId(updateInfo.updateId)} />
          {updateInfo.updatedAt ? (
            <>
              <Divider C={C} />
              <MetaRow C={C} label="updated" value={updateInfo.updatedAt} />
            </>
          ) : null}
        </Section>

        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, lineHeight: 18 }}>
          ota updates check on launch in release builds. local data lives in app-private sqlite.
        </Text>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  C,
}: {
  title: string;
  children: React.ReactNode;
  C: ThemeColors;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          fontFamily: MONO,
          color: C.textSecondary,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: C.hairline,
          borderRadius: Radius.sm,
          backgroundColor: C.backgroundElement,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Divider({ C }: { C: ThemeColors }) {
  return <View style={{ height: 1, backgroundColor: C.hairline }} />;
}

function StatusCard({
  C,
  tracking,
  geofenceCount,
  alertsOk,
}: {
  C: ThemeColors;
  tracking: boolean;
  geofenceCount: number;
  alertsOk: boolean;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: C.hairline,
        borderRadius: Radius.sm,
        backgroundColor: C.backgroundElement,
        padding: 16,
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', fontFamily: MONO, color: C.text }}>
        status
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <StatusPill
          C={C}
          label={tracking ? 'tracking on' : 'tracking off'}
          tone={tracking ? 'active' : 'neutral'}
        />
        <StatusPill C={C} label={`${geofenceCount} geofences`} tone="neutral" />
        <StatusPill
          C={C}
          label={alertsOk ? 'alerts ready' : 'alerts need setup'}
          tone={alertsOk ? 'active' : 'warn'}
        />
      </View>
    </View>
  );
}

function StatusPill({
  C,
  label,
  tone,
}: {
  C: ThemeColors;
  label: string;
  tone: 'active' | 'warn' | 'neutral';
}) {
  const color =
    tone === 'active' ? C.statusActive : tone === 'warn' ? C.statusInactive : C.textSecondary;
  const bg =
    tone === 'active'
      ? C.statusActiveSubtle
      : tone === 'warn'
        ? 'rgba(255,159,10,0.12)'
        : C.backgroundSelected;

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.sm,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: C.hairline,
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: MONO, color }}>{label}</Text>
    </View>
  );
}

function PermissionCard({
  C,
  needsNotifications,
  needsLocation,
  locationDenied,
  onRequestLocation,
}: {
  C: ThemeColors;
  needsNotifications: boolean;
  needsLocation: boolean;
  locationDenied: boolean;
  onRequestLocation: () => void;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: C.destructive,
        borderLeftWidth: 3,
        borderRadius: Radius.sm,
        backgroundColor: C.destructiveSubtle,
        padding: 16,
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', fontFamily: MONO, color: C.destructive }}>
        permissions needed
      </Text>
      {needsLocation ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.text, lineHeight: 17 }}>
            {locationDenied
              ? 'location denied — open system settings to allow always-on access.'
              : 'location access is needed for background stop detection.'}
          </Text>
          {!locationDenied && (
            <Pressable
              onPress={onRequestLocation}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: Radius.sm,
                backgroundColor: C.destructive,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', fontFamily: MONO, color: '#fff' }}>
                grant location
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
      {needsNotifications ? (
        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.text, lineHeight: 17 }}>
          enable notifications in system settings so geofence alerts can show.
        </Text>
      ) : null}
    </View>
  );
}

function ThemePicker({
  C,
  scheme,
  onChange,
}: {
  C: ThemeColors;
  scheme: ThemeScheme;
  onChange: (scheme: ThemeScheme) => void;
}) {
  return (
    <View style={{ padding: 12, gap: 10 }}>
      <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary }}>theme</Text>
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          padding: 4,
          borderRadius: Radius.sm,
          backgroundColor: C.background,
          borderWidth: 1,
          borderColor: C.hairline,
        }}
      >
        {(['dark', 'light'] as const).map((option) => {
          const selected = scheme === option;
          const Icon = option === 'dark' ? Moon : Sun;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 10,
                borderRadius: Radius.sm,
                backgroundColor: selected ? C.text : 'transparent',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Icon
                size={14}
                color={selected ? C.background : C.textSecondary}
                strokeWidth={1.75}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: selected ? '700' : '500',
                  fontFamily: MONO,
                  color: selected ? C.background : C.textSecondary,
                }}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ActionRow({
  C,
  label,
  detail,
  onPress,
}: {
  C: ThemeColors;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text }}>
          {label}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>{detail}</Text>
      </View>
      <ChevronRight size={16} color={C.textSecondary} strokeWidth={1.75} />
    </Pressable>
  );
}

function InfoBlock({
  C,
  label,
  detail,
}: {
  C: ThemeColors;
  label: string;
  detail: string;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 2 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text }}>
        {label}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>{detail}</Text>
    </View>
  );
}

function MetaRow({ C, label, value }: { C: ThemeColors; label: string; value: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 12, fontFamily: MONO, color: C.textSecondary }}>{label}</Text>
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: 12,
          fontWeight: '500',
          fontFamily: MONO,
          color: C.text,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
