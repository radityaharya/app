import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform, View } from 'react-native';

import { TileHero, TileLine } from './TileLines';
import { type ThemeColors } from '@/components/tokens';

interface DeviceTileProps {
  C: ThemeColors;
}

function formatMemory(bytes: number | null): string {
  if (bytes == null) return '—';
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} gb ram` : `${Math.round(bytes / 1024 ** 2)} mb ram`;
}

export function DeviceTile({ C }: DeviceTileProps) {
  const model = Device.modelName ?? Device.deviceName ?? 'unknown device';
  const os = `${Platform.OS} ${Device.osVersion ?? ''}`.trim();
  const appVersion = Application.nativeApplicationVersion ?? '—';
  const build = Application.nativeBuildVersion;

  return (
    <View>
      <TileHero value={model} subtitle={os} C={C} />
      <TileLine label="device" value={Device.isDevice ? 'physical' : 'simulator'} C={C} />
      <TileLine label="app" value={build ? `v${appVersion} (${build})` : `v${appVersion}`} C={C} />
      <TileLine label="memory" value={formatMemory(Device.totalMemory)} C={C} />
      {Device.brand ? <TileLine label="brand" value={Device.brand} C={C} /> : null}
    </View>
  );
}
