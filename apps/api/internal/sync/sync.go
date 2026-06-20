package sync

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/radityaharya/commuter/internal/krl"
	"github.com/radityaharya/commuter/internal/store"
)

var wib = time.FixedZone("WIB", 7*60*60)

// Syncer fetches KRL stations and schedules from the live API and caches them in SQLite.
type Syncer struct {
	client *krl.Client
	store  *store.Store

	// stationsMu guards cachedStations. Set once stations are fetched so
	// the schedule handler never needs to call the upstream API for the list.
	stationsMu     sync.RWMutex
	cachedStations []krl.Station
}

func New(client *krl.Client, store *store.Store) *Syncer {
	return &Syncer{client: client, store: store}
}

// Stations returns the in-memory station list, or nil if not yet synced.
func (s *Syncer) Stations() []krl.Station {
	s.stationsMu.RLock()
	defer s.stationsMu.RUnlock()
	return s.cachedStations
}

// Run performs an immediate full sync then re-runs at midnight WIB every day.
// Call in a goroutine — it blocks until ctx is cancelled.
func (s *Syncer) Run(ctx context.Context) {
	s.syncAll(ctx)

	for {
		next := nextMidnightWIB()
		slog.Info("sync: next schedule sync", "at", next.Format(time.RFC3339))

		select {
		case <-ctx.Done():
			return
		case <-time.After(time.Until(next)):
			s.syncAll(ctx)
		}
	}
}

// SyncScheduleForStation fetches and caches the schedule for a single station.
// It uses the in-memory station list for name→ID resolution; if not yet
// available it falls back to the SQLite cache, then to a live API call.
func (s *Syncer) SyncScheduleForStation(ctx context.Context, stationID string) error {
	stations := s.Stations()
	if len(stations) == 0 {
		// Stations haven't been synced into memory yet — use SQLite cache.
		stored, err := s.store.AllStations()
		if err == nil && len(stored) > 0 {
			stations = storeToKRL(stored)
		}
	}
	if len(stations) == 0 {
		// Still nothing — fetch live (first-ever cold start).
		var err error
		stations, err = s.client.Stations(ctx)
		if err != nil {
			return err
		}
		s.stationsMu.Lock()
		s.cachedStations = stations
		s.stationsMu.Unlock()
	}
	return s.syncSchedule(ctx, stationID, stations)
}

// ---------------------------------------------------------------------------

func (s *Syncer) syncAll(ctx context.Context) {
	slog.Info("sync: starting full sync")

	stations, err := s.client.Stations(ctx)
	if err != nil {
		slog.Error("sync: fetch stations failed", "err", err)
		return
	}

	// Cache in memory immediately so the schedule handler can use it.
	s.stationsMu.Lock()
	s.cachedStations = stations
	s.stationsMu.Unlock()

	if err := s.store.UpsertStations(krlStationsToStore(stations)); err != nil {
		slog.Error("sync: upsert stations failed", "err", err)
		return
	}
	slog.Info("sync: stations done", "count", len(stations))

	// Purge yesterday's schedule rows.
	yesterday := time.Now().In(wib).Truncate(24 * time.Hour).UTC()
	if err := s.store.DeleteSchedulesOlderThan(yesterday); err != nil {
		slog.Warn("sync: purge old schedules failed", "err", err)
	}

	// Fetch schedule for each station sequentially.
	ok := 0
	for _, st := range stations {
		if err := ctx.Err(); err != nil {
			return
		}
		if err := s.syncSchedule(ctx, st.ID, stations); err != nil {
			slog.Debug("sync: no schedule", "station", st.ID, "err", err)
		} else {
			ok++
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(200 * time.Millisecond):
		}
	}
	slog.Info("sync: schedules done", "ok", ok)
}

func (s *Syncer) syncSchedule(ctx context.Context, stationID string, stations []krl.Station) error {
	schedules, err := s.client.Schedule(ctx, stationID, stations)
	if err != nil {
		return err
	}
	if len(schedules) == 0 {
		return nil
	}
	return s.store.UpsertSchedules(krlSchedulesToStore(schedules))
}

func nextMidnightWIB() time.Time {
	now := time.Now().In(wib)
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, wib)
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

func storeToKRL(in []store.Station) []krl.Station {
	out := make([]krl.Station, 0, len(in))
	for _, s := range in {
		out = append(out, krl.Station{
			ID:   s.ID,
			Name: s.Name,
			Type: krl.StationType(s.Type),
		})
	}
	return out
}

func krlStationsToStore(in []krl.Station) []store.Station {
	out := make([]store.Station, 0, len(in))
	for _, s := range in {
		out = append(out, store.Station{
			UID:      strings.ToLower("st_" + string(s.Type) + "_" + s.ID),
			ID:       s.ID,
			Name:     s.Name,
			Type:     string(s.Type),
			FgEnable: s.Metadata.Origin.FgEnable,
			Daop:     s.Metadata.Origin.Daop,
		})
	}
	return out
}

func krlSchedulesToStore(in []krl.Schedule) []store.Schedule {
	out := make([]store.Schedule, 0, len(in))
	for _, sc := range in {
		out = append(out, store.Schedule{
			ID:                   sc.ID,
			StationID:            sc.StationID,
			StationOriginID:      sc.StationOriginID,
			StationDestinationID: sc.StationDestinationID,
			TrainID:              sc.TrainID,
			Line:                 sc.Line,
			Route:                sc.Route,
			DepartsAt:            sc.DepartsAt,
			ArrivesAt:            sc.ArrivesAt,
			Color:                sc.Metadata.Origin.Color,
		})
	}
	return out
}
