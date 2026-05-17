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
`);

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
