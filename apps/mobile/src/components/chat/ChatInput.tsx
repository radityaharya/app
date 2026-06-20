import { Image } from 'expo-image';
import { Pressable, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  pendingImageUri?: string | null;
  onRemoveImage?: () => void;
  disabled?: boolean;
  bottomInset?: number;
  nativeID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  C: ThemeColors;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onAttach,
  pendingImageUri,
  onRemoveImage,
  disabled,
  bottomInset = 0,
  nativeID,
  onLayout,
  C,
}: ChatInputProps) {
  const canSend = (value.trim().length > 0 || Boolean(pendingImageUri)) && !disabled;

  return (
    <View
      onLayout={onLayout}
      style={{
        borderTopWidth: 1,
        borderTopColor: C.hairline,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(12, bottomInset),
        backgroundColor: C.background,
      }}
    >
      {pendingImageUri ? (
        <View style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
          <Image
            source={{ uri: pendingImageUri }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: C.hairline,
            }}
            contentFit="cover"
          />
          <Pressable
            onPress={onRemoveImage}
            hitSlop={8}
            style={({ pressed }) => ({
              position: 'absolute',
              top: -6,
              right: -6,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: C.text,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 12, fontFamily: MONO, color: C.background, lineHeight: 14 }}>
              ×
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {onAttach ? (
          <Pressable
            onPress={onAttach}
            disabled={disabled}
            hitSlop={8}
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: C.hairline,
              borderRadius: 4,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 18, fontFamily: MONO, color: C.textSecondary, lineHeight: 20 }}>
              +
            </Text>
          </Pressable>
        ) : null}

        <TextInput
          nativeID={nativeID}
          value={value}
          onChangeText={onChangeText}
          placeholder="message hermes…"
          placeholderTextColor={C.textSecondary}
          multiline
          editable={!disabled}
          style={{
            flex: 1,
            fontSize: 13,
            fontFamily: MONO,
            color: C.text,
            maxHeight: 120,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: C.hairline,
            borderRadius: 4,
          }}
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
          blurOnSubmit={false}
        />

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={({ pressed }) => ({
            backgroundColor: canSend ? C.text : C.backgroundSelected,
            borderRadius: 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              fontFamily: MONO,
              color: canSend ? C.background : C.textSecondary,
            }}
          >
            send
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
