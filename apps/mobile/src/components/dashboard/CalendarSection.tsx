import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useCalendarAgenda } from '@/hooks/useCalendarAgenda';

interface CalendarSectionProps {
  C: ThemeColors;
}

export function CalendarSection({ C }: CalendarSectionProps) {
  const { events, loading, unavailable, granted, canAskAgain, refresh, requestAccess } =
    useCalendarAgenda();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleEnableAccess() {
    const ok = await requestAccess();
    if (!ok && !canAskAgain && Platform.OS !== 'web') {
      Linking.openSettings();
    }
  }

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
          today
        </Text>
        {!unavailable && granted ? (
          <Pressable
            onPress={refresh}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.accent }}>refresh</Text>
          </Pressable>
        ) : null}
      </View>

      {unavailable ? (
        <View style={{ borderWidth: 1, borderColor: C.hairline, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary, lineHeight: 20 }}>
            calendar preview is available on device builds
          </Text>
        </View>
      ) : !granted ? (
        <Pressable
          onPress={handleEnableAccess}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 14,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text, lineHeight: 20 }}>
            enable calendar access
          </Text>
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 4 }}>
            show upcoming events from your device calendar
          </Text>
        </Pressable>
      ) : loading && events.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator color={C.textSecondary} />
        </View>
      ) : events.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: C.hairline, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary, lineHeight: 20 }}>
            no more events today
          </Text>
        </View>
      ) : (
        <View style={{ borderWidth: 1, borderColor: C.hairline }}>
          {events.map((event, i) => (
            <View key={event.id}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: C.hairline }} /> : null}
              <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: MONO,
                      color: C.accent,
                      fontVariant: ['tabular-nums'],
                      minWidth: 52,
                    }}
                  >
                    {event.timeLabel}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: '600',
                      fontFamily: MONO,
                      color: C.text,
                    }}
                  >
                    {event.title}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
