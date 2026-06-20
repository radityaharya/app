import type {
  HermesDashboardAuthMe,
  HermesDashboardStatus,
  HermesModelAuxiliary,
  HermesModelOptions,
  HermesModelSetRequest,
  HermesModelSetResponse,
} from '@/types/hermesDashboard';

import {
  clearDashboardSession,
  cookieHeader,
  getDashboardPassword,
  getDashboardSession,
  getDashboardUsername,
  getHermesDashboardBaseUrl,
  setDashboardSession,
  type DashboardSessionCookies,
} from '@/lib/hermesDashboardConfig';

class HermesDashboardError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HermesDashboardError';
  }
}

function parseSetCookieHeader(header: string): DashboardSessionCookies | null {
  const at = header.match(/hermes_session_at=([^;\s]+)/)?.[1];
  if (!at) return null;
  const rt = header.match(/hermes_session_rt=([^;\s]+)/)?.[1];
  return { at, rt };
}

function extractCookiesFromResponse(res: Response): DashboardSessionCookies | null {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    const parts = headers.getSetCookie();
    const combined = parts.join('; ');
    const parsed = parseSetCookieHeader(combined);
    if (parsed) return parsed;
  }
  const single = res.headers.get('set-cookie');
  if (single) return parseSetCookieHeader(single);
  return null;
}

async function login(): Promise<DashboardSessionCookies> {
  const baseUrl = getHermesDashboardBaseUrl();
  const username = await getDashboardUsername();
  const password = await getDashboardPassword();
  if (!username || !password) {
    throw new HermesDashboardError('Dashboard credentials not configured', 401);
  }

  const res = await fetch(`${baseUrl}/auth/password-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'basic', username, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new HermesDashboardError(`Login failed: ${text}`, res.status);
  }

  const cookies = extractCookiesFromResponse(res);
  if (!cookies) {
    throw new HermesDashboardError('Login succeeded but no session cookie returned', 500);
  }

  await setDashboardSession(cookies);
  return cookies;
}

async function ensureSession(force = false): Promise<DashboardSessionCookies> {
  if (!force) {
    const cached = await getDashboardSession();
    if (cached) return cached;
  }
  return login();
}

async function dashboardFetch<T>(
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<T> {
  const baseUrl = getHermesDashboardBaseUrl();
  const session = await ensureSession();

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(session),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    await clearDashboardSession();
    await ensureSession(true);
    return dashboardFetch<T>(path, init, false);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new HermesDashboardError(`Dashboard ${path} → ${res.status}: ${text}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const hermesDashboard = {
  getStatus(): Promise<HermesDashboardStatus> {
    const baseUrl = getHermesDashboardBaseUrl();
    return fetch(`${baseUrl}/api/status`).then(async (res) => {
      if (!res.ok) throw new HermesDashboardError('Status check failed', res.status);
      return res.json() as Promise<HermesDashboardStatus>;
    });
  },

  login(): Promise<HermesDashboardAuthMe> {
    return dashboardFetch<HermesDashboardAuthMe>('/api/auth/me');
  },

  getModelOptions(): Promise<HermesModelOptions> {
    return dashboardFetch<HermesModelOptions>('/api/model/options');
  },

  getModelAuxiliary(): Promise<HermesModelAuxiliary> {
    return dashboardFetch<HermesModelAuxiliary>('/api/model/auxiliary');
  },

  setModel(body: HermesModelSetRequest): Promise<HermesModelSetResponse> {
    return dashboardFetch<HermesModelSetResponse>('/api/model/set', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  setMainModel(provider: string, model: string): Promise<HermesModelSetResponse> {
    return hermesDashboard.setModel({ scope: 'main', provider, model });
  },

  resetAuxiliaryModels(): Promise<HermesModelSetResponse> {
    return hermesDashboard.setModel({
      scope: 'auxiliary',
      task: '__reset__',
      provider: '',
      model: '',
    });
  },

  restartGateway(): Promise<{ ok?: boolean; status?: string }> {
    return dashboardFetch('/api/gateway/restart', { method: 'POST', body: '{}' });
  },
};

export { HermesDashboardError };
