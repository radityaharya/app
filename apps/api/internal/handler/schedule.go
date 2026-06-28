package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	commutesync "github.com/radityaharya/commuter/internal/sync"
	"github.com/radityaharya/commuter/internal/store"
)

// schedulePushBody mirrors the mobile Schedule type for JSON decoding.
type schedulePushBody struct {
	ID                  string `json:"id"`
	StationID           string `json:"station_id"`
	StationOriginID     string `json:"station_origin_id"`
	StationDestinationID string `json:"station_destination_id"`
	TrainID             string `json:"train_id"`
	Line                string `json:"line"`
	Route               string `json:"route"`
	DepartsAt           string `json:"departs_at"`
	ArrivesAt           string `json:"arrives_at"`
}

// SchedulePush returns a handler for POST /v1/schedule/{station_id}.
// The mobile app calls this after a successful KCI-direct fallback fetch so the
// server cache stays up-to-date even when the KRL partner API is unreachable.
func SchedulePush(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stationID := strings.ToUpper(r.PathValue("station_id"))
		if stationID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "station_id is required"})
			return
		}

		var body []schedulePushBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON: " + err.Error()})
			return
		}
		if len(body) == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "empty schedule array"})
			return
		}

		rows := make([]store.Schedule, 0, len(body))
		for _, s := range body {
			dep, err := time.Parse(time.RFC3339, s.DepartsAt)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid departs_at: " + err.Error()})
				return
			}
			arr, err := time.Parse(time.RFC3339, s.ArrivesAt)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid arrives_at: " + err.Error()})
				return
			}
			rows = append(rows, store.Schedule{
				ID:                  s.ID,
				StationID:           strings.ToUpper(s.StationID),
				StationOriginID:     s.StationOriginID,
				StationDestinationID: s.StationDestinationID,
				TrainID:             s.TrainID,
				Line:                s.Line,
				Route:               s.Route,
				DepartsAt:           dep,
				ArrivesAt:           arr,
			})
		}

		if err := st.UpsertSchedules(rows); err != nil {
			slog.Error("schedule push: upsert failed", "station_id", stationID, "err", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to store schedules"})
			return
		}

		slog.Info("schedule push: accepted", "station_id", stationID, "count", len(rows))
		writeJSON(w, http.StatusOK, map[string]any{"accepted": len(rows)})
	}
}

// Schedule returns a handler for GET /v1/schedule/{station_id}.
//
// Cache strategy:
//   - Today's rows in SQLite → serve immediately.
//   - Stale and no fetch in progress → start a fetch, block this request until done.
//   - Stale and fetch already in progress → wait for the same fetch (via shared channel).
func Schedule(st *store.Store, syncer *commutesync.Syncer) http.HandlerFunc {
	type inflight struct {
		done chan struct{}
		err  error
	}
	var mu sync.Mutex
	inFlight := map[string]*inflight{}

	return func(w http.ResponseWriter, r *http.Request) {
		stationID := strings.ToUpper(r.PathValue("station_id"))
		if stationID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "station_id is required"})
			return
		}

		fresh, _ := st.SchedulesSyncedToday(stationID)
		if !fresh {
			mu.Lock()
			if fl, exists := inFlight[stationID]; exists {
				// Another request already kicked off the fetch — wait on it.
				mu.Unlock()
				slog.Info("schedule: waiting on in-flight fetch", "station_id", stationID)
				<-fl.done
			} else {
				// We are the first — start the fetch, others will wait on our channel.
				fl := &inflight{done: make(chan struct{})}
				inFlight[stationID] = fl
				mu.Unlock()

				slog.Info("schedule: fetching", "station_id", stationID)
				fl.err = syncer.SyncScheduleForStation(context.Background(), stationID)
				if fl.err != nil {
					slog.Warn("schedule: fetch failed", "station_id", stationID, "err", fl.err)
				} else {
					slog.Info("schedule: fetch done", "station_id", stationID)
				}
				close(fl.done)

				mu.Lock()
				delete(inFlight, stationID)
				mu.Unlock()
			}
		}

		schedules, err := st.SchedulesByStation(stationID)
		if err != nil {
			slog.Error("store: read schedules", "station_id", stationID, "err", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "failed to read schedule from cache",
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"metadata": map[string]bool{"success": true},
			"data":     schedules,
		})
	}
}
