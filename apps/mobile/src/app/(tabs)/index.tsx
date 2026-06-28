import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarSection } from '@/components/dashboard/CalendarSection';
import { ClockHeader } from '@/components/dashboard/ClockHeader';
import { GeofenceToggle } from '@/components/dashboard/GeofenceToggle';
import { HermesSection } from '@/components/dashboard/HermesSection';
import { QuickTiles } from '@/components/dashboard/QuickTiles';
import { TrainsTile } from '@/components/dashboard/tiles/TrainsTile';
import { useThemeContext } from '@/context/ThemeContext';

export default function HomeScreen() {
  const { colors: C } = useThemeContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }}>
          <ClockHeader C={C} />
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        {/* Schedule + Trains two-column row */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 20,
            paddingVertical: 20,
            gap: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: C.hairline,
              padding: 14,
            }}
          >
            <CalendarSection C={C} />
          </View>
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: C.hairline,
              padding: 14,
            }}
          >
            <TrainsTile C={C} />
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <HermesSection C={C} />
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <GeofenceToggle C={C} />
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <QuickTiles C={C} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
