import { useCallback, useEffect, useState } from 'react';

import { hermes } from '@/lib/hermes';
import { isHermesConfigured } from '@/lib/hermesConfig';

export function useHermesConnection() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const configured = await isHermesConfigured();
      if (!configured) {
        setConnected(false);
        return;
      }
      const health = await hermes.getHealth();
      setConnected(health.status === 'ok');
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { connected, checking, refresh: check };
}
