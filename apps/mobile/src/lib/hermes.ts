import type {
  HermesCapabilities,
  HermesForkRequest,
  HermesHealth,
  HermesMessage,
  HermesMessageList,
  HermesSession,
  HermesSessionList,
  HermesSessionResponse,
} from '@/types/hermes';

import { getHermesAuthHeaders, getHermesBaseUrl } from '@/lib/hermesConfig';

class HermesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HermesApiError';
  }
}

async function hermesFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getHermesBaseUrl();
  const headers = await getHermesAuthHeaders();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new HermesApiError(`Hermes ${path} → ${res.status}: ${text}`, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function normalizeSessions(data: HermesSessionList | HermesSession[]): HermesSession[] {
  if (Array.isArray(data)) return data;
  return data.data ?? data.sessions ?? [];
}

function normalizeSession(data: HermesSession | HermesSessionResponse): HermesSession {
  if ('session' in data && data.session) return data.session;
  return data as HermesSession;
}

function normalizeMessages(data: HermesMessage[] | HermesMessageList): HermesMessage[] {
  if (Array.isArray(data)) return data;
  return data.data ?? data.messages ?? [];
}

export const hermes = {
  async getHealth(): Promise<HermesHealth> {
    const baseUrl = getHermesBaseUrl();
    const headers = await getHermesAuthHeaders();
    const res = await fetch(`${baseUrl}/health`, { headers });
    if (!res.ok) {
      throw new HermesApiError(`Health check failed: ${res.status}`, res.status);
    }
    return res.json() as Promise<HermesHealth>;
  },

  getCapabilities(): Promise<HermesCapabilities> {
    return hermesFetch<HermesCapabilities>('/v1/capabilities');
  },

  async listSessions(limit = 50, offset = 0): Promise<HermesSession[]> {
    const data = await hermesFetch<HermesSessionList | HermesSession[]>(
      `/api/sessions?limit=${limit}&offset=${offset}`,
    );
    return normalizeSessions(data);
  },

  async createSession(title?: string): Promise<HermesSession> {
    const data = await hermesFetch<HermesSession | HermesSessionResponse>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(title ? { title } : {}),
    });
    return normalizeSession(data);
  },

  async getSession(id: string): Promise<HermesSession> {
    const data = await hermesFetch<HermesSession | HermesSessionResponse>(`/api/sessions/${id}`);
    return normalizeSession(data);
  },

  async patchSession(id: string, patch: { title?: string; end_reason?: string }): Promise<HermesSession> {
    const data = await hermesFetch<HermesSession | HermesSessionResponse>(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return normalizeSession(data);
  },

  deleteSession(id: string): Promise<void> {
    return hermesFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' });
  },

  async forkSession(id: string, body?: HermesForkRequest): Promise<HermesSession> {
    const data = await hermesFetch<HermesSession | HermesSessionResponse>(`/api/sessions/${id}/fork`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
    return normalizeSession(data);
  },

  async getMessages(id: string): Promise<HermesMessage[]> {
    const data = await hermesFetch<HermesMessage[] | HermesMessageList>(
      `/api/sessions/${id}/messages`,
    );
    return normalizeMessages(data);
  },
};

export { HermesApiError };
