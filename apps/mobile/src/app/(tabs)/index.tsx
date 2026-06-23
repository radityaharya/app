import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarSection } from '@/components/dashboard/CalendarSection';
import { ShortcutStrip } from '@/components/shortcuts/ShortcutStrip';
import { ClockHeader } from '@/components/dashboard/ClockHeader';
import { GeofenceToggle } from '@/components/dashboard/GeofenceToggle';
import { HermesSection } from '@/components/dashboard/HermesSection';
import { QuickTiles } from '@/components/dashboard/QuickTiles';
import { useThemeContext } from '@/context/ThemeContext';

export default function HomeScreen() {
  const { colors: C } = useThemeContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }}>
          <ClockHeader C={C} />
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <ShortcutStrip C={C} showEmpty />
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <CalendarSection C={C} />
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
