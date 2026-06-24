import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  KeyboardChatScrollView,
  KeyboardGestureArea,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeft, MoreHorizontal, Square } from 'lucide-react-native';

import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ConnectionBanner } from '@/components/chat/ConnectionBanner';
import { ModelPickerModal } from '@/components/hermes';
import { MONO, type ThemeColors } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';
import { useHermesChat } from '@/hooks/useHermesChat';
import { useHermesDashboard } from '@/hooks/useHermesDashboard';
import { hermes } from '@/lib/hermes';
import { imageUriToDataUrl } from '@/lib/hermesImages';

const CHAT_INPUT_ID = 'hermes-chat-input';
const COMPOSER_BASE_HEIGHT = 56;
const KEYBOARD_OPEN_LIFT = 12;

export default function HermesChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = id ?? '';
  const { colors: C } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { items, loading, streaming, error, send, stop } = useHermesChat(sessionId);
  const dashboard = useHermesDashboard();
  const [input, setInput] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('chat');
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef<React.ElementRef<typeof KeyboardChatScrollView>>(null);
  const composerHeight = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      dashboard.refresh();
    }, [dashboard.refresh]),
  );

  useEffect(() => {
    if (!sessionId) return;
    hermes
      .getSession(sessionId)
      .then((s) => setTitle(s.title?.trim() || 'chat'))
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [items]);

  const onComposerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      composerHeight.value = withTiming(
        Math.max(event.nativeEvent.layout.height - COMPOSER_BASE_HEIGHT, 0),
        { duration: 150 },
      );
    },
    [composerHeight],
  );

  async function handleAttach() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPendingImageUri(result.assets[0].uri);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && !pendingImageUri) || streaming || sending) return;

    const imageUri = pendingImageUri;
    setSending(true);
    try {
      setInput('');
      setPendingImageUri(null);
      const imageDataUrls = imageUri ? [await imageUriToDataUrl(imageUri)] : undefined;
      await send({ text: text || undefined, imageDataUrls });
    } catch (e) {
      if (imageUri) setPendingImageUri(imageUri);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleOverflow() {
    const actions: Array<{ text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }> = [];

    if (dashboard.authenticated) {
      actions.push({
        text: 'change model',
        onPress: () => setPickerOpen(true),
      });
    }

    actions.push(
      {
        text: 'fork',
        onPress: async () => {
          try {
            const forked = await hermes.forkSession(sessionId, { title: `${title} (fork)` });
            router.push(`/hermes/${forked.id}` as never);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Fork failed');
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
                  await hermes.deleteSession(sessionId);
                  router.back();
                } catch (e) {
                  Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    );

    Alert.alert(title, dashboard.mainModelLabel ?? undefined, actions);
  }

  const inputBottomInset = Math.max(12, insets.bottom);
  const composerScreenOffset = COMPOSER_BASE_HEIGHT + 12 + inputBottomInset;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ChatHeader
        C={C}
        title={title}
        subtitle={dashboard.mainModelLabel ?? undefined}
        streaming={streaming}
        onBack={() => router.back()}
        onStop={stop}
        onOverflow={handleOverflow}
        onModelPress={dashboard.authenticated ? () => setPickerOpen(true) : undefined}
      />

      {error ? <ConnectionBanner C={C} message={error} /> : null}

      <KeyboardGestureArea
        style={{ flex: 1 }}
        interpolator="ios"
        textInputNativeID={CHAT_INPUT_ID}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.textSecondary} />
          </View>
        ) : (
          <KeyboardChatScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            offset={composerScreenOffset}
            extraContentPadding={composerHeight}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            <ChatMessageList items={items} C={C} />
          </KeyboardChatScrollView>
        )}

        <KeyboardStickyView offset={{ closed: 0, opened: -KEYBOARD_OPEN_LIFT }}>
          <ChatInput
            C={C}
            nativeID={CHAT_INPUT_ID}
            value={input}
            onChangeText={setInput}
            onSend={handleSend}
            onAttach={handleAttach}
            pendingImageUri={pendingImageUri}
            onRemoveImage={() => setPendingImageUri(null)}
            onLayout={onComposerLayout}
            disabled={streaming || loading || sending}
            bottomInset={inputBottomInset}
          />
        </KeyboardStickyView>
      </KeyboardGestureArea>

      <ModelPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        options={dashboard.options}
        loading={dashboard.loading}
        currentProvider={dashboard.auxiliary?.main?.provider}
        currentModel={dashboard.auxiliary?.main?.model}
        onSelect={async (provider, model) => {
          await dashboard.setMainModel(provider, model);
          Alert.alert('Model updated', 'New sessions will use this model.');
        }}
        C={C}
      />
    </SafeAreaView>
  );
}

function ChatHeader({
  C,
  title,
  subtitle,
  streaming,
  onBack,
  onStop,
  onOverflow,
  onModelPress,
}: {
  C: ThemeColors;
  title: string;
  subtitle?: string;
  streaming: boolean;
  onBack: () => void;
  onStop: () => void;
  onOverflow: () => void;
  onModelPress?: () => void;
}) {
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

      <Pressable
        onPress={onModelPress ?? onOverflow}
        disabled={!onModelPress && streaming}
        style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '700',
            fontFamily: MONO,
            color: C.text,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {streaming ? (
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: C.statusActive,
                }}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 10,
                fontFamily: MONO,
                color: streaming ? C.statusActive : C.textSecondary,
                textAlign: 'center',
              }}
            >
              {streaming ? 'responding…' : subtitle}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {streaming ? (
        <Pressable
          onPress={onStop}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.destructiveSubtle,
            opacity: pressed ? 0.6 : 1,
            flexShrink: 0,
          })}
        >
          <Square size={14} color={C.destructive} strokeWidth={0} fill={C.destructive} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onOverflow}
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
          <MoreHorizontal size={17} color={C.text} strokeWidth={1.75} />
        </Pressable>
      )}
    </View>
  );
}
