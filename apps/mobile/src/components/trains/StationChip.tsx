import { Pressable, Text } from 'react-native';

import { MONO } from '@/components/tokens';
import type { ThemeColors } from '@/components/tokens';

interface StationChipProps {
  name: string;
  active: boolean;
  onPress: () => void;
  C: ThemeColors;
}

export function StationChip({ name, active, onPress, C }: StationChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginRight: 6,
        backgroundColor: active ? C.text : 'transparent',
        borderWidth: 1,
        borderColor: active ? C.text : C.hairline,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: active ? '700' : '400',
          fontFamily: MONO,
          color: active ? C.background : C.textSecondary,
          letterSpacing: 0.3,
        }}
      >
        {name.replace(/\bSTASIUN\b/g, '').trim()}
      </Text>
    </Pressable>
  );
}
