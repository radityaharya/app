export interface HermesDashboardStatus {
  version: string;
  gateway_running: boolean;
  gateway_state: string;
  gateway_platforms?: Record<
    string,
    { state: string; error_message?: string | null }
  >;
  auth_required?: boolean;
  auth_providers?: string[];
}

export interface HermesDashboardAuthMe {
  user_id: string;
  display_name?: string;
  provider: string;
  expires_at?: number;
}

export interface HermesModelProvider {
  slug: string;
  name: string;
  is_current?: boolean;
  authenticated?: boolean;
  models: string[];
  warning?: string;
}

export interface HermesModelOptions {
  providers: HermesModelProvider[];
  model?: string;
  provider?: string;
}

export interface HermesAuxTask {
  task: string;
  provider: string;
  model: string;
  base_url?: string;
}

export interface HermesModelAuxiliary {
  main?: { provider: string; model: string; base_url?: string };
  tasks: HermesAuxTask[];
}

export interface HermesModelSetRequest {
  scope: 'main' | 'auxiliary';
  provider: string;
  model: string;
  task?: string;
}

export interface HermesModelSetResponse {
  ok: boolean;
  scope: string;
  provider: string;
  model: string;
}
