import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
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
  const translateY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  function handleAction(fn: () => void) {
    onClose();
    setTimeout(fn, 120);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          opacity: backdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY }],
        }}
      >
        <View
          style={{
            backgroundColor: C.backgroundElement,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: C.hairline,
            paddingBottom: Math.max(insets.bottom, 16),
            overflow: 'hidden',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: C.hairline,
              }}
            />
          </View>

          {/* Title area */}
          {(title || subtitle) ? (
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: C.hairline,
                gap: 2,
              }}
            >
              {title ? (
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    fontFamily: MONO,
                    color: C.text,
                  }}
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    fontFamily: MONO,
                    color: C.textSecondary,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Actions */}
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

          {/* Cancel */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 2,
              borderTopWidth: 1,
              borderTopColor: C.hairline,
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                paddingVertical: 16,
                alignItems: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  fontFamily: MONO,
                  color: C.text,
                }}
              >
                cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
