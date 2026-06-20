import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'up-to-date'
  | 'disabled';

export interface UpdateInfo {
  enabled: boolean;
  appVersion: string;
  runtimeVersion: string | null;
  channel: string | null;
  updateId: string | null;
  updatedAt: string | null;
  isEmbeddedLaunch: boolean;
}

interface UpdateCheckResult {
  status: UpdateStatus;
  error?: string;
}

interface UpdateContextValue {
  status: UpdateStatus;
  error: string | null;
  info: UpdateInfo;
  checkForUpdate: (options?: { reloadIfReady?: boolean }) => Promise<UpdateCheckResult>;
  applyUpdate: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

function formatUpdatedAt(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readUpdateInfo(): UpdateInfo {
  const enabled = !__DEV__ && Updates.isEnabled;
  return {
    enabled,
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    runtimeVersion: Updates.runtimeVersion ?? null,
    channel: Updates.channel ?? null,
    updateId: Updates.updateId ?? null,
    updatedAt: formatUpdatedAt(Updates.createdAt),
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}

export function UpdateProvider({
  children,
  autoCheckOnLaunch = true,
}: {
  children: ReactNode;
  autoCheckOnLaunch?: boolean;
}) {
  const [status, setStatus] = useState<UpdateStatus>(() => (__DEV__ ? 'disabled' : 'idle'));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<UpdateInfo>(() => readUpdateInfo());

  const refreshInfo = useCallback(() => {
    setInfo(readUpdateInfo());
  }, []);

  const applyUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    await Updates.reloadAsync();
  }, []);

  const checkForUpdate = useCallback(
    async (options?: { reloadIfReady?: boolean }): Promise<UpdateCheckResult> => {
      refreshInfo();

      if (__DEV__ || !Updates.isEnabled) {
        setStatus('disabled');
        setError(null);
        return { status: 'disabled' };
      }

      try {
        setError(null);
        setStatus('checking');
        const result = await Updates.checkForUpdateAsync();

        if (!result.isAvailable) {
          setStatus('up-to-date');
          return { status: 'up-to-date' };
        }

        setStatus('downloading');
        await Updates.fetchUpdateAsync();
        refreshInfo();
        setStatus('ready');

        if (options?.reloadIfReady) {
          await Updates.reloadAsync();
        }

        return { status: 'ready' };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus('error');
        return { status: 'error', error: message };
      }
    },
    [refreshInfo],
  );

  useEffect(() => {
    if (!autoCheckOnLaunch || __DEV__ || !Updates.isEnabled) return;
    void checkForUpdate({ reloadIfReady: true });
  }, [autoCheckOnLaunch, checkForUpdate]);

  const value = useMemo(
    () => ({
      status,
      error,
      info,
      checkForUpdate,
      applyUpdate,
    }),
    [status, error, info, checkForUpdate, applyUpdate],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdateContext(): UpdateContextValue {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdateContext must be used within UpdateProvider');
  }
  return context;
}

export function updateStatusLabel(status: UpdateStatus): string {
  switch (status) {
    case 'disabled':
      return 'unavailable in dev builds';
    case 'checking':
      return 'checking…';
    case 'downloading':
      return 'downloading…';
    case 'ready':
      return 'ready — tap to restart';
    case 'up-to-date':
      return 'up to date';
    case 'error':
      return 'check failed';
    default:
      return 'not checked yet';
  }
}

export function shortUpdateId(updateId: string | null): string {
  if (!updateId) return 'embedded build';
  return updateId.length > 12 ? `${updateId.slice(0, 8)}…` : updateId;
}
