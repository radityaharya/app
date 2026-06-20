import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useMonitoredStations } from '@/hooks/useMonitoredStations';
import { useStations } from '@/hooks/useStations';
import { dbGetApiUrl, dbSetApiUrl, dbResetApiUrl, DEFAULT_API_URL } from '@/lib/db';
import { HermesIntegrationsBlock } from '@/components/hermes';

export default function IntegrationsScreen() {
  const { colors: C } = useThemeContext();
  const { stations } = useStations();
  const { monitored } = useMonitoredStations(stations);
  const [apiUrl, setApiUrl] = useState('');
  const [apiUrlDirty, setApiUrlDirty] = useState(false);
  const apiInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setApiUrl(dbGetApiUrl());
  }, []);

  function handleSaveApiUrl() {
    if (!apiUrl.trim()) return;
    Keyboard.dismiss();
    dbSetApiUrl(apiUrl);
    setApiUrlDirty(false);
    Alert.alert('Saved', 'API URL updated.');
  }

  function handleResetApiUrl() {
    Alert.alert('Reset API URL', `Reset to default:\n${DEFAULT_API_URL}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          dbResetApiUrl();
          setApiUrl(DEFAULT_API_URL);
          setApiUrlDirty(false);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
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
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            fontFamily: MONO,
            color: C.text,
            letterSpacing: -0.3,
          }}
        >
          integrations
        </Text>
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

      <ScrollView contentContainerStyle={{ paddingBottom: 64 }} showsVerticalScrollIndicator={false}>
        <SectionBlock label="krl / transit" C={C}>
          <NavRow
            label="trains"
            detail="schedules & departures"
            C={C}
            onPress={() => router.push('/trains')}
          />
          <InsetHairline C={C} />
          <NavRow
            label="monitored stations"
            detail={`${monitored.length} station${monitored.length !== 1 ? 's' : ''} for proximity alerts`}
            C={C}
            onPress={() => router.push('/stations')}
          />
        </SectionBlock>

        <FooterHint C={C}>
          krl data comes from the commuter api. stations with coordinates trigger alerts when tracking is active.
        </FooterHint>

        <Hairline C={C} />

        <SectionBlock label="api server" C={C}>
          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                fontFamily: MONO,
                color: C.textSecondary,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              base url
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
                ref={apiInputRef}
                value={apiUrl}
                onChangeText={(v) => {
                  setApiUrl(v);
                  setApiUrlDirty(true);
                }}
                placeholder="http://192.168.x.x:8080"
                placeholderTextColor={C.textSecondary}
                style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.text, padding: 0 }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleSaveApiUrl}
              />
              {apiUrlDirty && (
                <Pressable
                  onPress={handleSaveApiUrl}
                  style={({ pressed }) => ({
                    backgroundColor: C.text,
                    borderRadius: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      fontFamily: MONO,
                      color: C.background,
                    }}
                  >
                    save
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <InsetHairline C={C} />

          <Pressable
            onPress={handleResetApiUrl}
            style={({ pressed }) => ({
              paddingHorizontal: 20,
              paddingVertical: 14,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{ fontSize: 13, fontWeight: '500', fontFamily: MONO, color: C.destructive }}
            >
              reset to default
            </Text>
            <Text
              style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 2 }}
            >
              {DEFAULT_API_URL}
            </Text>
          </Pressable>
        </SectionBlock>

        <FooterHint C={C}>changes take effect on the next api call.</FooterHint>

        <Hairline C={C} />

        <SectionBlock label="hermes agent" C={C}>
          <NavRow
            label="hermes chat"
            detail="sessions & agent tools"
            C={C}
            onPress={() => router.push('/hermes')}
          />
          <InsetHairline C={C} />
          <HermesIntegrationsBlock C={C} />
        </SectionBlock>

        <FooterHint C={C}>
          api server (:8642) handles chat. dashboard (:9119) manages models and gateway.
        </FooterHint>
      </ScrollView>
    </SafeAreaView>
  );
}

function Hairline({ C }: { C: ThemeColors }) {
  return <View style={{ height: 1, backgroundColor: C.hairline }} />;
}

function InsetHairline({ C }: { C: ThemeColors }) {
  return <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: 20 }} />;
}

function FooterHint({ children, C }: { children: string; C: ThemeColors }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontFamily: MONO,
        color: C.textSecondary,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
        lineHeight: 18,
      }}
    >
      {children}
    </Text>
  );
}

function SectionBlock({
  label,
  children,
  C,
}: {
  label: string;
  children: React.ReactNode;
  C: ThemeColors;
}) {
  return (
    <View>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
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
          {label}
        </Text>
      </View>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.hairline }}>
        {children}
      </View>
    </View>
  );
}

function NavRow({
  label,
  detail,
  C,
  onPress,
}: {
  label: string;
  detail: string;
  C: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', fontFamily: MONO, color: C.text }}>
          {label}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 2 }}>
          {detail}
        </Text>
      </View>
      <Text style={{ fontSize: 16, fontFamily: MONO, color: C.textSecondary }}>›</Text>
    </TouchableOpacity>
  );
}
