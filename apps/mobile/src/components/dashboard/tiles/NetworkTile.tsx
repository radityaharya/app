import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

interface NetworkTileProps {
  C: ThemeColors;
}

export function NetworkTile({ C }: NetworkTileProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!mounted) return;
        setConnected(state.isConnected ?? false);
        setType(state.type ?? null);
      } catch {
        if (mounted) setConnected(null);
      }
    }

    poll();
    const id = setInterval(poll, 15_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const label =
    connected === null ? 'unknown' : connected ? (type ?? 'online') : 'offline';

  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          fontFamily: MONO,
          color: connected ? C.text : C.destructive,
          letterSpacing: -0.5,
          textTransform: 'lowercase',
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 4 }}>
        {connected ? 'network connected' : 'no connection'}
      </Text>
    </View>
  );
}
