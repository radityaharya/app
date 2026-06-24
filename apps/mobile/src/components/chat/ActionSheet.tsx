import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MONO, type ThemeColors } from '@/components/tokens';

export interface ActionSheetAction {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
  C: ThemeColors;
}

export function ActionSheet({ visible, title, subtitle, actions, onClose, C }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
      />
    ),
    [],
  );

  function handleAction(fn: () => void) {
    ref.current?.dismiss();
    setTimeout(fn, 100);
  }

  return (
    <BottomSheetModal
      ref={ref}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enableDynamicSizing
      backgroundStyle={{
        backgroundColor: C.backgroundElement,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: C.hairline,
      }}
      handleIndicatorStyle={{ backgroundColor: C.hairline }}
    >
      <BottomSheetView style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        {(title ?? subtitle) ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 4,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: C.hairline,
              gap: 2,
            }}
          >
            {title ? (
              <Text
                numberOfLines={1}
                style={{ fontSize: 13, fontWeight: '700', fontFamily: MONO, color: C.text }}
              >
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ paddingTop: 6, paddingBottom: 6 }}>
          {actions.map((action, i) => (
            <Pressable
              key={i}
              onPress={() => handleAction(action.onPress)}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 16,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: MONO,
                  fontWeight: action.destructive ? '600' : '400',
                  color: action.destructive ? C.destructive : C.text,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={{
            marginHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: C.hairline,
          }}
        >
          <Pressable
            onPress={() => ref.current?.dismiss()}
            style={({ pressed }) => ({
              paddingVertical: 16,
              alignItems: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', fontFamily: MONO, color: C.text }}>
              cancel
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
