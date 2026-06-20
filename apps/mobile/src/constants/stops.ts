/**
 * KRL station coordinate registry.
 *
 * Coordinates are required for geofence proximity alerts.
 * The KRL API does not return lat/lng, so we maintain them here.
 * Station IDs match the sta_id returned by GET /v1/stations.
 *
 * Only Jabodetabek-area stations are included — outer stations
 * (Yogyakarta, Merak, etc.) are not relevant for proximity alerts.
 */

export interface StationCoords {
  latitude: number;
  longitude: number;
  /** Geofence radius in metres */
  radiusMetres: number;
}

/** Coordinate lookup keyed by KRL station ID. */
export const STATION_COORDS: Record<string, StationCoords> = {
  AC:   { latitude: -6.1258, longitude: 106.8615, radiusMetres: 300 },
  AK:   { latitude: -6.1507, longitude: 106.8099, radiusMetres: 300 },
  BJD:  { latitude: -6.5018, longitude: 106.7882, radiusMetres: 300 },
  BKS:  { latitude: -6.2380, longitude: 106.9916, radiusMetres: 300 },
  BKST: { latitude: -6.2474, longitude: 107.0201, radiusMetres: 300 },
  BOI:  { latitude: -6.1626, longitude: 106.7335, radiusMetres: 300 },
  BOO:  { latitude: -6.5954, longitude: 106.7890, radiusMetres: 400 },
  BPR:  { latitude: -6.1572, longitude: 106.6921, radiusMetres: 300 },
  BUA:  { latitude: -6.2052, longitude: 106.9505, radiusMetres: 300 },
  BST:  { latitude: -6.1256, longitude: 106.6559, radiusMetres: 400 },
  CBN:  { latitude: -6.4856, longitude: 106.8440, radiusMetres: 300 },
  CC:   { latitude: -6.2789, longitude: 106.6527, radiusMetres: 300 },
  CIT:  { latitude: -6.2087, longitude: 107.0635, radiusMetres: 300 },
  CJT:  { latitude: -6.3813, longitude: 106.7007, radiusMetres: 300 },
  CKI:  { latitude: -6.1953, longitude: 106.8429, radiusMetres: 300 },
  CKR:  { latitude: -6.2455, longitude: 107.1383, radiusMetres: 300 },
  CKP:  { latitude: -6.3657, longitude: 107.4630, radiusMetres: 400 },
  CKY:  { latitude: -6.2747, longitude: 107.1782, radiusMetres: 300 },
  CLT:  { latitude: -6.5320, longitude: 106.8095, radiusMetres: 300 },
  CSK:  { latitude: -6.3266, longitude: 106.6436, radiusMetres: 300 },
  CTA:  { latitude: -6.4328, longitude: 106.8160, radiusMetres: 300 },
  CTR:  { latitude: -6.3148, longitude: 106.5263, radiusMetres: 300 },
  CUK:  { latitude: -6.1952, longitude: 106.9581, radiusMetres: 300 },
  CW:   { latitude: -6.2427, longitude: 106.8680, radiusMetres: 300 },
  DAR:  { latitude: -6.2890, longitude: 106.5518, radiusMetres: 300 },
  DP:   { latitude: -6.3920, longitude: 106.8189, radiusMetres: 300 },
  DPB:  { latitude: -6.3819, longitude: 106.8189, radiusMetres: 300 },
  DRN:  { latitude: -6.2494, longitude: 106.8521, radiusMetres: 300 },
  DU:   { latitude: -6.1620, longitude: 106.7898, radiusMetres: 300 },
  GDD:  { latitude: -6.1921, longitude: 106.8357, radiusMetres: 300 },
  GGL:  { latitude: -6.1673, longitude: 106.7978, radiusMetres: 300 },
  GST:  { latitude: -6.1752, longitude: 106.8637, radiusMetres: 300 },
  JAKK: { latitude: -6.1375, longitude: 106.8132, radiusMetres: 300 },
  JTK:  { latitude: -6.2436, longitude: 106.6785, radiusMetres: 300 },
  JAY:  { latitude: -6.1395, longitude: 106.8218, radiusMetres: 300 },
  JMU:  { latitude: -6.2843, longitude: 106.7329, radiusMetres: 300 },
  JNG:  { latitude: -6.2149, longitude: 106.8703, radiusMetres: 300 },
  JUA:  { latitude: -6.1664, longitude: 106.8302, radiusMetres: 300 },
  KAT:  { latitude: -6.2029, longitude: 106.8179, radiusMetres: 300 },
  KBY:  { latitude: -6.2580, longitude: 106.7779, radiusMetres: 300 },
  KDS:  { latitude: -6.1553, longitude: 106.7033, radiusMetres: 300 },
  KLD:  { latitude: -6.2063, longitude: 106.9330, radiusMetres: 300 },
  KLDB: { latitude: -6.2027, longitude: 106.9436, radiusMetres: 300 },
  KMO:  { latitude: -6.1625, longitude: 106.8529, radiusMetres: 300 },
  KMT:  { latitude: -6.1768, longitude: 106.8572, radiusMetres: 300 },
  KPB:  { latitude: -6.1485, longitude: 106.8027, radiusMetres: 300 },
  KRI:  { latitude: -6.2265, longitude: 106.9837, radiusMetres: 300 },
  LNA:  { latitude: -6.3356, longitude: 106.8206, radiusMetres: 300 },
  MGB:  { latitude: -6.1518, longitude: 106.8218, radiusMetres: 300 },
  MTR:  { latitude: -6.2109, longitude: 106.8618, radiusMetres: 300 },
  MRI:  { latitude: -6.2099, longitude: 106.8502, radiusMetres: 300 },
  TLM:  { latitude: -6.1930, longitude: 107.0350, radiusMetres: 300 },
  NMO:  { latitude: -6.5094, longitude: 106.8958, radiusMetres: 300 },
  PDRG: { latitude: -6.4680, longitude: 106.8735, radiusMetres: 300 },
  PDJ:  { latitude: -6.2746, longitude: 106.7473, radiusMetres: 300 },
  PI:   { latitude: -6.1485, longitude: 106.6847, radiusMetres: 300 },
  PLM:  { latitude: -6.2094, longitude: 106.8013, radiusMetres: 300 },
  POC:  { latitude: -6.3703, longitude: 106.8307, radiusMetres: 300 },
  POK:  { latitude: -6.2054, longitude: 106.8802, radiusMetres: 300 },
  PRP:  { latitude: -6.3527, longitude: 106.5458, radiusMetres: 300 },
  PSE:  { latitude: -6.1766, longitude: 106.8455, radiusMetres: 300 },
  PSG:  { latitude: -6.1564, longitude: 106.7878, radiusMetres: 300 },
  PSM:  { latitude: -6.2874, longitude: 106.8366, radiusMetres: 300 },
  PSMB: { latitude: -6.2960, longitude: 106.8406, radiusMetres: 300 },
  RJW:  { latitude: -6.1485, longitude: 106.8438, radiusMetres: 300 },
  RU:   { latitude: -6.3013, longitude: 106.6930, radiusMetres: 300 },
  RW:   { latitude: -6.1534, longitude: 106.7417, radiusMetres: 300 },
  SDM:  { latitude: -6.2665, longitude: 106.7119, radiusMetres: 300 },
  SRP:  { latitude: -6.3311, longitude: 106.6682, radiusMetres: 300 },
  SUDB: { latitude: -6.2078, longitude: 106.8195, radiusMetres: 300 },
  SUD:  { latitude: -6.2073, longitude: 106.8231, radiusMetres: 300 },
  SW:   { latitude: -6.1566, longitude: 106.8283, radiusMetres: 300 },
  TB:   { latitude: -6.2183, longitude: 107.0214, radiusMetres: 300 },
  TEB:  { latitude: -6.2267, longitude: 106.8612, radiusMetres: 300 },
  TGS:  { latitude: -6.3101, longitude: 106.5174, radiusMetres: 300 },
  THB:  { latitude: -6.1887, longitude: 106.8112, radiusMetres: 300 },
  TKO:  { latitude: -6.1584, longitude: 106.7550, radiusMetres: 300 },
  TNG:  { latitude: -6.1776, longitude: 106.6319, radiusMetres: 300 },
  TNT:  { latitude: -6.3157, longitude: 106.8318, radiusMetres: 300 },
  TPK:  { latitude: -6.1078, longitude: 106.8706, radiusMetres: 300 },
  THI:  { latitude: -6.1701, longitude: 106.6544, radiusMetres: 300 },
  UI:   { latitude: -6.3603, longitude: 106.8305, radiusMetres: 300 },
  UP:   { latitude: -6.3149, longitude: 106.8283, radiusMetres: 300 },
};

/** Station IDs that have coordinates — the only ones usable for proximity alerts. */
export const COORDINATED_STATION_IDS = new Set(Object.keys(STATION_COORDS));

/** Default monitored stations for first-run. */
export const DEFAULT_MONITORED_IDS: string[] = [
  'MRI', 'JAKK', 'GMR', 'THB', 'DU', 'BOO', 'DP', 'BKS', 'SDM',
];

/** Minimum ms between notifications for the same stop. */
export const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;
