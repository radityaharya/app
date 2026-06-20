import type { ChatItem } from '@/types/hermes';
import { View } from 'react-native';

import { ChatBubble } from '@/components/chat/ChatBubble';
import { ToolCallCard } from '@/components/chat/ToolCallCard';
import type { ThemeColors } from '@/components/tokens';

interface ChatMessageListProps {
  items: ChatItem[];
  C: ThemeColors;
}

export function ChatMessageList({ items, C }: ChatMessageListProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      {items.map((item) => {
        if (item.kind === 'message') {
          return (
            <ChatBubble
              key={item.id}
              role={item.role}
              content={item.content}
              images={item.images}
              streaming={item.streaming}
              C={C}
            />
          );
        }
        return (
          <ToolCallCard
            key={item.id}
            name={item.name}
            arguments={item.arguments}
            output={item.output}
            status={item.status}
            C={C}
          />
        );
      })}
    </View>
  );
}
