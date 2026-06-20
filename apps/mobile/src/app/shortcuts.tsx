/**
 * Shortcuts management page.
 * Add / remove web and app shortcuts. Presented as a modal from settings.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { MONO } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useShortcuts } from '@/hooks/useShortcuts';
import { labelFromUrl } from '@/lib/favicon';
import type { ShortcutType } from '@/lib/db';

type AddMode = 'web' | 'app';

export default function ShortcutsScreen() {
  const { colors: C } = useThemeContext();
  const { shortcuts, addWeb, addApp, remove } = useShortcuts();
  const [mode, setMode] = useState<AddMode>('web');
  const [input, setInput] = useState('');
  const [appLabel, setAppLabel] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (adding) return;

    if (mode === 'web') {
      const url = input.trim();
      if (!url) return;
      Keyboard.dismiss();
      setAdding(true);
      setInput('');
      await addWeb(url);
      setAdding(false);
    } else {
      const uri = input.trim();
      const label = appLabel.trim();
      if (!uri || !label) return;
      Keyboard.dismiss();
      addApp(uri, label);
      setInput('');
      setAppLabel('');
    }
  }

  function handleRemove(url: string) {
    const label = shortcuts.find((s) => s.url === url)?.label ?? url;
    Alert.alert('Remove shortcut', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(url) },
    ]);
  }

  const canAdd = mode === 'web'
    ? input.trim().length > 0
    : input.trim().length > 0 && appLabel.trim().length > 0;

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
            shortcuts
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
            {shortcuts.length} saved
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

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Mode toggle ── */}
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <ModeChip label="web" active={mode === 'web'} onPress={() => setMode('web')} C={C} />
          <ModeChip label="app" active={mode === 'app'} onPress={() => setMode('app')} C={C} />
        </View>

        {/* ── Add form ── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              fontFamily: MONO,
              color: C.textSecondary,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            {mode === 'web' ? 'url' : 'deep link / scheme'}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: C.hairline,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={mode === 'web' ? 'https://example.com' : 'twitter:// or maps://'}
              placeholderTextColor={C.textSecondary}
              style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.text, padding: 0 }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType={mode === 'web' ? 'done' : 'next'}
              onSubmitEditing={mode === 'web' ? handleAdd : undefined}
            />
          </View>

          {/* App label field (only for app mode) */}
          {mode === 'app' && (
            <>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  fontFamily: MONO,
                  color: C.textSecondary,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginTop: 4,
                  marginBottom: 2,
                }}
              >
                label
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderWidth: 1,
                  borderColor: C.hairline,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <TextInput
                  value={appLabel}
                  onChangeText={setAppLabel}
                  placeholder="Twitter"
                  placeholderTextColor={C.textSecondary}
                  style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.text, padding: 0 }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
              </View>
            </>
          )}

          {/* Add button */}
          {(canAdd || adding) && (
            <Pressable
              onPress={handleAdd}
              disabled={adding}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                marginTop: 4,
                backgroundColor: adding ? C.backgroundSelected : C.text,
                borderRadius: 4,
                paddingHorizontal: 14,
                paddingVertical: 7,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  fontFamily: MONO,
                  color: adding ? C.textSecondary : C.background,
                }}
              >
                {adding ? 'saving…' : 'add'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: C.hairline }} />

        {/* ── Shortcut list ── */}
        {shortcuts.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 13,
                fontFamily: MONO,
                color: C.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              [-] no shortcuts saved.{'\n'}add a web url or app link above.
            </Text>
          </View>
        ) : (
          shortcuts.map((s, i) => (
            <View key={s.url}>
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
                  paddingVertical: 12,
                  gap: 14,
                }}
              >
                {s.favicon ? (
                  <Image
                    source={{ uri: s.favicon }}
                    style={{ width: 24, height: 24, borderRadius: 4 }}
                    contentFit="contain"
                  />
                ) : (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: C.hairline,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: MONO,
                        color: C.textSecondary,
                        fontWeight: '700',
                      }}
                    >
                      {s.label.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        fontFamily: MONO,
                        color: C.text,
                      }}
                      numberOfLines={1}
                    >
                      {s.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 9,
                        fontFamily: MONO,
                        color: C.textSecondary,
                        letterSpacing: 0.4,
                      }}
                    >
                      {s.type}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: MONO,
                      color: C.textSecondary,
                      marginTop: 1,
                      letterSpacing: 0.2,
                    }}
                    numberOfLines={1}
                  >
                    {s.url}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleRemove(s.url)}
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
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModeChip({
  label,
  active,
  onPress,
  C,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  C: ReturnType<typeof useThemeContext>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: active ? C.text : 'transparent',
        borderWidth: 1,
        borderColor: active ? C.text : C.hairline,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: active ? '700' : '400',
          fontFamily: MONO,
          color: active ? C.background : C.textSecondary,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
