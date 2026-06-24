import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeft, PenLine, Wifi, WifiOff } from 'lucide-react-native';

import { ConnectionBanner, EmptyState } from '@/components/chat/ConnectionBanner';
import { SessionRow } from '@/components/chat/SessionRow';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useHermesConnection } from '@/hooks/useHermesConnection';
import { useHermesSessions } from '@/hooks/useHermesSessions';

export default function HermesSessionsScreen() {
  const { colors: C } = useThemeContext();
  const { connected, checking, refresh: checkConnection } = useHermesConnection();
  const {
    sessions,
    loading,
    error,
    configured,
    refresh,
    createSession,
    deleteSession,
    renameSession,
  } = useHermesSessions();
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  async function handleNewChat() {
    if (!configured) {
      router.push('/integrations');
      return;
    }
    setCreating(true);
    try {
      const session = await createSession();
      router.push(`/hermes/${session.id}` as never);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

  function handleSessionLongPress(id: string, title: string) {
    Alert.alert(title, undefined, [
      {
        text: 'rename',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Alert.prompt(
              'Rename session',
              undefined,
              async (newTitle) => {
                if (!newTitle?.trim()) return;
                try {
                  await renameSession(id, newTitle.trim());
                } catch (e) {
                  Alert.alert('Error', e instanceof Error ? e.message : 'Rename failed');
                }
              },
              'plain-text',
              title,
            );
          } else {
            setRenameTarget({ id, title });
            setRenameValue(title);
          }
        },
      },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete session', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteSession(id);
                } catch (e) {
                  Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const showBanner = !checking && (connected === false || !configured);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <Header
        C={C}
        connected={connected}
        checking={checking}
        onBack={() => router.back()}
        onNew={handleNewChat}
        creating={creating}
      />

      {showBanner ? (
        <ConnectionBanner
          C={C}
          message={
            !configured
              ? 'configure hermes url and api key in integrations.'
              : 'cannot reach hermes gateway — check url and network.'
          }
          actionLabel="integrations"
          onAction={() => router.push('/integrations')}
        />
      ) : null}

      {error ? (
        <ConnectionBanner C={C} message={error} actionLabel="retry" onAction={refresh} />
      ) : null}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 64 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              refresh();
              checkConnection();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && sessions.length === 0 ? (
          <View style={{ paddingTop: 48, alignItems: 'center' }}>
            <ActivityIndicator color={C.textSecondary} />
          </View>
        ) : sessions.length === 0 ? (
          <EmptyState
            C={C}
            title="no sessions yet"
            detail="start a new chat to talk with hermes agent."
          />
        ) : (
          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.hairline }}>
            {sessions.map((session, i) => (
              <View key={session.id}>
                {i > 0 ? (
                  <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: 20 }} />
                ) : null}
                <SessionRow
                  session={session}
                  C={C}
                  onPress={() => router.push(`/hermes/${session.id}` as never)}
                  onLongPress={() =>
                    handleSessionLongPress(session.id, session.title ?? 'untitled session')
                  }
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renameTarget ? (
        <RenameModal
          C={C}
          value={renameValue}
          onChange={setRenameValue}
          onCancel={() => setRenameTarget(null)}
          onSave={async () => {
            const trimmed = renameValue.trim();
            if (!trimmed || !renameTarget) return;
            try {
              await renameSession(renameTarget.id, trimmed);
              setRenameTarget(null);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Rename failed');
            }
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Header({
  C,
  connected,
  checking,
  onBack,
  onNew,
  creating,
}: {
  C: ThemeColors;
  connected: boolean | null;
  checking: boolean;
  onBack: () => void;
  onNew: () => void;
  creating: boolean;
}) {
  const StatusIcon = connected ? Wifi : WifiOff;
  const statusColor = checking ? C.textSecondary : connected ? C.statusActive : C.destructive;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.hairline,
        gap: 8,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.backgroundSelected,
          opacity: pressed ? 0.6 : 1,
          flexShrink: 0,
        })}
      >
        <ArrowLeft size={17} color={C.text} strokeWidth={1.75} />
      </Pressable>

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <StatusIcon size={13} color={statusColor} strokeWidth={1.75} />
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            fontFamily: MONO,
            color: C.text,
            letterSpacing: -0.3,
          }}
        >
          hermes
        </Text>
      </View>

      <Pressable
        onPress={onNew}
        disabled={creating}
        hitSlop={12}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.backgroundSelected,
          opacity: pressed || creating ? 0.6 : 1,
          flexShrink: 0,
        })}
      >
        {creating ? (
          <ActivityIndicator size="small" color={C.text} />
        ) : (
          <PenLine size={16} color={C.text} strokeWidth={1.75} />
        )}
      </Pressable>
    </View>
  );
}

function RenameModal({
  C,
  value,
  onChange,
  onCancel,
  onSave,
}: {
  C: ThemeColors;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          backgroundColor: C.background,
          borderWidth: 1,
          borderColor: C.hairline,
          borderRadius: 4,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', fontFamily: MONO, color: C.text }}>
          rename session
        </Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          autoFocus
          style={{
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 13,
            fontFamily: MONO,
            color: C.text,
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
          <Pressable onPress={onCancel}>
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary }}>cancel</Text>
          </Pressable>
          <Pressable onPress={onSave}>
            <Text style={{ fontSize: 13, fontWeight: '600', fontFamily: MONO, color: C.text }}>
              save
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
