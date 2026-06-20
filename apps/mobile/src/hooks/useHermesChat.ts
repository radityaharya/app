import type { ChatItem, HermesStreamInput } from '@/types/hermes';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { hermes } from '@/lib/hermes';
import { messagesToChatItems } from '@/lib/hermesMessages';
import { streamChat } from '@/lib/hermesSse';

export interface SendMessageOptions {
  text?: string;
  imageDataUrls?: string[];
}

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildStreamInput({ text, imageDataUrls }: SendMessageOptions): HermesStreamInput | null {
  const trimmed = text?.trim() ?? '';
  const images = imageDataUrls ?? [];
  if (!trimmed && images.length === 0) return null;

  if (images.length === 0) {
    return trimmed;
  }

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail: 'high' } }
  > = [];

  if (trimmed) {
    content.push({ type: 'text', text: trimmed });
  }
  for (const url of images) {
    content.push({ type: 'image_url', image_url: { url, detail: 'high' } });
  }

  return content;
}

function markRunningTools(items: ChatItem[], status: 'failed' | 'completed', note?: string): ChatItem[] {
  return items.map((item) =>
    item.kind === 'tool' && item.status === 'running'
      ? {
          ...item,
          status,
          output: item.output ?? note,
        }
      : item,
  );
}

export function useHermesChat(sessionId: string) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef(false);

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const messages = await hermes.getMessages(sessionId);
      setItems(messagesToChatItems(messages));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      if (streamingRef.current) return;
      void loadHistory();
    }, [loadHistory]),
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [sessionId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setItems((prev) =>
      prev.map((item) => {
        if (item.kind === 'message' && item.streaming) {
          return { ...item, streaming: false };
        }
        if (item.kind === 'tool' && item.status === 'running') {
          return { ...item, status: 'failed', output: item.output ?? 'Stopped' };
        }
        return item;
      }),
    );
    void loadHistory();
  }, [loadHistory]);

  const send = useCallback(
    async (options: SendMessageOptions) => {
      const payload = buildStreamInput(options);
      if (!payload || streaming) return;

      const userId = messageId('user');
      const assistantId = messageId('assistant');
      const previewText = options.text?.trim() || (options.imageDataUrls?.length ? '[image]' : '');
      const previewImages = options.imageDataUrls;

      setItems((prev) => [
        ...prev,
        {
          kind: 'message',
          id: userId,
          role: 'user',
          content: previewText,
          images: previewImages,
        },
        { kind: 'message', id: assistantId, role: 'assistant', content: '', streaming: true },
      ]);
      setStreaming(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(sessionId, payload, {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === 'assistant.delta') {
              setItems((prev) =>
                prev.map((item) =>
                  item.kind === 'message' && item.id === assistantId
                    ? { ...item, content: item.content + event.delta }
                    : item,
                ),
              );
            } else if (event.type === 'tool.started') {
              const callId = event.call_id ?? messageId('tool');
              setItems((prev) => {
                if (prev.some((item) => item.kind === 'tool' && item.id === callId)) {
                  return prev;
                }
                return [
                  ...prev,
                  {
                    kind: 'tool',
                    id: callId,
                    name: event.tool_name ?? event.name ?? 'tool',
                    arguments: event.arguments,
                    status: 'running',
                  },
                ];
              });
            } else if (event.type === 'tool.completed') {
              const callId = event.call_id;
              const toolName = event.tool_name ?? event.name;
              const output = event.output ?? event.preview ?? undefined;

              setItems((prev) => {
                let matched = false;
                return prev.map((item) => {
                  if (item.kind !== 'tool' || item.status !== 'running') return item;

                  const idMatch = callId && item.id === callId;
                  const nameMatch = !matched && item.name === toolName;

                  if (idMatch || nameMatch) {
                    matched = true;
                    return {
                      ...item,
                      output: output ?? item.output,
                      status: 'completed' as const,
                    };
                  }
                  return item;
                });
              });
            } else if (event.type === 'run.completed') {
              if (event.output) {
                setItems((prev) =>
                  prev.map((item) =>
                    item.kind === 'message' && item.id === assistantId && !item.content
                      ? { ...item, content: event.output!, streaming: false }
                      : item.kind === 'message' && item.id === assistantId
                        ? { ...item, streaming: false }
                        : item,
                  ),
                );
              } else {
                setItems((prev) =>
                  prev.map((item) =>
                    item.kind === 'message' && item.id === assistantId
                      ? { ...item, streaming: false }
                      : item,
                  ),
                );
              }
            } else if (event.type === 'run.failed') {
              setError(event.error ?? 'Run failed');
              setItems((prev) =>
                prev.map((item) =>
                  item.kind === 'message' && item.id === assistantId
                    ? {
                        ...item,
                        content: item.content || event.error || 'Run failed',
                        streaming: false,
                      }
                    : item,
                ),
              );
            }
          },
        });

        setItems((prev) =>
          prev.map((item) =>
            item.kind === 'message' && item.id === assistantId && item.streaming
              ? { ...item, streaming: false }
              : item,
          ),
        );

        if (!controller.signal.aborted) {
          const messages = await hermes.getMessages(sessionId);
          setItems(messagesToChatItems(messages));
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        const msg = e instanceof Error ? e.message : 'Stream failed';
        setError(msg);
        setItems((prev) =>
          prev.map((item) =>
            item.kind === 'message' && item.id === assistantId
              ? { ...item, content: item.content || msg, streaming: false }
              : item,
          ),
        );
        setItems((prev) => markRunningTools(prev, 'failed', msg));
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, streaming],
  );

  return {
    items,
    loading,
    streaming,
    error,
    send,
    stop,
    refresh: loadHistory,
  };
}
