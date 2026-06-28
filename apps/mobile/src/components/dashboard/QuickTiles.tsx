import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BatteryTile } from './tiles/BatteryTile';
import { DeviceTile } from './tiles/DeviceTile';
import { GeofencesTile } from './tiles/GeofencesTile';
import { LocationTile } from './tiles/LocationTile';
import { NetworkTile } from './tiles/NetworkTile';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useDashboardTiles } from '@/hooks/useDashboardTiles';
import type { DashboardTileId } from '@/lib/db';

const TILE_LABELS: Record<DashboardTileId, string> = {
  battery: 'battery',
  network: 'network',
  location: 'location',
  device: 'device',
  geofences: 'geofences',
};

interface QuickTilesProps {
  C: ThemeColors;
}

export function QuickTiles({ C }: QuickTilesProps) {
  const { tiles, available, addTile, removeTile } = useDashboardTiles();
  const [editing, setEditing] = useState(false);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            fontFamily: MONO,
            color: C.textSecondary,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          tiles
        </Text>
        <Pressable
          onPress={() => setEditing((v) => !v)}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.accent }}>
            {editing ? 'done' : 'edit'}
          </Text>
        </Pressable>
      </View>

      {tiles.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: C.hairline, padding: 16 }}>
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary, lineHeight: 20 }}>
            [-] no tiles. tap edit to add one.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {tiles.map((id) => (
            <View
              key={id}
              style={{
                borderWidth: 1,
                borderColor: C.hairline,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
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
                  {TILE_LABELS[id]}
                </Text>
                {editing && (
                  <Pressable
                    onPress={() => removeTile(id)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Text style={{ fontSize: 12, fontFamily: MONO, color: C.destructive }}>[x]</Text>
                  </Pressable>
                )}
              </View>
              <TileContent id={id} C={C} />
            </View>
          ))}
        </View>
      )}

      {editing && available.length > 0 && (
        <View style={{ marginTop: 12, gap: 6 }}>
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
            add tile
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {available.map((id) => (
              <Pressable
                key={id}
                onPress={() => addTile(id)}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: C.hairline,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 12, fontFamily: MONO, color: C.text }}>[+] {TILE_LABELS[id]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function TileContent({ id, C }: { id: DashboardTileId; C: ThemeColors }) {
  switch (id) {
    case 'battery':
      return <BatteryTile C={C} />;
    case 'network':
      return <NetworkTile C={C} />;
    case 'location':
      return <LocationTile C={C} />;
    case 'device':
      return <DeviceTile C={C} />;
    case 'geofences':
      return <GeofencesTile C={C} />;
  }
}
