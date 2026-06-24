import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';

import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { MONO, type ThemeColors } from '@/components/tokens';
import { formatToolPayload, summarizeToolPayload } from '@/lib/hermesMessages';

interface ToolCallCardProps {
  name: string;
  arguments?: string;
  output?: string;
  status: 'running' | 'completed' | 'failed';
  C: ThemeColors;
}

const TOOL_LABELS: Record<string, string> = {
  terminal: 'terminal',
  web_search: 'web search',
  read_file: 'read file',
  write_file: 'write file',
  edit_file: 'edit file',
  memory: 'memory',
  session_search: 'session search',
  clarify: 'clarify',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ');
}

function RunningDots({ C }: { C: ThemeColors }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text
      style={{ opacity, fontSize: 10, fontFamily: MONO, color: C.textSecondary }}
    >
      ···
    </Animated.Text>
  );
}

export function ToolCallCard({ name, arguments: args, output, status, C }: ToolCallCardProps) {
  const running = status === 'running';
  const failed = status === 'failed';
  const [expanded, setExpanded] = useState(running);
  const formattedArgs = formatToolPayload(args);
  const formattedOutput = formatToolPayload(output);
  const preview = summarizeToolPayload(output) || summarizeToolPayload(args);

  useEffect(() => {
    if (running) setExpanded(true);
  }, [running]);

  return (
    <View
      style={{
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: C.hairline,
        borderRadius: 4,
        marginVertical: 3,
        marginHorizontal: 4,
        overflow: 'hidden',
        backgroundColor: C.backgroundSelected,
      }}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 9,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 11,
            fontFamily: MONO,
            color: C.textSecondary,
          }}
        >
          {toolLabel(name)}
          {!expanded && preview ? (
            <Text style={{ color: C.hairlineStrong }}>{`  ${preview}`}</Text>
          ) : null}
        </Text>

        {running ? (
          <RunningDots C={C} />
        ) : (
          <Text
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: failed ? C.destructive : C.textSecondary,
            }}
          >
            {failed ? 'failed' : 'done'}
          </Text>
        )}
      </Pressable>

      {expanded ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: C.hairline,
            paddingHorizontal: 12,
            paddingBottom: 10,
            gap: 10,
          }}
        >
          {formattedArgs ? <ToolSection title="input" body={formattedArgs} C={C} /> : null}

          {running ? (
            <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary, paddingTop: 8 }}>
              waiting…
            </Text>
          ) : formattedOutput ? (
            <ToolSection title="output" body={formattedOutput} C={C} markdown />
          ) : (
            <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary, paddingTop: 8 }}>
              {failed ? 'no output' : 'empty'}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function ToolSection({
  title,
  body,
  C,
  markdown,
}: {
  title: string;
  body: string;
  C: ThemeColors;
  markdown?: boolean;
}) {
  return (
    <View style={{ gap: 4, paddingTop: 8 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: '600',
          fontFamily: MONO,
          color: C.textSecondary,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          opacity: 0.7,
        }}
      >
        {title}
      </Text>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 180 }}>
        {markdown && !body.trimStart().startsWith('{') && !body.trimStart().startsWith('[') ? (
          <MarkdownContent content={body} C={C} />
        ) : (
          <Text
            selectable
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: C.text,
              lineHeight: 15,
              opacity: 0.85,
            }}
          >
            {body}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
