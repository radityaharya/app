/**
 * In-app browser — opens a URL in a WebView modal.
 * Receives the URL via route params.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { MONO } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { labelFromUrl } from '@/lib/favicon';

export default function BrowserScreen() {
  const { colors: C } = useThemeContext();
  const { url } = useLocalSearchParams<{ url: string }>();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');

  const displayUrl = url ? labelFromUrl(url) : '';
  const displayTitle = title || displayUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.hairline,
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              fontFamily: MONO,
              color: C.text,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
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
            {displayUrl}
          </Text>
        </View>

        {loading && <ActivityIndicator size="small" color={C.textSecondary} />}

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

      {/* ── WebView ── */}
      {url ? (
        <WebView
          ref={webRef}
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: C.background }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={(e) => {
            setLoading(false);
            if ('title' in e.nativeEvent) {
              setTitle((e.nativeEvent as { title?: string }).title ?? '');
            }
          }}
          allowsBackForwardNavigationGestures
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary }}>
            [-] no url provided.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
