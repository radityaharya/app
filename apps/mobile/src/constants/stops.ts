/**
 * KRL station coordinate registry.
 *
 * Coordinates are required for geofence proximity alerts.
 * The KRL API does not return lat/lng, so we maintain them here.
 * Station IDs match the sta_id returned by GET /v1/stations.
 *
 * Source: KCI/KAI Commuter public route/schedule pages (public-map seed points).
 * Requires final field/OSM verification.
 */

export interface StationCoords {
  latitude: number;
  longitude: number;
  /** Geofence radius in metres */
  radiusMetres: number;
}

/** Coordinate lookup keyed by KRL station ID. */
export const STATION_COORDS: Record<string, StationCoords> = {
  // ── Bogor line ────────────────────────────────────────────────────────────
  JAKK: { latitude: -6.137579, longitude: 106.814634, radiusMetres: 300 },
  JAY:  { latitude: -6.141300, longitude: 106.823400, radiusMetres: 300 },
  MGB:  { latitude: -6.149200, longitude: 106.826800, radiusMetres: 300 },
  SW:   { latitude: -6.160200, longitude: 106.827300, radiusMetres: 300 },
  JUA:  { latitude: -6.166900, longitude: 106.830700, radiusMetres: 300 },
  GDD:  { latitude: -6.185700, longitude: 106.832700, radiusMetres: 300 },
  CKI:  { latitude: -6.198600, longitude: 106.841700, radiusMetres: 300 },
  MRI:  { latitude: -6.210600, longitude: 106.850700, radiusMetres: 300 },
  TEB:  { latitude: -6.226300, longitude: 106.858500, radiusMetres: 300 },
  CW:   { latitude: -6.243000, longitude: 106.858800, radiusMetres: 300 },
  DRN:  { latitude: -6.255300, longitude: 106.855900, radiusMetres: 300 },
  PSMB: { latitude: -6.262500, longitude: 106.852500, radiusMetres: 300 },
  PSM:  { latitude: -6.284500, longitude: 106.844400, radiusMetres: 300 },
  TNT:  { latitude: -6.307700, longitude: 106.838600, radiusMetres: 300 },
  LNA:  { latitude: -6.330300, longitude: 106.834000, radiusMetres: 300 },
  UP:   { latitude: -6.339600, longitude: 106.831800, radiusMetres: 300 },
  UI:   { latitude: -6.360600, longitude: 106.831400, radiusMetres: 300 },
  POC:  { latitude: -6.370600, longitude: 106.832000, radiusMetres: 300 },
  DPB:  { latitude: -6.389500, longitude: 106.822800, radiusMetres: 300 },
  DP:   { latitude: -6.404400, longitude: 106.817000, radiusMetres: 300 },
  CTA:  { latitude: -6.448600, longitude: 106.802400, radiusMetres: 300 },
  BJD:  { latitude: -6.493100, longitude: 106.796700, radiusMetres: 300 },
  CLT:  { latitude: -6.530700, longitude: 106.800400, radiusMetres: 300 },
  BOO:  { latitude: -6.594500, longitude: 106.790200, radiusMetres: 400 },

  // ── Nambo branch ──────────────────────────────────────────────────────────
  PDRG: { latitude: -6.451700, longitude: 106.828700, radiusMetres: 300 },
  CBG:  { latitude: -6.464000, longitude: 106.854500, radiusMetres: 300 },
  NMO:  { latitude: -6.466400, longitude: 106.886800, radiusMetres: 300 },

  // ── Cikarang line ─────────────────────────────────────────────────────────
  CKR:  { latitude: -6.255700, longitude: 107.145100, radiusMetres: 300 },
  MTM:  { latitude: -6.275000, longitude: 107.103000, radiusMetres: 300 },
  CIT:  { latitude: -6.261500, longitude: 107.083600, radiusMetres: 300 },
  TB:   { latitude: -6.258700, longitude: 107.051600, radiusMetres: 300 },
  BKST: { latitude: -6.246600, longitude: 107.016700, radiusMetres: 300 },
  BKS:  { latitude: -6.236700, longitude: 106.999100, radiusMetres: 300 },
  KRI:  { latitude: -6.224000, longitude: 106.978000, radiusMetres: 300 },
  CUK:  { latitude: -6.219700, longitude: 106.951000, radiusMetres: 300 },
  KLDB: { latitude: -6.218400, longitude: 106.929600, radiusMetres: 300 },
  BUA:  { latitude: -6.215100, longitude: 106.916500, radiusMetres: 300 },
  KLD:  { latitude: -6.213300, longitude: 106.899200, radiusMetres: 300 },
  JNG:  { latitude: -6.214900, longitude: 106.870500, radiusMetres: 300 },
  MTN:  { latitude: -6.203400, longitude: 106.858400, radiusMetres: 300 },
  SUD:  { latitude: -6.203600, longitude: 106.822900, radiusMetres: 300 },
  BNC:  { latitude: -6.201800, longitude: 106.819300, radiusMetres: 300 },
  KAT:  { latitude: -6.200817, longitude: 106.815900, radiusMetres: 300 },
  THB:  { latitude: -6.185700, longitude: 106.810700, radiusMetres: 300 },
  DU:   { latitude: -6.155800, longitude: 106.801200, radiusMetres: 300 },
  AK:   { latitude: -6.144400, longitude: 106.800200, radiusMetres: 300 },
  KPB:  { latitude: -6.132500, longitude: 106.828600, radiusMetres: 300 },
  RJW:  { latitude: -6.145800, longitude: 106.835900, radiusMetres: 300 },
  KMO:  { latitude: -6.160000, longitude: 106.842500, radiusMetres: 300 },
  PSE:  { latitude: -6.173900, longitude: 106.844100, radiusMetres: 300 },
  GST:  { latitude: -6.185900, longitude: 106.852800, radiusMetres: 300 },
  KMT:  { latitude: -6.198200, longitude: 106.862000, radiusMetres: 300 },
  POKJ: { latitude: -6.207800, longitude: 106.862000, radiusMetres: 300 },

  // ── Rangkasbitung line ────────────────────────────────────────────────────
  PLM:  { latitude: -6.207366, longitude: 106.797471, radiusMetres: 300 },
  KBY:  { latitude: -6.237700, longitude: 106.782500, radiusMetres: 300 },
  PDJ:  { latitude: -6.276800, longitude: 106.744700, radiusMetres: 300 },
  JMU:  { latitude: -6.288300, longitude: 106.729000, radiusMetres: 300 },
  SDM:  { latitude: -6.296000, longitude: 106.712200, radiusMetres: 300 },
  RU:   { latitude: -6.314200, longitude: 106.676700, radiusMetres: 300 },
  SRP:  { latitude: -6.320000, longitude: 106.665400, radiusMetres: 300 },
  CSK:  { latitude: -6.324100, longitude: 106.641700, radiusMetres: 300 },
  CC:   { latitude: -6.330800, longitude: 106.618600, radiusMetres: 300 },
  PRP:  { latitude: -6.344100, longitude: 106.569500, radiusMetres: 300 },
  CLJ:  { latitude: -6.354800, longitude: 106.509100, radiusMetres: 300 },
  DARU: { latitude: -6.354000, longitude: 106.492000, radiusMetres: 300 },
  TEJ:  { latitude: -6.327000, longitude: 106.462000, radiusMetres: 300 },
  TGS:  { latitude: -6.321000, longitude: 106.398000, radiusMetres: 300 },
  CKY:  { latitude: -6.325000, longitude: 106.373000, radiusMetres: 300 },
  MJ:   { latitude: -6.332800, longitude: 106.332700, radiusMetres: 300 },
  CTR:  { latitude: -6.344000, longitude: 106.270000, radiusMetres: 300 },
  RK:   { latitude: -6.359000, longitude: 106.252000, radiusMetres: 400 },

  // ── Tangerang line ────────────────────────────────────────────────────────
  GGL:  { latitude: -6.164700, longitude: 106.789900, radiusMetres: 300 },
  PSG:  { latitude: -6.171400, longitude: 106.778400, radiusMetres: 300 },
  TKO:  { latitude: -6.180700, longitude: 106.764900, radiusMetres: 300 },
  BOI:  { latitude: -6.163100, longitude: 106.744700, radiusMetres: 300 },
  RW:   { latitude: -6.162690, longitude: 106.723159, radiusMetres: 300 },
  KDS:  { latitude: -6.166600, longitude: 106.705700, radiusMetres: 300 },
  PI:   { latitude: -6.171800, longitude: 106.686900, radiusMetres: 300 },
  BPR:  { latitude: -6.170600, longitude: 106.665100, radiusMetres: 300 },
  TTI:  { latitude: -6.174400, longitude: 106.632300, radiusMetres: 300 },
  TNG:  { latitude: -6.176700, longitude: 106.630000, radiusMetres: 300 },

  // ── Tanjung Priok branch ──────────────────────────────────────────────────
  AC:   { latitude: -6.128100, longitude: 106.845400, radiusMetres: 300 },
  TPK:  { latitude: -6.109300, longitude: 106.881500, radiusMetres: 300 },

  // ── Extras (appended by API client, not in KCI station list) ─────────────
  BST:  { latitude: -6.1256,  longitude: 106.6559,   radiusMetres: 400 },
  CKP:  { latitude: -6.3657,  longitude: 107.4630,   radiusMetres: 400 },
  PWK:  { latitude: -6.5563,  longitude: 107.4507,   radiusMetres: 400 },
};

/** Set of station IDs that have known coordinates (usable for geofencing). */
export const COORDINATED_STATION_IDS = new Set(Object.keys(STATION_COORDS));

/** Default stations to monitor on first launch. */
export const DEFAULT_MONITORED_IDS: string[] = ['MRI'];

/** Minimum milliseconds between proximity notifications for the same station. */
export const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;
