import type { HermesSession } from '@/types/hermes';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useHermesConnection } from '@/hooks/useHermesConnection';
import { useHermesDashboard } from '@/hooks/useHermesDashboard';
import { useHermesSessions } from '@/hooks/useHermesSessions';

const PREVIEW_LIMIT = 3;

interface HermesSectionProps {
  C: ThemeColors;
}

function formatRelativeTime(iso?: string, epoch?: number): string {
  const date = iso ? new Date(iso) : epoch ? new Date(epoch * 1000) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function sortSessions(sessions: HermesSession[]): HermesSession[] {
  return [...sessions].sort(
    (a, b) =>
      (b.last_active ?? b.started_at ?? 0) - (a.last_active ?? a.started_at ?? 0),
  );
}

export function HermesSection({ C }: HermesSectionProps) {
  const { sessions, loading, configured, refresh, createSession } = useHermesSessions();
  const { connected, checking, refresh: checkConnection } = useHermesConnection();
  const { mainModelLabel, refresh: refreshDashboard } = useHermesDashboard();

  useFocusEffect(
    useCallback(() => {
      refresh();
      checkConnection();
      refreshDashboard();
    }, [refresh, checkConnection, refreshDashboard]),
  );

  const previews = useMemo(() => sortSessions(sessions).slice(0, PREVIEW_LIMIT), [sessions]);

  async function handleNewChat() {
    if (!configured) {
      router.push('/integrations');
      return;
    }
    try {
      const session = await createSession();
      router.push(`/hermes/${session.id}` as never);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create session');
    }
  }

  const statusDot = checking ? C.textSecondary : connected ? C.statusActive : C.destructive;

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusDot }} />
          <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: '600', color: C.text }}>
            hermes
          </Text>
          {mainModelLabel ? (
            <Text style={{ fontFamily: MONO, fontSize: 11, color: C.textSecondary }}>
              · {mainModelLabel}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push('/hermes')}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontFamily: MONO, fontSize: 11, color: C.accent }}>view all →</Text>
        </Pressable>
      </View>

      {/* Body */}
      {!configured ? (
        <Pressable
          onPress={() => router.push('/integrations')}
          style={({ pressed }) => ({
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 16,
            opacity: pressed ? 0.7 : 1,
            gap: 4,
          })}
        >
          <Text style={{ fontFamily: MONO, fontSize: 13, color: C.text }}>
            connect hermes
          </Text>
          <Text style={{ fontFamily: MONO, fontSize: 11, color: C.textSecondary }}>
            set url + api key in integrations →
          </Text>
        </Pressable>
      ) : loading && previews.length === 0 ? (
        <ActivityIndicator color={C.textSecondary} style={{ alignSelf: 'flex-start' }} />
      ) : previews.length === 0 ? (
        <Pressable
          onPress={handleNewChat}
          style={({ pressed }) => ({
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 16,
            opacity: pressed ? 0.7 : 1,
            gap: 4,
          })}
        >
          <Text style={{ fontFamily: MONO, fontSize: 13, color: C.text }}>start a chat</Text>
          <Text style={{ fontFamily: MONO, fontSize: 11, color: C.textSecondary }}>
            no sessions yet
          </Text>
        </Pressable>
      ) : (
        <View style={{ gap: 2 }}>
          {previews.map((session) => (
            <SessionPreview
              key={session.id}
              session={session}
              C={C}
              onPress={() => router.push(`/hermes/${session.id}` as never)}
            />
          ))}
        </View>
      )}

      {/* New chat */}
      {configured ? (
        <Pressable
          onPress={handleNewChat}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            opacity: pressed ? 0.5 : 1,
          })}
          hitSlop={8}
        >
          <Text style={{ fontFamily: MONO, fontSize: 12, color: C.accent }}>+ new chat</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SessionPreview({
  session,
  C,
  onPress,
}: {
  session: HermesSession;
  C: ThemeColors;
  onPress: () => void;
}) {
  const title = session.title?.trim() || 'untitled';
  const preview = session.preview?.trim();
  const time = formatRelativeTime(
    session.updated_at ?? session.created_at,
    session.last_active ?? session.started_at,
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: C.hairline,
        opacity: pressed ? 0.65 : 1,
        gap: 3,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: MONO, fontSize: 13, fontWeight: '600', color: C.text }}
        >
          {title}
        </Text>
        {time ? (
          <Text style={{ fontFamily: MONO, fontSize: 10, color: C.textSecondary }}>{time}</Text>
        ) : null}
      </View>
      {preview ? (
        <Text
          numberOfLines={1}
          style={{ fontFamily: MONO, fontSize: 11, color: C.textSecondary, lineHeight: 16 }}
        >
          {preview}
        </Text>
      ) : null}
    </Pressable>
  );
}
