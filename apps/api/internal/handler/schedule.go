package handler

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"sync"

	commutesync "github.com/radityaharya/commuter/internal/sync"
	"github.com/radityaharya/commuter/internal/store"
)

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
