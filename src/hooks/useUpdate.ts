import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'up-to-date';

export function useUpdate() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only check for updates in production builds, not in dev client
    if (__DEV__) return;
    checkAndApply();
  }, []);

  async function checkAndApply() {
    try {
      setStatus('checking');
      const result = await Updates.checkForUpdateAsync();

      if (!result.isAvailable) {
        setStatus('up-to-date');
        return;
      }

      setStatus('downloading');
      await Updates.fetchUpdateAsync();
      setStatus('ready');

      // Reload immediately — update is applied on next launch otherwise
      await Updates.reloadAsync();
    } catch (err) {
      setError(String(err));
      setStatus('error');
    }
  }

  return { status, error, checkAndApply };
}
