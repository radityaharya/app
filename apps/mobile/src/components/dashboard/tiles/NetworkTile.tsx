import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { TileHero, TileLine } from './TileLines';
import { type ThemeColors } from '@/components/tokens';

interface NetworkTileProps {
  C: ThemeColors;
}

function typeLabel(type: Network.NetworkStateType | undefined): string {
  switch (type) {
    case Network.NetworkStateType.WIFI:
      return 'wifi';
    case Network.NetworkStateType.CELLULAR:
      return 'cellular';
    case Network.NetworkStateType.ETHERNET:
      return 'ethernet';
    case Network.NetworkStateType.BLUETOOTH:
      return 'bluetooth';
    case Network.NetworkStateType.VPN:
      return 'vpn';
    case Network.NetworkStateType.WIMAX:
      return 'wimax';
    case Network.NetworkStateType.OTHER:
      return 'other';
    case Network.NetworkStateType.NONE:
      return 'none';
    case Network.NetworkStateType.UNKNOWN:
    default:
      return 'unknown';
  }
}

function reachabilityLabel(
  connected: boolean | undefined,
  reachable: boolean | undefined,
): string {
  if (!connected) return 'offline';
  if (reachable === false) return 'connected, no internet';
  if (reachable === true) return 'online';
  return 'connected';
}

export function NetworkTile({ C }: NetworkTileProps) {
  const network = Network.useNetworkState();
  const [ip, setIp] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Network.getIpAddressAsync()
      .then((address) => {
        if (!mounted) return;
        setIp(address && address !== '0.0.0.0' ? address : null);
      })
      .catch(() => {
        if (mounted) setIp(null);
      });

    return () => {
      mounted = false;
    };
  }, [network.type, network.isConnected]);

  const connected = network.isConnected ?? false;
  const type = typeLabel(network.type);
  const status = reachabilityLabel(network.isConnected, network.isInternetReachable);

  return (
    <View>
      <TileHero
        value={connected ? type : 'offline'}
        subtitle={status}
        C={C}
        tone={connected ? 'default' : 'danger'}
      />
      <TileLine label="link" value={type} C={C} />
      <TileLine
        label="internet"
        value={
          network.isInternetReachable == null
            ? 'checking…'
            : network.isInternetReachable
              ? 'reachable'
              : 'unreachable'
        }
        C={C}
      />
      <TileLine label="ipv4" value={ip ?? '—'} C={C} />
    </View>
  );
}
