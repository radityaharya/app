import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

interface BatteryTileProps {
  C: ThemeColors;
}

export function BatteryTile({ C }: BatteryTileProps) {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    let levelSub: Battery.Subscription | undefined;
    let stateSub: Battery.Subscription | undefined;

    (async () => {
      try {
        setLevel(await Battery.getBatteryLevelAsync());
        const state = await Battery.getBatteryStateAsync();
        setCharging(state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL);
        levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => setLevel(batteryLevel));
        stateSub = Battery.addBatteryStateListener(({ batteryState }) =>
          setCharging(
            batteryState === Battery.BatteryState.CHARGING ||
              batteryState === Battery.BatteryState.FULL,
          ),
        );
      } catch {
        // unavailable on web/simulator
      }
    })();

    return () => {
      levelSub?.remove();
      stateSub?.remove();
    };
  }, []);

  const pct = level != null ? Math.round(level * 100) : null;

  return (
    <View>
      <Text
        style={{
          fontSize: 32,
          fontWeight: '700',
          fontFamily: MONO,
          color: C.text,
          fontVariant: ['tabular-nums'],
          letterSpacing: -1,
        }}
      >
        {pct != null ? `${pct}%` : '—'}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 4 }}>
        {charging ? 'charging' : pct != null && pct <= 20 ? 'low battery' : 'battery level'}
      </Text>
    </View>
  );
}
