import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { TileBar, TileHero, TileLine } from './TileLines';
import { type ThemeColors } from '@/components/tokens';

interface BatteryTileProps {
  C: ThemeColors;
}

function batteryStateLabel(state: Battery.BatteryState | null): string {
  switch (state) {
    case Battery.BatteryState.CHARGING:
      return 'charging';
    case Battery.BatteryState.FULL:
      return 'full';
    case Battery.BatteryState.UNPLUGGED:
      return 'on battery';
    case Battery.BatteryState.NOT_CHARGING:
      return 'plugged, idle';
    case Battery.BatteryState.UNKNOWN:
      return 'unknown';
    default:
      return '—';
  }
}

export function BatteryTile({ C }: BatteryTileProps) {
  const power = Battery.usePowerState();
  const [optimized, setOptimized] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Battery.isBatteryOptimizationEnabledAsync()
      .then(setOptimized)
      .catch(() => setOptimized(null));
  }, []);

  const level = power.batteryLevel >= 0 ? power.batteryLevel : null;
  const pct = level != null ? Math.round(level * 100) : null;
  const lowPower = power.lowPowerMode;
  const state = power.batteryState;

  const heroTone =
    pct != null && pct <= 15 ? 'danger' : pct != null && pct <= 30 ? 'warn' : 'default';

  return (
    <View>
      <TileHero
        value={pct != null ? `${pct}%` : '—'}
        subtitle={batteryStateLabel(state)}
        C={C}
        tone={heroTone}
      />
      <TileBar pct={pct} C={C} />
      <TileLine label="state" value={batteryStateLabel(state)} C={C} />
      <TileLine
        label="low power"
        value={lowPower ? 'on' : 'off'}
        C={C}
      />
      {Platform.OS === 'android' && optimized != null ? (
        <TileLine
          label="optimization"
          value={optimized ? 'enabled (may limit bg)' : 'disabled'}
          C={C}
        />
      ) : null}
    </View>
  );
}
