/**
 * SQLite persistence layer using expo-sqlite.
 *
 * Single database: commuter.db (at defaultDatabaseDirectory)
 * Tables:
 *   settings           — key/value (api_url, etc.)
 *   monitored_stations — ordered station IDs for proximity alerts
 *   schedules          — today's departure cache per station
 *
 * All settings writes are synchronous — no concurrent corruption possible.
 * Schedule reads/writes are async (large JSON payloads).
 */
import { openDatabaseSync } from 'expo-sqlite';
import type { Schedule } from '@/lib/api';

// ── Open & migrate ────────────────────────────────────────────────────────────

const db = openDatabaseSync('commuter.db');

db.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS monitored_stations (
    position INTEGER PRIMARY KEY AUTOINCREMENT,
    id       TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS schedules (
    station_id TEXT NOT NULL,
    date       TEXT NOT NULL,
    data       TEXT NOT NULL,
    synced_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (station_id, date)
  );

  CREATE TABLE IF NOT EXISTS shortcuts (
    position INTEGER PRIMARY KEY AUTOINCREMENT,
    url      TEXT NOT NULL UNIQUE,
    label    TEXT NOT NULL,
    favicon  TEXT,
    type     TEXT NOT NULL DEFAULT 'web'
  );

  CREATE TABLE IF NOT EXISTS geofences (
    id            TEXT PRIMARY KEY NOT NULL,
    name          TEXT NOT NULL,
    event_name    TEXT NOT NULL,
    latitude      REAL NOT NULL,
    longitude     REAL NOT NULL,
    radius_metres INTEGER NOT NULL DEFAULT 300,
    enabled       INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
`);

// ── Migrations (add columns to existing tables) ──────────────────────────────

try { db.execSync(`ALTER TABLE shortcuts ADD COLUMN favicon TEXT`); } catch {}
try { db.execSync(`ALTER TABLE shortcuts ADD COLUMN type TEXT NOT NULL DEFAULT 'web'`); } catch {}

// ── Settings helpers ──────────────────────────────────────────────────────────

function getSetting(key: string): string | null {
  return db.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', key
  )?.value ?? null;
}

function setSetting(key: string, value: string): void {
  db.runSync(
    'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    key, value
  );
}

function delSetting(key: string): void {
  db.runSync('DELETE FROM settings WHERE key = ?', key);
}

// ── API URL ───────────────────────────────────────────────────────────────────

export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://100.101.101.104:8080';

export function dbGetApiUrl(): string {
  return getSetting('api_url') ?? DEFAULT_API_URL;
}

export function dbSetApiUrl(url: string): void {
  setSetting('api_url', url.trim().replace(/\/+$/, ''));
}

export function dbResetApiUrl(): void {
  delSetting('api_url');
}

// ── Hermes URL ────────────────────────────────────────────────────────────────

export const DEFAULT_HERMES_URL =
  process.env.EXPO_PUBLIC_HERMES_URL ?? 'http://100.101.101.101:8642';

export function dbGetHermesUrl(): string {
  return getSetting('hermes_url') ?? DEFAULT_HERMES_URL;
}

export function dbSetHermesUrl(url: string): void {
  setSetting('hermes_url', url.trim().replace(/\/+$/, ''));
}

export function dbResetHermesUrl(): void {
  delSetting('hermes_url');
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export type ThemeScheme = 'light' | 'dark';

export function dbGetThemeScheme(): ThemeScheme {
  return getSetting('theme_scheme') === 'light' ? 'light' : 'dark';
}

export function dbSetThemeScheme(scheme: ThemeScheme): void {
  setSetting('theme_scheme', scheme);
}

// ── KCI direct fallback ───────────────────────────────────────────────────────

export function dbGetKciFallback(): boolean {
  return getSetting('kci_fallback') === 'true';
}

export function dbSetKciFallback(enabled: boolean): void {
  setSetting('kci_fallback', enabled ? 'true' : 'false');
}

// ── Hermes Dashboard URL ──────────────────────────────────────────────────────

export const DEFAULT_HERMES_DASHBOARD_URL =
  process.env.EXPO_PUBLIC_HERMES_DASHBOARD_URL ?? 'http://100.101.101.101:9119';

export function dbGetHermesDashboardUrl(): string {
  return getSetting('hermes_dashboard_url') ?? DEFAULT_HERMES_DASHBOARD_URL;
}

export function dbSetHermesDashboardUrl(url: string): void {
  setSetting('hermes_dashboard_url', url.trim().replace(/\/+$/, ''));
}

export function dbResetHermesDashboardUrl(): void {
  delSetting('hermes_dashboard_url');
}

// ── Monitored stations ────────────────────────────────────────────────────────

export function dbGetMonitoredIds(): string[] {
  return db
    .getAllSync<{ id: string }>('SELECT id FROM monitored_stations ORDER BY position')
    .map((r) => r.id);
}

export function dbSetMonitoredIds(ids: string[]): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM monitored_stations');
    for (const id of ids) {
      db.runSync('INSERT OR IGNORE INTO monitored_stations (id) VALUES (?)', id);
    }
  });
}

// ── Schedule cache ────────────────────────────────────────────────────────────

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function todayWIB(): string {
  return new Date(
    Date.now() + WIB_OFFSET_MS - new Date().getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);
}

export async function dbGetScheduleCache(stationId: string): Promise<Schedule[] | null> {
  const row = await db.getFirstAsync<{ data: string }>(
    'SELECT data FROM schedules WHERE station_id = ? AND date = ?',
    stationId, todayWIB()
  );
  if (!row) return null;
  try { return JSON.parse(row.data) as Schedule[]; } catch { return null; }
}

export async function dbSetScheduleCache(stationId: string, schedules: Schedule[]): Promise<void> {
  await db.runAsync(
    `INSERT INTO schedules (station_id, date, data) VALUES (?,?,?)
     ON CONFLICT(station_id, date) DO UPDATE SET data=excluded.data, synced_at=strftime('%s','now')`,
    stationId, todayWIB(), JSON.stringify(schedules)
  );
}

export async function dbPurgeOldSchedules(): Promise<void> {
  await db.runAsync('DELETE FROM schedules WHERE date < ?', todayWIB());
}

// ── Shortcuts ─────────────────────────────────────────────────────────────────

export type ShortcutType = 'web' | 'app';

export interface Shortcut {
  url: string;
  label: string;
  /** Base64 data URI of the favicon/icon, or null if fetch failed. */
  favicon: string | null;
  /** 'web' opens in-app browser, 'app' launches via deep link / package URI. */
  type: ShortcutType;
}

export function dbGetShortcuts(): Shortcut[] {
  return db.getAllSync<Shortcut>('SELECT url, label, favicon, type FROM shortcuts ORDER BY position');
}

export function dbAddShortcut(url: string, label: string, favicon: string | null, type: ShortcutType = 'web'): void {
  db.runSync(
    'INSERT OR IGNORE INTO shortcuts (url, label, favicon, type) VALUES (?, ?, ?, ?)',
    url.trim(), label.trim(), favicon, type,
  );
}

export function dbUpdateFavicon(url: string, favicon: string): void {
  db.runSync('UPDATE shortcuts SET favicon = ? WHERE url = ?', favicon, url);
}

export function dbRemoveShortcut(url: string): void {
  db.runSync('DELETE FROM shortcuts WHERE url = ?', url);
}

// ── Geofences ─────────────────────────────────────────────────────────────────

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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type GeofenceRowRaw = Omit<GeofenceRow, 'enabled'> & { enabled: number };

export function dbGetGeofences(): GeofenceRow[] {
  return db
    .getAllSync<GeofenceRowRaw>(
      'SELECT id, name, event_name, latitude, longitude, radius_metres, enabled, created_at FROM geofences ORDER BY created_at',
    )
    .map((r) => ({ ...r, enabled: r.enabled === 1 }));
}

export function dbAddGeofence(
  fence: Omit<GeofenceRow, 'id' | 'created_at'>,
): string {
  const id = generateId();
  db.runSync(
    'INSERT OR IGNORE INTO geofences (id, name, event_name, latitude, longitude, radius_metres, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    fence.name,
    fence.event_name,
    fence.latitude,
    fence.longitude,
    fence.radius_metres,
    fence.enabled ? 1 : 0,
  );
  return id;
}

export function dbUpdateGeofence(
  id: string,
  patch: Partial<Omit<GeofenceRow, 'id' | 'created_at'>>,
): void {
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  if (patch.name !== undefined)          { sets.push('name=?');          vals.push(patch.name); }
  if (patch.event_name !== undefined)    { sets.push('event_name=?');    vals.push(patch.event_name); }
  if (patch.latitude !== undefined)      { sets.push('latitude=?');      vals.push(patch.latitude); }
  if (patch.longitude !== undefined)     { sets.push('longitude=?');     vals.push(patch.longitude); }
  if (patch.radius_metres !== undefined) { sets.push('radius_metres=?'); vals.push(patch.radius_metres); }
  if (patch.enabled !== undefined)       { sets.push('enabled=?');       vals.push(patch.enabled ? 1 : 0); }
  if (sets.length === 0) return;
  db.runSync(`UPDATE geofences SET ${sets.join(',')} WHERE id=?`, ...vals, id);
}

export function dbDeleteGeofence(id: string): void {
  db.runSync('DELETE FROM geofences WHERE id = ?', id);
}

// ── Dashboard tiles ───────────────────────────────────────────────────────────

export const DASHBOARD_TILE_IDS = [
  'battery',
  'network',
  'location',
  'device',
  'geofences',
] as const;
export type DashboardTileId = (typeof DASHBOARD_TILE_IDS)[number];

const DEFAULT_DASHBOARD_TILES: DashboardTileId[] = [];

export function dbGetDashboardTiles(): DashboardTileId[] {
  const raw = getSetting('dashboard_tiles');
  if (!raw) return [...DEFAULT_DASHBOARD_TILES];
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((id): id is DashboardTileId =>
      (DASHBOARD_TILE_IDS as readonly string[]).includes(id),
    );
  } catch {
    return [...DEFAULT_DASHBOARD_TILES];
  }
}

export function dbSetDashboardTiles(tiles: DashboardTileId[]): void {
  setSetting('dashboard_tiles', JSON.stringify(tiles));
}
