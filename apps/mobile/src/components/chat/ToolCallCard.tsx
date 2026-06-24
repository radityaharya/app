import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

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

function statusAccent(status: ToolCallCardProps['status'], C: ThemeColors): string {
  if (status === 'running') return C.statusInactive;
  if (status === 'failed') return C.destructive;
  return C.statusActive;
}

function statusText(status: ToolCallCardProps['status']): string {
  if (status === 'running') return 'running';
  if (status === 'failed') return 'failed';
  return 'done';
}

export function ToolCallCard({ name, arguments: args, output, status, C }: ToolCallCardProps) {
  const running = status === 'running';
  const [expanded, setExpanded] = useState(running);
  const formattedArgs = formatToolPayload(args);
  const formattedOutput = formatToolPayload(output);
  const preview = summarizeToolPayload(output) || summarizeToolPayload(args);
  const accent = statusAccent(status, C);

  useEffect(() => {
    if (running) setExpanded(true);
  }, [running]);

  return (
    <View
      style={{
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: C.hairline,
        borderLeftWidth: 3,
        borderLeftColor: accent,
        borderRadius: 8,
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
        marginVertical: 3,
        marginHorizontal: 4,
        overflow: 'hidden',
        backgroundColor: C.backgroundElement,
      }}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {running ? (
          <ActivityIndicator
            size="small"
            color={accent}
            style={{ transform: [{ scale: 0.75 }] }}
          />
        ) : (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: accent,
            }}
          />
        )}

        <Text
          numberOfLines={expanded ? 1 : 2}
          style={{ flex: 1, fontSize: 12, fontFamily: MONO, color: C.text, lineHeight: 16 }}
        >
          {toolLabel(name)}
          {!expanded && preview ? (
            <Text selectable={false} style={{ color: C.textSecondary }}>{`  ${preview}`}</Text>
          ) : null}
        </Text>

        <Text
          style={{
            fontSize: 10,
            fontFamily: MONO,
            color: accent,
            letterSpacing: 0.3,
          }}
        >
          {statusText(status)}
        </Text>
      </Pressable>

      {expanded ? (
        <View
          style={{
            paddingHorizontal: 10,
            paddingBottom: 10,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: C.hairline,
          }}
        >
          {formattedArgs ? <ToolSection title="input" body={formattedArgs} C={C} /> : null}

          {running ? (
            <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary }}>
              waiting…
            </Text>
          ) : formattedOutput ? (
            <ToolSection title="output" body={formattedOutput} C={C} markdown />
          ) : (
            <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary }}>
              {status === 'failed' ? 'no output' : 'empty'}
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
          fontWeight: '700',
          fontFamily: MONO,
          color: C.textSecondary,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
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
            }}
          >
            {body}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
