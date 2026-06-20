import type {
  HermesDashboardStatus,
  HermesModelAuxiliary,
  HermesModelOptions,
} from '@/types/hermesDashboard';
import { useCallback, useEffect, useState } from 'react';

import { hermesDashboard } from '@/lib/hermesDashboard';
import { isDashboardConfigured } from '@/lib/hermesDashboardConfig';

function formatMainModel(aux?: HermesModelAuxiliary | null): string | null {
  const main = aux?.main;
  if (!main?.provider || !main.model) return null;
  if (main.provider === 'auto' && !main.model) return 'auto';
  return `${main.provider} · ${main.model}`;
}

export function useHermesDashboard() {
  const [configured, setConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [status, setStatus] = useState<HermesDashboardStatus | null>(null);
  const [mainModelLabel, setMainModelLabel] = useState<string | null>(null);
  const [auxiliary, setAuxiliary] = useState<HermesModelAuxiliary | null>(null);
  const [options, setOptions] = useState<HermesModelOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await isDashboardConfigured();
      setConfigured(ok);

      const publicStatus = await hermesDashboard.getStatus();
      setStatus(publicStatus);

      if (!ok) {
        setAuthenticated(false);
        setMainModelLabel(null);
        setAuxiliary(null);
        setOptions(null);
        return;
      }

      await hermesDashboard.login();
      setAuthenticated(true);

      const [aux, opts] = await Promise.all([
        hermesDashboard.getModelAuxiliary(),
        hermesDashboard.getModelOptions(),
      ]);
      setAuxiliary(aux);
      setOptions(opts);
      setMainModelLabel(formatMainModel(aux));
    } catch (e) {
      setAuthenticated(false);
      setError(e instanceof Error ? e.message : 'Dashboard unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setMainModel = useCallback(
    async (provider: string, model: string) => {
      await hermesDashboard.setMainModel(provider, model);
      await refresh();
    },
    [refresh],
  );

  const resetAuxiliary = useCallback(async () => {
    await hermesDashboard.resetAuxiliaryModels();
    await refresh();
  }, [refresh]);

  const restartGateway = useCallback(async () => {
    await hermesDashboard.restartGateway();
    await refresh();
  }, [refresh]);

  return {
    configured,
    authenticated,
    status,
    mainModelLabel,
    auxiliary,
    options,
    loading,
    error,
    refresh,
    setMainModel,
    resetAuxiliary,
    restartGateway,
  };
}
