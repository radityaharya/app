/**
 * Monitored stations management page.
 *
 * Add / remove stations used for proximity alerts.
 * Presented as a modal from settings.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationPickerModal } from '@/components/StationPickerModal';
import { MONO } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useMonitoredStations } from '@/hooks/useMonitoredStations';
import { useStations } from '@/hooks/useStations';

export default function StationsScreen() {
  const { colors: C } = useThemeContext();
  const { stations } = useStations();
  const { monitored, add, remove } = useMonitoredStations(stations);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: C.hairline,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              fontFamily: MONO,
              color: C.text,
              letterSpacing: -0.3,
            }}
          >
            monitored stations
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: MONO,
              color: C.textSecondary,
              marginTop: 2,
              letterSpacing: 0.2,
            }}
          >
            {monitored.length} station{monitored.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            borderWidth: 1,
            borderColor: C.hairline,
            borderRadius: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', fontFamily: MONO, color: C.text }}>
            done
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ── Station list ── */}
        {monitored.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center', gap: 14 }}>
            <Text
              style={{
                fontSize: 13,
                fontFamily: MONO,
                color: C.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              [-] no stations monitored.{'\n'}add one to enable proximity alerts.
            </Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
                backgroundColor: C.text,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  fontFamily: MONO,
                  color: C.background,
                }}
              >
                add station
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ borderBottomWidth: 1, borderBottomColor: C.hairline }}>
            {monitored.map((m, i) => (
              <View key={m.id}>
                {i > 0 && (
                  <View
                    style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: 20 }}
                  />
                )}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    gap: 14,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 4 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        fontFamily: MONO,
                        color: C.text,
                      }}
                    >
                      {m.name.replace(/\bSTASIUN\b/g, '').trim().toLowerCase()}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: MONO,
                        color: C.textSecondary,
                        marginTop: 2,
                        fontVariant: ['tabular-nums'],
                        letterSpacing: 0.2,
                      }}
                    >
                      {m.id} · {m.coords.radiusMetres}m radius
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => remove(m.id)}
                    hitSlop={10}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        fontFamily: MONO,
                        color: C.destructive,
                      }}
                    >
                      [x]
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Add button (when list is non-empty) ── */}
        {monitored.length > 0 && (
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => ({
              paddingHorizontal: 20,
              paddingVertical: 14,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                fontFamily: MONO,
                color: C.accent,
              }}
            >
              [+] add station
            </Text>
          </Pressable>
        )}

        {/* ── Hint ── */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: MONO,
            color: C.textSecondary,
            paddingHorizontal: 20,
            paddingTop: 8,
            lineHeight: 18,
          }}
        >
          only stations with known coordinates can trigger proximity alerts.
        </Text>
      </ScrollView>

      <StationPickerModal
        visible={pickerOpen}
        stations={stations}
        selectedIds={new Set(monitored.map((m) => m.id))}
        coordsOnly
        title="add monitored station"
        onSelect={async (station) => {
          await add(station);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
