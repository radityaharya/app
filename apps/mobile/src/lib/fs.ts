/**
 * File system layer using expo-file-system legacy API.
 *
 * Data directory (user-configurable):
 *   Default → FileSystem.documentDirectory (private, persists across restarts)
 *   Custom  → Android SAF URI chosen via StorageAccessFramework
 *
 * A meta-file at documentDirectory/data_location.json stores the chosen URI.
 *
 * Schedule cache always goes to FileSystem.cacheDirectory (OS may purge it).
 */
import * as FileSystem from 'expo-file-system/legacy';

// ── Data directory ────────────────────────────────────────────────────────────

const META_FILENAME = 'data_location.json';
const DOC_DIR = FileSystem.documentDirectory!; // always the app private folder

let _dataDir: string | null = null; // cached in memory

async function metaRead(): Promise<string | null> {
  const uri = DOC_DIR + META_FILENAME;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(uri);
    const { dir } = JSON.parse(raw) as { dir: string };
    return dir ?? null;
  } catch {
    return null;
  }
}

async function metaWrite(dir: string): Promise<void> {
  await FileSystem.writeAsStringAsync(
    DOC_DIR + META_FILENAME,
    JSON.stringify({ dir }),
  );
}

async function metaDelete(): Promise<void> {
  try {
    await FileSystem.deleteAsync(DOC_DIR + META_FILENAME, { idempotent: true });
  } catch {}
}

/** Returns the active data directory URI (always ends with /). */
export async function getDataDir(): Promise<string> {
  if (_dataDir) return _dataDir;
  const saved = await metaRead();
  _dataDir = saved ?? DOC_DIR;
  return _dataDir;
}

/**
 * Open the Android Storage Access Framework folder picker.
 * iOS falls back silently (no picker available).
 * Returns the chosen URI string, or null if cancelled / unsupported.
 */
export async function pickDataDir(): Promise<string | null> {
  try {
    const result =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!result.granted) return null;
    const uri = result.directoryUri;
    await metaWrite(uri);
    _dataDir = uri;
    return uri;
  } catch {
    return null;
  }
}

/** Reset to the default documents directory. */
export async function resetDataDir(): Promise<void> {
  await metaDelete();
  _dataDir = DOC_DIR;
}

/** Human-readable label for the current data directory. */
export async function dataDirLabel(): Promise<string> {
  const dir = await getDataDir();
  if (dir === DOC_DIR) return 'App documents (default)';
  // Decode percent-encoded SAF URI for readability
  return decodeURIComponent(dir);
}

// ── Generic read / write ──────────────────────────────────────────────────────

/**
 * Write a JSON file into the data directory.
 * On SAF URIs, creates the file via SAF. On regular file:// URIs, writes directly.
 */
async function writeDataJSON(filename: string, data: unknown): Promise<void> {
  const dir = await getDataDir();
  const content = JSON.stringify(data);

  if (dir.startsWith('content://')) {
    // Android Storage Access Framework path
    try {
      // Find or create the file
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(dir);
      let fileUri = files.find((f) => f.endsWith('/' + filename) || f.endsWith('%2F' + filename));
      if (!fileUri) {
        fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          dir,
          filename,
          'application/json',
        );
      }
      await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, content);
    } catch (e) {
      console.warn('[fs] SAF write failed, falling back to doc dir', e);
      await FileSystem.writeAsStringAsync(DOC_DIR + filename, content);
    }
  } else {
    await FileSystem.writeAsStringAsync(dir + filename, content);
  }
}

async function readDataJSON<T>(filename: string): Promise<T | null> {
  const dir = await getDataDir();

  try {
    if (dir.startsWith('content://')) {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(dir);
      const fileUri = files.find(
        (f) => f.endsWith('/' + filename) || f.endsWith('%2F' + filename),
      );
      if (!fileUri) return null;
      const raw = await FileSystem.StorageAccessFramework.readAsStringAsync(fileUri);
      return JSON.parse(raw) as T;
    } else {
      const info = await FileSystem.getInfoAsync(dir + filename);
      if (!info.exists) return null;
      const raw = await FileSystem.readAsStringAsync(dir + filename);
      return JSON.parse(raw) as T;
    }
  } catch {
    return null;
  }
}

// ── API URL ───────────────────────────────────────────────────────────────────

const API_URL_FILE = DOC_DIR + 'api_url.json';
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://100.101.101.104:8080';

// In-memory cache so every apiFetch() call doesn't hit disk.
let _apiUrl: string | null = null;

export async function fsGetApiUrl(): Promise<string> {
  if (_apiUrl) return _apiUrl;
  try {
    const info = await FileSystem.getInfoAsync(API_URL_FILE);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(API_URL_FILE);
      const { url } = JSON.parse(raw) as { url: string };
      if (url) {
        _apiUrl = url;
        return url;
      }
    }
  } catch {}
  _apiUrl = DEFAULT_API_URL;
  return DEFAULT_API_URL;
}

export async function fsSetApiUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/+$/, ''); // strip trailing slashes
  await FileSystem.writeAsStringAsync(API_URL_FILE, JSON.stringify({ url: trimmed }));
  _apiUrl = trimmed;
}

export async function fsResetApiUrl(): Promise<void> {
  try {
    await FileSystem.deleteAsync(API_URL_FILE, { idempotent: true });
  } catch {}
  _apiUrl = DEFAULT_API_URL;
}

export { DEFAULT_API_URL };

// ── Monitored station IDs ────────────────────────────────────────────────────

const MONITORED_FILE = 'monitored_stations.json';

export async function fsReadMonitoredIds(): Promise<string[] | null> {
  return readDataJSON<string[]>(MONITORED_FILE);
}

export async function fsWriteMonitoredIds(ids: string[]): Promise<void> {
  await writeDataJSON(MONITORED_FILE, ids);
}

// ── Schedule cache ────────────────────────────────────────────────────────────
// Always uses FileSystem.cacheDirectory — never in the user-chosen folder.

interface ScheduleCacheEntry<T> {
  date: string; // YYYY-MM-DD WIB
  data: T;
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function todayWIB(): string {
  return new Date(Date.now() + WIB_OFFSET_MS - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function scheduleCacheUri(stationId: string): string {
  return FileSystem.cacheDirectory + `schedule_${stationId.toLowerCase()}.json`;
}

export async function fsReadScheduleCache<T>(stationId: string): Promise<T | null> {
  try {
    const uri = scheduleCacheUri(stationId);
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(uri);
    const entry = JSON.parse(raw) as ScheduleCacheEntry<T>;
    if (entry.date !== todayWIB()) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function fsWriteScheduleCache<T>(stationId: string, data: T): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(
      scheduleCacheUri(stationId),
      JSON.stringify({ date: todayWIB(), data }),
    );
  } catch {}
}

export async function fsInvalidateScheduleCache(stationId: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(scheduleCacheUri(stationId), { idempotent: true });
  } catch {}
}
