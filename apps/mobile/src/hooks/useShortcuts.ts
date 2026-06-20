/**
 * Reactive hook for shortcuts (web + app) stored in SQLite.
 *
 * - addWeb(url): fetches favicon, saves as 'web' type.
 * - addApp(uri, label, favicon?): saves as 'app' type.
 *   uri is the deep link / package scheme (e.g. "twitter://", "com.whatsapp").
 */
import { useCallback, useEffect, useState } from 'react';
import {
  dbGetShortcuts,
  dbAddShortcut,
  dbRemoveShortcut,
  dbUpdateFavicon,
  type Shortcut,
} from '@/lib/db';
import { fetchFavicon, labelFromUrl } from '@/lib/favicon';

type Listener = (shortcuts: Shortcut[]) => void;
const _listeners = new Set<Listener>();
let _shortcuts: Shortcut[] = dbGetShortcuts();

function reload() {
  _shortcuts = dbGetShortcuts();
  _listeners.forEach((fn) => fn([..._shortcuts]));
}

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(_shortcuts);

  useEffect(() => {
    const listener: Listener = (next) => setShortcuts(next);
    _listeners.add(listener);
    setShortcuts([..._shortcuts]);
    return () => { _listeners.delete(listener); };
  }, []);

  /** Add a web shortcut. Fetches favicon before persisting. */
  const addWeb = useCallback(async (url: string) => {
    const normalized = url.match(/^https?:\/\//) ? url : `https://${url}`;
    const label = labelFromUrl(normalized);
    const favicon = await fetchFavicon(normalized);
    dbAddShortcut(normalized, label, favicon, 'web');
    reload();
  }, []);

  /**
   * Add an app shortcut.
   * uri: the deep link or package scheme (e.g. "twitter://", "whatsapp://", "maps://")
   * label: display name for the shortcut
   * favicon: optional base64 data URI for the icon (user can skip)
   */
  const addApp = useCallback((uri: string, label: string, favicon: string | null = null) => {
    dbAddShortcut(uri.trim(), label.trim(), favicon, 'app');
    reload();
  }, []);

  const remove = useCallback((url: string) => {
    dbRemoveShortcut(url);
    reload();
  }, []);

  const refreshFavicon = useCallback(async (url: string) => {
    const favicon = await fetchFavicon(url);
    if (favicon) {
      dbUpdateFavicon(url, favicon);
      reload();
    }
  }, []);

  return { shortcuts, addWeb, addApp, remove, refreshFavicon };
}
