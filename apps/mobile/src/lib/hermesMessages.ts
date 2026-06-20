import type { ChatItem, HermesMessage } from '@/types/hermes';

export function contentToText(content: HermesMessage['content']): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  return content
    .map((part) => {
      if (part.type === 'text') return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function contentToImages(content: HermesMessage['content']): string[] | undefined {
  if (typeof content === 'string') return undefined;
  const images = content
    .filter((part): part is { type: 'image_url'; image_url: { url: string } } => part.type === 'image_url')
    .map((part) => part.image_url.url);
  return images.length > 0 ? images : undefined;
}

interface NormalizedToolCall {
  id: string;
  name: string;
  arguments?: string;
}

export function parseToolCalls(raw: unknown, msgIndex = 0): NormalizedToolCall[] {
  if (raw == null) return [];

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map((tc, index) => {
    const record = tc as Record<string, unknown>;
    const fn = (record.function ?? {}) as Record<string, unknown>;
    const name =
      (typeof fn.name === 'string' && fn.name) ||
      (typeof record.name === 'string' && record.name) ||
      (typeof record.tool_name === 'string' && record.tool_name) ||
      'tool';
    const id =
      (typeof record.id === 'string' && record.id) ||
      (typeof record.call_id === 'string' && record.call_id) ||
      `tool-${msgIndex ?? 0}-${index}`;

    let args: string | undefined;
    const rawArgs = fn.arguments ?? record.arguments ?? record.args;
    if (typeof rawArgs === 'string') {
      args = rawArgs;
    } else if (rawArgs != null) {
      args = JSON.stringify(rawArgs);
    }

    return { id, name, arguments: args };
  });
}

export function formatToolPayload(value: string | undefined): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return value;
  }
}

export function summarizeToolPayload(value: string | undefined, max = 120): string {
  const formatted = formatToolPayload(value);
  if (!formatted) return '';
  const oneLine = formatted.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

export function messagesToChatItems(messages: HermesMessage[]): ChatItem[] {
  const items: ChatItem[] = [];
  const openTools = new Map<string, number>();

  messages.forEach((msg, msgIndex) => {
    const msgKey = msg.id != null ? String(msg.id) : `${msg.role}-${msgIndex}`;

    if (msg.role === 'user') {
      const content = contentToText(msg.content);
      const images = contentToImages(msg.content);
      if (content || images?.length) {
        items.push({
          kind: 'message',
          id: `${msgIndex}-user-${msgKey}`,
          role: 'user',
          content,
          images,
        });
      }
      return;
    }

    if (msg.role === 'assistant') {
      const content = contentToText(msg.content);
      if (content) {
        items.push({
          kind: 'message',
          id: `${msgIndex}-assistant-${msgKey}`,
          role: 'assistant',
          content,
        });
      }

      for (const tc of parseToolCalls(msg.tool_calls, msgIndex)) {
        const idx = items.length;
        items.push({
          kind: 'tool',
          id: `${msgIndex}-tool-${tc.id}`,
          name: tc.name,
          arguments: tc.arguments,
          status: 'running',
        });
        openTools.set(tc.id, idx);
      }
      return;
    }

    if (msg.role === 'tool') {
      const callId = msg.tool_call_id ?? msgKey;
      const name = msg.tool_name ?? msg.name ?? 'tool';
      const output = contentToText(msg.content);
      const existingIdx = openTools.get(callId);

      if (existingIdx !== undefined) {
        const existing = items[existingIdx];
        if (existing.kind === 'tool') {
          items[existingIdx] = {
            ...existing,
            name: existing.name || name,
            output: output || existing.output,
            status: 'completed',
          };
          openTools.delete(callId);
        }
        return;
      }

      items.push({
        kind: 'tool',
        id: `${msgIndex}-tool-${callId}`,
        name,
        output,
        status: output ? 'completed' : 'failed',
      });
    }
  });

  return items.map((item) => {
    if (item.kind === 'tool' && item.status === 'running') {
      return { ...item, status: 'completed' as const };
    }
    return item;
  });
}
