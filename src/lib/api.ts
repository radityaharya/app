import { dbGetApiUrl } from '@/lib/db';

interface ApiResponse<T> {
  metadata: { success: boolean; message?: string };
  data: T;
}

async function apiFetch<T>(path: string): Promise<T> {
  const baseUrl = dbGetApiUrl();
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  const json: ApiResponse<T> = await res.json();
  if (!json.metadata.success) {
    throw new Error(json.metadata.message ?? 'API error');
  }
  return json.data;
}

export interface StationMetadata {
  active: boolean;
  origin: { daop: number; fg_enable: number };
}

export interface Station {
  uid: string;
  id: string;
  name: string;
  type: 'KRL' | 'LOCAL' | 'MRT' | 'LRT';
  metadata: StationMetadata;
}

export interface ScheduleMetadata {
  origin: { color: string };
}

export interface Schedule {
  id: string;
  station_id: string;
  station_origin_id: string;
  station_destination_id: string;
  train_id: string;
  line: string;
  route: string;
  departs_at: string;
  arrives_at: string;
  metadata: ScheduleMetadata;
}

export const api = {
  stations: {
    list: () => apiFetch<Station[]>('/v1/stations'),
    get:  (id: string) => apiFetch<Station>(`/v1/stations/${id}`),
  },
  schedule: {
    byStation: (stationId: string) => apiFetch<Schedule[]>(`/v1/schedule/${stationId}`),
  },
};
