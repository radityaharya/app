import { createParser, type EventSourceMessage } from 'eventsource-parser';

import type { HermesStreamEvent, HermesStreamInput } from '@/types/hermes';

import { getHermesAuthHeaders, getHermesBaseUrl } from '@/lib/hermesConfig';

export interface StreamChatOptions {
  onEvent: (event: HermesStreamEvent) => void;
  signal?: AbortSignal;
}

function buildStreamEvent(eventName: string, data: Record<string, unknown>): HermesStreamEvent | null {
  switch (eventName) {
    case 'assistant.delta':
      return {
        type: 'assistant.delta',
        delta: typeof data.delta === 'string' ? data.delta : '',
      };
    case 'tool.started': {
      const args = data.args;
      return {
        type: 'tool.started',
        call_id: toolCallId(data),
        name: typeof data.tool_name === 'string' ? data.tool_name : 'tool',
        tool_name: typeof data.tool_name === 'string' ? data.tool_name : undefined,
        arguments: args ? JSON.stringify(args, null, 2) : typeof data.preview === 'string' ? data.preview : undefined,
        args,
        message_id: typeof data.message_id === 'string' ? data.message_id : undefined,
        seq: typeof data.seq === 'number' ? data.seq : undefined,
      };
    }
    case 'tool.completed': {
      const output = coerceToolOutput(data);
      return {
        type: 'tool.completed',
        call_id: toolCallId(data),
        name: typeof data.tool_name === 'string' ? data.tool_name : 'tool',
        tool_name: typeof data.tool_name === 'string' ? data.tool_name : undefined,
        output,
        preview: output ?? null,
        message_id: typeof data.message_id === 'string' ? data.message_id : undefined,
        seq: typeof data.seq === 'number' ? data.seq : undefined,
      };
    }
    case 'run.completed':
      return {
        type: 'run.completed',
        output: typeof data.output === 'string' ? data.output : undefined,
      };
    case 'run.failed':
      return {
        type: 'run.failed',
        error: typeof data.error === 'string' ? data.error : 'Run failed',
      };
    default:
      return null;
  }
}

function coerceToolOutput(data: Record<string, unknown>): string | undefined {
  const candidate = data.output ?? data.result ?? data.preview;
  if (typeof candidate === 'string') return candidate;
  if (candidate != null) {
    try {
      return JSON.stringify(candidate, null, 2);
    } catch {
      return String(candidate);
    }
  }
  return undefined;
}

function toolCallId(data: Record<string, unknown>): string {
  if (typeof data.call_id === 'string') return data.call_id;
  if (typeof data.tool_call_id === 'string') return data.tool_call_id;
  const messageId = typeof data.message_id === 'string' ? data.message_id : 'stream';
  const name = typeof data.tool_name === 'string' ? data.tool_name : 'tool';
  if (typeof data.seq === 'number') return `${messageId}:${name}:${data.seq}`;
  return `${messageId}:${name}`;
}

export async function streamChat(
  sessionId: string,
  input: HermesStreamInput,
  options: StreamChatOptions,
): Promise<void> {
  const baseUrl = getHermesBaseUrl();
  const headers = await getHermesAuthHeaders();

  const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/chat/stream`, {
    method: 'POST',
    headers: {
      ...headers,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ input }),
    signal: options.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Stream failed: ${res.status} ${text}`);
  }

  const body = res.body;
  if (!body) {
    throw new Error('No response body for SSE stream');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();

  const parser = createParser({
    onEvent: (message: EventSourceMessage) => {
      if (!message.data || message.data === '[DONE]') return;
      try {
        const data = JSON.parse(message.data) as Record<string, unknown>;
        const eventName = message.event || (typeof data.type === 'string' ? data.type : '');
        if (!eventName) return;
        const event = buildStreamEvent(eventName, data);
        if (event) options.onEvent(event);
      } catch {
        // ignore malformed frames
      }
    },
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
