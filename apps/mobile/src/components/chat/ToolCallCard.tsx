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

function statusColor(status: ToolCallCardProps['status'], C: ThemeColors): string {
  if (status === 'running') return C.textSecondary;
  if (status === 'failed') return C.destructive;
  return C.textSecondary;
}

export function ToolCallCard({ name, arguments: args, output, status, C }: ToolCallCardProps) {
  const running = status === 'running';
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
        overflow: 'hidden',
        backgroundColor: C.backgroundElement,
      }}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 8,
          paddingVertical: 6,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {running ? <ActivityIndicator size="small" color={C.textSecondary} style={{ transform: [{ scale: 0.8 }] }} /> : null}

        <Text
          numberOfLines={expanded ? 1 : 2}
          style={{ flex: 1, fontSize: 11, fontFamily: MONO, color: C.text, lineHeight: 15 }}
        >
          {toolLabel(name)}
          {!expanded && preview ? (
            <Text selectable={false} style={{ color: C.textSecondary }}>{` · ${preview}`}</Text>
          ) : null}
        </Text>

        <Text style={{ fontSize: 10, fontFamily: MONO, color: statusColor(status, C) }}>
          {running ? '…' : status === 'failed' ? 'fail' : 'ok'}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 6, borderTopWidth: 1, borderTopColor: C.hairline }}>
          {formattedArgs ? <ToolSection title="in" body={formattedArgs} C={C} /> : null}

          {running ? (
            <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary }}>waiting…</Text>
          ) : formattedOutput ? (
            <ToolSection title="out" body={formattedOutput} C={C} markdown />
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
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary }}>
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
