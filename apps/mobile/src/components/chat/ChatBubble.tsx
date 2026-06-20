import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { MONO, type ThemeColors } from '@/components/tokens';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  streaming?: boolean;
  C: ThemeColors;
}

export function ChatBubble({ role, content, images, streaming, C }: ChatBubbleProps) {
  const isUser = role === 'user';
  const hasImages = Boolean(images?.length);

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        marginVertical: 4,
      }}
    >
      <View
        style={{
          borderWidth: isUser ? 0 : 1,
          borderColor: C.hairline,
          backgroundColor: isUser ? C.text : C.background,
          paddingHorizontal: hasImages ? 8 : 14,
          paddingVertical: hasImages ? 8 : 10,
          borderRadius: 4,
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
              borderRadius: 4,
              backgroundColor: isUser ? C.backgroundSelected : C.backgroundElement,
            }}
            contentFit="cover"
          />
        ))}
        {isUser ? (
          content ? (
            <Text
              style={{
                fontSize: 13,
                fontFamily: MONO,
                color: C.background,
                lineHeight: 20,
                paddingHorizontal: hasImages ? 6 : 0,
                paddingBottom: hasImages ? 4 : 0,
              }}
            >
              {content}
            </Text>
          ) : null
        ) : (
          <View
            style={{
              paddingHorizontal: hasImages ? 6 : 0,
              paddingBottom: hasImages ? 4 : 0,
            }}
          >
            {streaming ? (
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: MONO,
                  color: C.text,
                  lineHeight: 20,
                }}
              >
                {content || '…'}
                ▍
              </Text>
            ) : (
              <MarkdownContent content={content} C={C} />
            )}
          </View>
        )}
      </View>
    </View>
  );
}
