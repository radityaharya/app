import { ChevronRight, MessageSquare } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { HermesSession } from '@/types/hermes';
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
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          backgroundColor: C.backgroundSelected,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <MessageSquare size={15} color={C.textSecondary} strokeWidth={1.5} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text }}
        >
          {title}
        </Text>
        {time ? (
          <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}>
            {time}
          </Text>
        ) : null}
      </View>

      <ChevronRight size={15} color={C.textSecondary} strokeWidth={1.5} />
    </Pressable>
  );
}
