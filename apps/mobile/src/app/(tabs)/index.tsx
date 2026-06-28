import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarSection } from '@/components/dashboard/CalendarSection';
import { ClockHeader } from '@/components/dashboard/ClockHeader';
import { GeofenceToggle } from '@/components/dashboard/GeofenceToggle';
import { HermesSection } from '@/components/dashboard/HermesSection';
import { QuickTiles } from '@/components/dashboard/QuickTiles';
import { TrainsTile } from '@/components/dashboard/tiles/TrainsTile';
import { MONO } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';

function Divider({ C }: { C: { hairline: string } }) {
  return <View style={{ height: 1, backgroundColor: C.hairline }} />;
}

export default function HomeScreen() {
  const { colors: C } = useThemeContext();
  const [tilesOpen, setTilesOpen] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Clock — compact single line */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
          <ClockHeader C={C} compact />
        </View>

        <Divider C={C} />

        {/* Trains — full-width, priority #1 */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <TrainsTile C={C} />
        </View>

        <Divider C={C} />

        {/* Hermes — priority #2 */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <HermesSection C={C} />
        </View>

        <Divider C={C} />

        {/* Calendar — priority #3, full-width */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <CalendarSection C={C} />
        </View>

        <Divider C={C} />

        {/* Geofence toggle */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <GeofenceToggle C={C} />
        </View>

        <Divider C={C} />

        {/* System tiles — collapsed by default */}
        <Pressable
          onPress={() => setTilesOpen((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontFamily: MONO, fontSize: 12, color: C.textSecondary }}>
            {tilesOpen ? '▾' : '▸'} system info
          </Text>
          <Text style={{ fontFamily: MONO, fontSize: 11, color: C.textSecondary }}>
            {tilesOpen ? 'collapse' : 'expand'}
          </Text>
        </Pressable>

        {tilesOpen && (
          <>
            <Divider C={C} />
            <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
              <QuickTiles C={C} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
