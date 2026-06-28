import type { Schedule, Station } from '@/lib/api';

const BASE_URL = 'https://kci.id/api/krl';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.5',
};

// --- raw KCI response shapes -------------------------------------------------

interface RawStation {
  sta_id: string;
  sta_name: string;
  group_wil: number;
  fg_enable: number;
}

interface RawStationsResponse {
  status: number;
  data: RawStation[];
}

interface RawScheduleRow {
  train_id: string;
  ka_name: string;
  route_name: string;
  dest: string;
  time_est: string;
  color: string;
  dest_time: string;
}

interface RawScheduleResponse {
  status: number;
  data: RawScheduleRow[];
}

// --- helpers -----------------------------------------------------------------

function stationKey(id: string): string {
  return `st_krl_${id.toLowerCase()}`;
}

const STATION_NAME_FIXES: Record<string, string> = {
  TANJUNGPRIUK: 'TANJUNG PRIOK',
  JAKARTAKOTA: 'JAKARTA KOTA',
  KAMPUNGBANDAN: 'KAMPUNG BANDAN',
  TANAHABANG: 'TANAH ABANG',
  PARUNGPANJANG: 'PARUNG PANJANG',
  BANDARASOEKARNOHATTA: 'BANDARA SOEKARNO HATTA',
};

function fixStationName(name: string): string {
  return STATION_NAME_FIXES[name] ?? name;
}

function parseKRLTime(s: string): string {
  const wibOffset = 7 * 60 * 60 * 1000;
  const now = new Date(Date.now() + wibOffset);
  const [h, m, sec] = s.split(':').map(Number);
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h - 7, m, sec)
  );
  return d.toISOString();
}

// --- public API --------------------------------------------------------------

export async function kciStations(): Promise<Station[]> {
  console.log('[kci] fetching stations from kci.id');
  const res = await fetch(`${BASE_URL}/stations`, { headers: HEADERS });
  if (!res.ok) throw new Error(`kci: stations ${res.status}`);
  console.log(`[kci] stations response: ${res.status}`);

  const raw: RawStationsResponse = await res.json();

  const extras: Station[] = [
    {
      uid: 'st_krl_bst',
      id: 'BST',
      name: 'BANDARA SOEKARNO HATTA',
      type: 'KRL',
      metadata: { active: true, origin: { fg_enable: 1, daop: 1 } },
    },
    {
      uid: 'st_local_ckp',
      id: 'CKP',
      name: 'CIKAMPEK',
      type: 'LOCAL',
      metadata: { active: true, origin: { fg_enable: 1, daop: 1 } },
    },
    {
      uid: 'st_local_pwk',
      id: 'PWK',
      name: 'PURWAKARTA',
      type: 'LOCAL',
      metadata: { active: true, origin: { fg_enable: 1, daop: 2 } },
    },
  ];

  const stations: Station[] = [...extras];

  for (const d of raw.data) {
    if (d.sta_id.includes('WIL')) continue;
    stations.push({
      uid: stationKey(d.sta_id),
      id: d.sta_id,
      name: d.sta_name,
      type: 'KRL',
      metadata: {
        active: true,
        origin: { fg_enable: d.fg_enable, daop: d.group_wil || 1 },
      },
    });
  }

  console.log(`[kci] stations parsed: ${stations.length} total`);
  return stations;
}

export async function kciSchedule(
  stationId: string,
  stations: Station[]
): Promise<Schedule[]> {
  const url = `${BASE_URL}/schedules?stationid=${stationId.toUpperCase()}&timefrom=00:00&timeto=23:00`;
  console.log(`[kci] fetching schedule for ${stationId}`);
  const res = await fetch(url, { headers: HEADERS });
  console.log(`[kci] schedule response for ${stationId}: ${res.status}`);

  if (res.status === 404 || res.status === 500) return [];
  if (!res.ok) throw new Error(`kci: schedule ${stationId} ${res.status}`);

  const raw: RawScheduleResponse = await res.json();

  const nameToId: Record<string, string> = {};
  for (const s of stations) nameToId[s.name] = s.id;

  const schedules: Schedule[] = [];

  for (const d of raw.data) {
    const parts = d.route_name.split('-');
    const originName = fixStationName(parts[0]);
    const destName = parts[1] ? fixStationName(parts[1]) : '';

    try {
      schedules.push({
        id: `sc_krl_${stationId.toLowerCase()}_${d.train_id.toLowerCase()}`,
        station_id: stationId.toUpperCase(),
        station_origin_id: nameToId[originName] ?? '',
        station_destination_id: nameToId[destName] ?? '',
        train_id: d.train_id,
        line: d.ka_name,
        route: d.route_name,
        departs_at: parseKRLTime(d.time_est),
        arrives_at: parseKRLTime(d.dest_time),
        metadata: { origin: { color: d.color } },
      });
    } catch {
      // skip rows with unparseable times
    }
  }

  console.log(`[kci] schedule parsed for ${stationId}: ${schedules.length} rows`);
  return schedules;
}
