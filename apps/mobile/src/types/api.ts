export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMetres: number;
}

export interface PushSendRequest {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: unknown;
}

export interface PushSendResponse {
  tickets: PushTicket[];
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ProximityNotificationData {
  stopId: string;
  stopName: string;
}

export interface GeofencePoint {
  id: string;
  name: string;
  event_name: string;
  latitude: number;
  longitude: number;
  radius_metres: number;
  enabled: boolean;
  created_at: number;
}

export interface GeofenceTriggerRequest {
  event_name: string;
  geofence_id: string;
  latitude: number;
  longitude: number;
  triggered_at: string;
}
