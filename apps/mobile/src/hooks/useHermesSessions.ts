import type { HermesSession } from '@/types/hermes';
import { useCallback, useEffect, useState } from 'react';

import { hermes } from '@/lib/hermes';
import { isHermesConfigured } from '@/lib/hermesConfig';

export function useHermesSessions() {
  const [sessions, setSessions] = useState<HermesSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await isHermesConfigured();
      setConfigured(ok);
      if (!ok) {
        setSessions([]);
        return;
      }
      const list = await hermes.listSessions();
      setSessions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSession = useCallback(async (title?: string) => {
    const session = await hermes.createSession(title);
    setSessions((prev) => [session, ...prev]);
    return session;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await hermes.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const renameSession = useCallback(async (id: string, title: string) => {
    const updated = await hermes.patchSession(id, { title });
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    return updated;
  }, []);

  return {
    sessions,
    loading,
    error,
    configured,
    refresh,
    createSession,
    deleteSession,
    renameSession,
  };
}
