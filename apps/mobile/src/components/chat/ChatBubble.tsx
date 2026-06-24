import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { MONO, type ThemeColors } from '@/components/tokens';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  streaming?: boolean;
  C: ThemeColors;
}

function StreamingCursor({ C }: { C: ThemeColors }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        width: 7,
        height: 14,
        backgroundColor: C.textSecondary,
        borderRadius: 1,
        marginLeft: 2,
        marginBottom: -1,
        alignSelf: 'flex-end',
      }}
    />
  );
}

export function ChatBubble({ role, content, images, streaming, C }: ChatBubbleProps) {
  const isUser = role === 'user';
  const hasImages = Boolean(images?.length);

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        marginVertical: 3,
        marginHorizontal: 4,
      }}
    >
      {isUser ? (
        <View
          style={{
            backgroundColor: C.surfaceDark,
            paddingHorizontal: hasImages ? 10 : 14,
            paddingVertical: hasImages ? 10 : 11,
            borderRadius: 18,
            borderBottomRightRadius: 4,
            gap: 8,
          }}
        >
          {images?.map((uri, index) => (
            <Image
              key={`${index}-${uri.slice(0, 32)}`}
              source={{ uri }}
              style={{
                width: 200,
                height: 200,
                borderRadius: 12,
                backgroundColor: C.backgroundSelected,
              }}
              contentFit="cover"
            />
          ))}
          {content ? (
            <Text
              selectable
              style={{
                fontSize: 14,
                fontFamily: MONO,
                color: C.onDark,
                lineHeight: 21,
                paddingHorizontal: hasImages ? 4 : 0,
                paddingBottom: hasImages ? 2 : 0,
              }}
            >
              {content}
            </Text>
          ) : null}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: C.backgroundElement,
            paddingHorizontal: hasImages ? 10 : 14,
            paddingVertical: hasImages ? 10 : 12,
            borderRadius: 18,
            borderBottomLeftRadius: 4,
            gap: 8,
          }}
        >
          {images?.map((uri, index) => (
            <Image
              key={`${index}-${uri.slice(0, 32)}`}
              source={{ uri }}
              style={{
                width: 200,
                height: 200,
                borderRadius: 12,
                backgroundColor: C.backgroundSelected,
              }}
              contentFit="cover"
            />
          ))}
          <View style={{ paddingHorizontal: hasImages ? 4 : 0, paddingBottom: hasImages ? 2 : 0 }}>
            {streaming ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    fontFamily: MONO,
                    color: C.text,
                    lineHeight: 21,
                    flexShrink: 1,
                  }}
                >
                  {content || ''}
                </Text>
                <StreamingCursor C={C} />
              </View>
            ) : (
              <MarkdownContent content={content} C={C} />
            )}
          </View>
        </View>
      )}
    </View>
  );
}
