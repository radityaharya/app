export interface HermesHealth {
  status: 'ok';
}

export interface HermesCapabilities {
  object: 'hermes.api_server.capabilities';
  platform: string;
  model: string;
  auth: { type: 'bearer'; required: boolean };
  features: Record<string, boolean>;
  endpoints?: Record<string, string>;
}

export interface HermesSession {
  id: string;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
  started_at?: number;
  last_active?: number;
  end_reason?: string | null;
  source?: string;
  preview?: string;
}

export interface HermesSessionList {
  sessions?: HermesSession[];
  data?: HermesSession[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface HermesSessionResponse {
  session: HermesSession;
}

export interface HermesMessageList {
  data?: HermesMessage[];
  messages?: HermesMessage[];
}

export interface HermesForkRequest {
  title?: string;
}

export type HermesMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface HermesMessage {
  id?: string | number;
  role: HermesMessageRole;
  content: string | HermesMessageContentPart[];
  created_at?: string;
  tool_calls?: HermesToolCall[] | string;
  tool_call_id?: string;
  name?: string;
  tool_name?: string;
}

export interface HermesToolCall {
  id?: string;
  type?: string;
  name?: string;
  arguments?: string;
  output?: string;
  status?: 'running' | 'completed' | 'failed';
  function?: {
    name?: string;
    arguments?: string;
  };
}

export type HermesMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export type HermesChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export type HermesStreamInput = string | HermesChatContentPart[];

export interface HermesAssistantDeltaEvent {
  type: 'assistant.delta';
  delta: string;
}

export interface HermesToolStartedEvent {
  type: 'tool.started';
  call_id?: string;
  name?: string;
  tool_name?: string;
  arguments?: string;
  args?: unknown;
  message_id?: string;
  seq?: number;
}

export interface HermesToolCompletedEvent {
  type: 'tool.completed';
  call_id?: string;
  name?: string;
  tool_name?: string;
  output?: string;
  preview?: string | null;
  message_id?: string;
  seq?: number;
}

export interface HermesRunCompletedEvent {
  type: 'run.completed';
  output?: string;
  usage?: HermesUsage;
}

export interface HermesRunFailedEvent {
  type: 'run.failed';
  error?: string;
}

export type HermesStreamEvent =
  | HermesAssistantDeltaEvent
  | HermesToolStartedEvent
  | HermesToolCompletedEvent
  | HermesRunCompletedEvent
  | HermesRunFailedEvent;

export interface HermesUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export type ChatItem =
  | {
      kind: 'message';
      id: string;
      role: 'user' | 'assistant';
      content: string;
      images?: string[];
      streaming?: boolean;
    }
  | { kind: 'tool'; id: string; name: string; arguments?: string; output?: string; status: 'running' | 'completed' | 'failed' };
