import { Pressable, Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

interface ConnectionBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  C: ThemeColors;
}

export function ConnectionBanner({ message, actionLabel, onAction, C }: ConnectionBannerProps) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: C.hairline,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.textSecondary, lineHeight: 18 }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: C.hairline,
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', fontFamily: MONO, color: C.text }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  detail?: string;
  C: ThemeColors;
}

export function EmptyState({ title, detail, C }: EmptyStateProps) {
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 48, alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text }}>
        {title}
      </Text>
      {detail ? (
        <Text
          style={{
            fontSize: 12,
            fontFamily: MONO,
            color: C.textSecondary,
            marginTop: 8,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
