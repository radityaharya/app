import type { HermesSession } from '@/types/hermes';
import { Pressable, Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

interface SessionRowProps {
  session: HermesSession;
  onPress: () => void;
  onLongPress?: () => void;
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

export function SessionRow({ session, onPress, onLongPress, C }: SessionRowProps) {
  const title = session.title?.trim() || 'untitled session';
  const time = formatRelativeTime(
    session.updated_at ?? session.created_at,
    session.last_active ?? session.started_at,
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
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
        <Text
          numberOfLines={1}
          style={{ fontSize: 15, fontWeight: '600', fontFamily: MONO, color: C.text }}
        >
          {title}
        </Text>
        {time ? (
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 3 }}>
            {time}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 16, fontFamily: MONO, color: C.textSecondary }}>›</Text>
    </Pressable>
  );
}
