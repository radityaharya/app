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
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

  const statusColor = checking
    ? C.textSecondary
    : connected
      ? C.statusActive
      : C.destructive;

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: statusColor,
            }}
          />
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
            hermes
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.push('/integrations')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.accent }}>setup</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/hermes')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.accent }}>all</Text>
          </Pressable>
        </View>
      </View>

      {mainModelLabel ? (
        <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginBottom: 10 }}>
          main: {mainModelLabel}
        </Text>
      ) : null}

      {!configured ? (
        <Pressable
          onPress={() => router.push('/integrations')}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 14,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text, lineHeight: 20 }}>
            connect hermes agent
          </Text>
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 4 }}>
            set url and api key in integrations
          </Text>
        </Pressable>
      ) : loading && previews.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator color={C.textSecondary} />
        </View>
      ) : previews.length === 0 ? (
        <Pressable
          onPress={handleNewChat}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 14,
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.text }}>start a chat</Text>
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 4 }}>
            no sessions yet — tap to open hermes
          </Text>
        </Pressable>
      ) : (
        <View style={{ borderWidth: 1, borderColor: C.hairline }}>
          {previews.map((session, i) => (
            <View key={session.id}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: C.hairline }} /> : null}
              <SessionPreview
                session={session}
                C={C}
                onPress={() => router.push(`/hermes/${session.id}` as never)}
              />
            </View>
          ))}
        </View>
      )}

      {configured ? (
        <Pressable
          onPress={handleNewChat}
          style={({ pressed }) => ({
            marginTop: 10,
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', fontFamily: MONO, color: C.text }}>
            + new chat
          </Text>
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
  const title = session.title?.trim() || 'untitled session';
  const preview = session.preview?.trim();
  const time = formatRelativeTime(
    session.updated_at ?? session.created_at,
    session.last_active ?? session.started_at,
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.text }}
          >
            {title}
          </Text>
          {preview ? (
            <Text
              numberOfLines={2}
              style={{
                fontSize: 11,
                fontFamily: MONO,
                color: C.textSecondary,
                marginTop: 4,
                lineHeight: 16,
              }}
            >
              {preview}
            </Text>
          ) : null}
        </View>
        {time ? (
          <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary }}>{time}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
