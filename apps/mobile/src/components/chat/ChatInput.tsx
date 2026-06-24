import { Image } from 'expo-image';
import { ArrowUp, Paperclip, X } from 'lucide-react-native';
import { Pressable, TextInput, View, type LayoutChangeEvent } from 'react-native';

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
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: Math.max(10, bottomInset),
        backgroundColor: C.background,
        borderTopWidth: 1,
        borderTopColor: C.hairline,
      }}
    >
      {pendingImageUri ? (
        <View style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
          <Image
            source={{ uri: pendingImageUri }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 10,
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
            <X size={11} color={C.background} strokeWidth={2.5} />
          </Pressable>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          backgroundColor: C.backgroundElement,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: C.hairline,
          paddingHorizontal: 4,
          paddingVertical: 4,
        }}
      >
        {onAttach ? (
          <Pressable
            onPress={onAttach}
            disabled={disabled}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
            })}
          >
            <Paperclip size={17} color={C.textSecondary} strokeWidth={1.75} />
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
            fontSize: 14,
            fontFamily: MONO,
            color: C.text,
            maxHeight: 120,
            paddingVertical: 6,
            paddingHorizontal: onAttach ? 0 : 12,
            lineHeight: 20,
          }}
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
          blurOnSubmit={false}
        />

        <Pressable
          onPress={canSend ? onSend : undefined}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: canSend ? C.text : C.backgroundSelected,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowUp size={17} color={canSend ? C.background : C.textSecondary} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}
