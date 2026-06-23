  /**
   * Web fallback for db.ts — in-memory storage.
   * expo-sqlite's WASM module doesn't resolve under Metro web bundling.
   * This provides the same API surface with ephemeral Maps so the app
   * renders on web without crashing. Data doesn't persist across reloads.
   */
  import type { Schedule } from '@/lib/api';

  // ── In-memory stores ──────────────────────────────────────────────────────────

  const settings = new Map<string, string>();
  let monitoredIds: string[] = [];
  const scheduleCache = new Map<string, { data: Schedule[]; date: string }>();
  let shortcuts: Shortcut[] = [];

  // ── API URL ───────────────────────────────────────────────────────────────────

  export const DEFAULT_API_URL =
    process.env.EXPO_PUBLIC_API_URL ?? 'http://100.101.101.104:8080';

  export function dbGetApiUrl(): string {
    return settings.get('api_url') ?? DEFAULT_API_URL;
  }

  export function dbSetApiUrl(url: string): void {
    settings.set('api_url', url.trim().replace(/\/+$/, ''));
  }

export function dbResetApiUrl(): void {
  settings.delete('api_url');
}

// ── Hermes URL ────────────────────────────────────────────────────────────────

export const DEFAULT_HERMES_URL =
  process.env.EXPO_PUBLIC_HERMES_URL ?? 'http://100.101.101.101:8642';

export function dbGetHermesUrl(): string {
  return settings.get('hermes_url') ?? DEFAULT_HERMES_URL;
}

export function dbSetHermesUrl(url: string): void {
  settings.set('hermes_url', url.trim().replace(/\/+$/, ''));
}

export function dbResetHermesUrl(): void {
  settings.delete('hermes_url');
}

export const DEFAULT_HERMES_DASHBOARD_URL =
  process.env.EXPO_PUBLIC_HERMES_DASHBOARD_URL ?? 'http://100.101.101.101:9119';

export function dbGetHermesDashboardUrl(): string {
  return settings.get('hermes_dashboard_url') ?? DEFAULT_HERMES_DASHBOARD_URL;
}

export function dbSetHermesDashboardUrl(url: string): void {
  settings.set('hermes_dashboard_url', url.trim().replace(/\/+$/, ''));
}

export function dbResetHermesDashboardUrl(): void {
  settings.delete('hermes_dashboard_url');
}

// ── Monitored stations ────────────────────────────────────────────────────────

  export function dbGetMonitoredIds(): string[] {
    return [...monitoredIds];
  }

  export function dbSetMonitoredIds(ids: string[]): void {
    monitoredIds = [...ids];
}

// ── Schedule cache ────────────────────────────────────────────────────────────

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function todayWIB(): string {
  return new Date(
    Date.now() + WIB_OFFSET_MS - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10);
}

export async function dbGetScheduleCache(stationId: string): Promise<Schedule[] | null> {
  const entry = scheduleCache.get(stationId);
  if (!entry || entry.date !== todayWIB()) return null;
  return entry.data;
}

export async function dbSetScheduleCache(stationId: string, data: Schedule[]): Promise<void> {
  scheduleCache.set(stationId, { data, date: todayWIB() });
}

export async function dbPurgeOldSchedules(): Promise<void> {
  const today = todayWIB();
  for (const [k, v] of scheduleCache) {
    if (v.date < today) scheduleCache.delete(k);
  }
}

// ── Shortcuts ─────────────────────────────────────────────────────────────────

export type ShortcutType = 'web' | 'app';

export interface Shortcut {
  url: string;
  label: string;
  favicon: string | null;
  type: ShortcutType;
}

export function dbGetShortcuts(): Shortcut[] {
  return [...shortcuts];
}

export function dbAddShortcut(url: string, label: string, favicon: string | null, type: ShortcutType = 'web'): void {
  if (shortcuts.some((s) => s.url === url.trim())) return;
  shortcuts.push({ url: url.trim(), label: label.trim(), favicon, type });
}

export function dbUpdateFavicon(url: string, favicon: string): void {
  const s = shortcuts.find((s) => s.url === url);
  if (s) s.favicon = favicon;
}

export function dbRemoveShortcut(url: string): void {
  shortcuts = shortcuts.filter((s) => s.url !== url);
}

// ── Dashboard tiles ───────────────────────────────────────────────────────────

export const DASHBOARD_TILE_IDS = [
  'trains',
  'battery',
  'network',
  'location',
  'device',
  'geofences',
] as const;
export type DashboardTileId = (typeof DASHBOARD_TILE_IDS)[number];

const DEFAULT_DASHBOARD_TILES: DashboardTileId[] = ['trains'];
let dashboardTiles: DashboardTileId[] = [...DEFAULT_DASHBOARD_TILES];

export function dbGetDashboardTiles(): DashboardTileId[] {
  return [...dashboardTiles];
}

export function dbSetDashboardTiles(tiles: DashboardTileId[]): void {
  dashboardTiles = [...tiles];
}

// ── Geofences (web stub) ──────────────────────────────────────────────────────

export interface GeofenceRow {
  id: string;
  name: string;
  event_name: string;
  latitude: number;
  longitude: number;
  radius_metres: number;
  enabled: boolean;
  created_at: number;
}

export function dbGetGeofences(): GeofenceRow[] {
  return [];
}

export function dbAddGeofence(
  fence: Omit<GeofenceRow, 'id' | 'created_at'>,
): string {
  return 'web-stub';
}

export function dbUpdateGeofence(
  _id: string,
  _patch: Partial<Omit<GeofenceRow, 'id' | 'created_at'>>,
): void {}

export function dbDeleteGeofence(_id: string): void {}
