import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';

interface ToolCard {
  id: string;
  title: string;
  detail: string;
  route: string;
}

const TOOLS: ToolCard[] = [
  {
    id: 'trains',
    title: 'krl trains',
    detail: 'schedules & station alerts',
    route: '/trains',
  },
  {
    id: 'geofences',
    title: 'geofences',
    detail: 'location-based triggers',
    route: '/geofences',
  },
  {
    id: 'shortcuts',
    title: 'web shortcuts',
    detail: 'quick links & app launchers',
    route: '/shortcuts',
  },
  {
    id: 'hermes',
    title: 'hermes',
    detail: 'ai agent chat',
    route: '/hermes',
  },
];

export default function ToolsScreen() {
  const { colors: C } = useThemeContext();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 64 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              fontFamily: MONO,
              color: C.text,
              letterSpacing: -0.5,
            }}
          >
            tools
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: MONO,
              color: C.textSecondary,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            features live here — not on the home screen.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        <View style={{ borderBottomWidth: 1, borderBottomColor: C.hairline }}>
          {TOOLS.map((tool, i) => (
            <View key={tool.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: 20 }} />}
              <ToolRow tool={tool} C={C} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolRow({ tool, C }: { tool: ToolCard; C: ThemeColors }) {
  return (
    <Pressable
      onPress={() => router.push(tool.route as never)}
      style={({ pressed }) => ({
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', fontFamily: MONO, color: C.text }}>
          {tool.title}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 3 }}>
          {tool.detail}
        </Text>
      </View>
      <Text style={{ fontSize: 16, fontFamily: MONO, color: C.textSecondary }}>›</Text>
    </Pressable>
  );
}
