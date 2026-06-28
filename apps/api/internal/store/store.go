package store

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

var wib = time.FixedZone("WIB", 7*60*60)

// Station mirrors the KRL station shape stored in SQLite.
type Station struct {
	UID      string    `json:"uid"`
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Type     string    `json:"type"`
	FgEnable int       `json:"fg_enable"`
	Daop     int       `json:"daop"`
	SyncedAt time.Time `json:"synced_at"`
}

// Schedule mirrors the KRL schedule shape stored in SQLite.
type Schedule struct {
	ID                   string    `json:"id"`
	StationID            string    `json:"station_id"`
	StationOriginID      string    `json:"station_origin_id"`
	StationDestinationID string    `json:"station_destination_id"`
	TrainID              string    `json:"train_id"`
	Line                 string    `json:"line"`
	Route                string    `json:"route"`
	DepartsAt            time.Time `json:"departs_at"`
	ArrivesAt            time.Time `json:"arrives_at"`
	Color                string    `json:"color"`
	SyncedAt             time.Time `json:"synced_at"`
}

// Store is a thin wrapper around the SQLite database.
type Store struct {
	db *sql.DB
}

const schema = `
CREATE TABLE IF NOT EXISTS stations (
	uid       TEXT PRIMARY KEY,
	id        TEXT NOT NULL UNIQUE,
	name      TEXT NOT NULL,
	type      TEXT NOT NULL DEFAULT 'KRL',
	fg_enable INTEGER NOT NULL DEFAULT 1,
	daop      INTEGER NOT NULL DEFAULT 1,
	synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stations_id ON stations(id);

CREATE TABLE IF NOT EXISTS schedules (
	id                     TEXT PRIMARY KEY,
	station_id             TEXT NOT NULL,
	station_origin_id      TEXT NOT NULL DEFAULT '',
	station_destination_id TEXT NOT NULL DEFAULT '',
	train_id               TEXT NOT NULL,
	line                   TEXT NOT NULL,
	route                  TEXT NOT NULL,
	departs_at             DATETIME NOT NULL,
	arrives_at             DATETIME NOT NULL,
	color                  TEXT NOT NULL DEFAULT '',
	synced_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_schedules_station ON schedules(station_id);
CREATE INDEX IF NOT EXISTS idx_schedules_departs ON schedules(departs_at);

CREATE TABLE IF NOT EXISTS geofence_events (
	id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
	geofence_id  TEXT NOT NULL,
	event_name   TEXT NOT NULL,
	latitude     REAL NOT NULL,
	longitude    REAL NOT NULL,
	triggered_at DATETIME NOT NULL,
	logged_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_geofence_events_name ON geofence_events(event_name);
CREATE INDEX IF NOT EXISTS idx_geofence_events_time ON geofence_events(triggered_at);
`

// Open opens (or creates) the SQLite file and runs migrations.
func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("store: open %s: %w", path, err)
	}
	// SQLite allows only one writer at a time. Limit to a single connection so
	// the driver never opens a second one that would immediately get SQLITE_BUSY.
	// busy_timeout lets waiting writers queue for up to 10 s instead of erroring.
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`
		PRAGMA journal_mode=WAL;
		PRAGMA foreign_keys=ON;
		PRAGMA busy_timeout=10000;
	`); err != nil {
		return nil, fmt.Errorf("store: pragma: %w", err)
	}
	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("store: migrate: %w", err)
	}
	return &Store{db: db}, nil
}

// Close closes the underlying database.
func (s *Store) Close() error { return s.db.Close() }

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------

// UpsertStations inserts or replaces a batch of stations atomically.
func (s *Store) UpsertStations(stations []Station) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("store: begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	stmt, err := tx.Prepare(`
		INSERT INTO stations (uid, id, name, type, fg_enable, daop, synced_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(uid) DO UPDATE SET
			id        = excluded.id,
			name      = excluded.name,
			type      = excluded.type,
			fg_enable = excluded.fg_enable,
			daop      = excluded.daop,
			synced_at = excluded.synced_at
	`)
	if err != nil {
		return fmt.Errorf("store: prepare upsert stations: %w", err)
	}
	defer stmt.Close()

	now := time.Now().UTC()
	for _, st := range stations {
		if _, err := stmt.Exec(st.UID, st.ID, st.Name, st.Type, st.FgEnable, st.Daop, now); err != nil {
			return fmt.Errorf("store: upsert station %s: %w", st.ID, err)
		}
	}
	return tx.Commit()
}

// AllStations returns all stations ordered by name.
func (s *Store) AllStations() ([]Station, error) {
	rows, err := s.db.Query(`
		SELECT uid, id, name, type, fg_enable, daop, synced_at
		FROM stations ORDER BY name
	`)
	if err != nil {
		return nil, fmt.Errorf("store: query stations: %w", err)
	}
	defer rows.Close()

	out := make([]Station, 0)
	for rows.Next() {
		var st Station
		if err := rows.Scan(&st.UID, &st.ID, &st.Name, &st.Type, &st.FgEnable, &st.Daop, &st.SyncedAt); err != nil {
			return nil, fmt.Errorf("store: scan station: %w", err)
		}
		out = append(out, st)
	}
	return out, rows.Err()
}

// StationByID returns a single station by its KRL station ID (e.g. "MRI").
func (s *Store) StationByID(id string) (*Station, error) {
	var st Station
	err := s.db.QueryRow(`
		SELECT uid, id, name, type, fg_enable, daop, synced_at
		FROM stations WHERE id = ?
	`, id).Scan(&st.UID, &st.ID, &st.Name, &st.Type, &st.FgEnable, &st.Daop, &st.SyncedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("store: get station %s: %w", id, err)
	}
	return &st, nil
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

// UpsertSchedules inserts or replaces a batch of schedules for one station atomically.
func (s *Store) UpsertSchedules(schedules []Schedule) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("store: begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	stmt, err := tx.Prepare(`
		INSERT INTO schedules
			(id, station_id, station_origin_id, station_destination_id,
			 train_id, line, route, departs_at, arrives_at, color, synced_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			station_origin_id      = excluded.station_origin_id,
			station_destination_id = excluded.station_destination_id,
			line                   = excluded.line,
			route                  = excluded.route,
			departs_at             = excluded.departs_at,
			arrives_at             = excluded.arrives_at,
			color                  = excluded.color,
			synced_at              = excluded.synced_at
	`)
	if err != nil {
		return fmt.Errorf("store: prepare upsert schedules: %w", err)
	}
	defer stmt.Close()

	now := time.Now().UTC()
	for _, sc := range schedules {
		if _, err := stmt.Exec(
			sc.ID, sc.StationID, sc.StationOriginID, sc.StationDestinationID,
			sc.TrainID, sc.Line, sc.Route,
			sc.DepartsAt.UTC(), sc.ArrivesAt.UTC(),
			sc.Color, now,
		); err != nil {
			return fmt.Errorf("store: upsert schedule %s: %w", sc.ID, err)
		}
	}
	return tx.Commit()
}

// SchedulesByStation returns all schedules for a station, ordered by departure.
func (s *Store) SchedulesByStation(stationID string) ([]Schedule, error) {
	rows, err := s.db.Query(`
		SELECT id, station_id, station_origin_id, station_destination_id,
		       train_id, line, route, departs_at, arrives_at, color, synced_at
		FROM schedules
		WHERE station_id = ?
		ORDER BY departs_at
	`, stationID)
	if err != nil {
		return nil, fmt.Errorf("store: query schedules %s: %w", stationID, err)
	}
	defer rows.Close()

	out := make([]Schedule, 0)
	for rows.Next() {
		var sc Schedule
		if err := rows.Scan(
			&sc.ID, &sc.StationID, &sc.StationOriginID, &sc.StationDestinationID,
			&sc.TrainID, &sc.Line, &sc.Route,
			&sc.DepartsAt, &sc.ArrivesAt, &sc.Color, &sc.SyncedAt,
		); err != nil {
			return nil, fmt.Errorf("store: scan schedule: %w", err)
		}
		out = append(out, sc)
	}
	return out, rows.Err()
}

// SchedulesSyncedToday returns true if schedules for stationID were synced
// today (WIB date), meaning the cache is still valid.
func (s *Store) SchedulesSyncedToday(stationID string) (bool, error) {
	todayWIB := time.Now().In(wib).Format("2006-01-02")
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM schedules
		WHERE station_id = ?
		  AND DATE(synced_at, '+7 hours') = ?
	`, stationID, todayWIB).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("store: check schedule freshness %s: %w", stationID, err)
	}
	return count > 0, nil
}

// DeleteSchedulesOlderThan removes schedule rows whose synced_at is before t.
// Used to purge yesterday's data after a nightly re-sync.
// LineRoute is a distinct line + route pair from the schedule cache.
type LineRoute struct {
	Line  string
	Route string
}

// DistinctLinesAndRoutes returns every unique (line, route) pair in the cache.
func (s *Store) DistinctLinesAndRoutes() ([]LineRoute, error) {
	rows, err := s.db.Query(`SELECT DISTINCT line, route FROM schedules ORDER BY line, route`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []LineRoute
	for rows.Next() {
		var lr LineRoute
		if err := rows.Scan(&lr.Line, &lr.Route); err != nil {
			return nil, err
		}
		out = append(out, lr)
	}
	return out, rows.Err()
}

func (s *Store) DeleteSchedulesOlderThan(t time.Time) error {
	_, err := s.db.Exec(`DELETE FROM schedules WHERE synced_at < ?`, t.UTC())
	return err
}

// ---------------------------------------------------------------------------
// Geofence Events
// ---------------------------------------------------------------------------

// LogGeofenceEvent records a geofence trigger event.
func (s *Store) LogGeofenceEvent(geofenceID, eventName string, lat, lng float64, triggeredAt time.Time) error {
	_, err := s.db.Exec(`
		INSERT INTO geofence_events (geofence_id, event_name, latitude, longitude, triggered_at)
		VALUES (?, ?, ?, ?, ?)
	`, geofenceID, eventName, lat, lng, triggeredAt.UTC())
	return err
}
