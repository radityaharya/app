/**
 * ShortcutStrip — horizontal row of shortcuts for the home screen.
 * Web shortcuts open the in-app browser. App shortcuts launch via Linking.
 */
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useShortcuts } from '@/hooks/useShortcuts';
import type { Shortcut } from '@/lib/db';

interface ShortcutStripProps {
  C: ThemeColors;
  /** When true, show an empty-state row linking to shortcut management. */
  showEmpty?: boolean;
}

async function openShortcut(s: Shortcut) {
  if (s.type === 'web') {
    router.push({ pathname: '/browser', params: { url: s.url } });
    return;
  }

  // App shortcut — try to open via deep link
  const supported = await Linking.canOpenURL(s.url);
  if (supported) {
    await Linking.openURL(s.url);
  } else {
    Alert.alert('Cannot open', `"${s.label}" is not installed or the link is invalid.`);
  }
}

export function ShortcutStrip({ C, showEmpty }: ShortcutStripProps) {
  const { shortcuts } = useShortcuts();

  if (shortcuts.length === 0 && !showEmpty) return null;

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
          shortcuts
        </Text>
        {shortcuts.length > 0 && (
          <Pressable
            onPress={() => router.push('/shortcuts')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.accent }}>edit</Text>
          </Pressable>
        )}
      </View>

      {shortcuts.length === 0 ? (
        <Pressable
          onPress={() => router.push('/shortcuts')}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 14,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary }}>
            [+] add shortcuts in tools
          </Text>
        </Pressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, flexDirection: 'row' }}
        >
          {shortcuts.map((s) => (
            <Pressable
              key={s.url}
              onPress={() => openShortcut(s)}
              style={({ pressed }) => ({
                alignItems: 'center',
                gap: 6,
                opacity: pressed ? 0.6 : 1,
                width: 56,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: C.hairline,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {s.favicon ? (
                  <Image
                    source={{ uri: s.favicon }}
                    style={{ width: 24, height: 24 }}
                    contentFit="contain"
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: MONO,
                      color: C.textSecondary,
                      fontWeight: '700',
                    }}
                  >
                    {s.label.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: MONO,
                  color: C.textSecondary,
                  letterSpacing: 0.1,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
