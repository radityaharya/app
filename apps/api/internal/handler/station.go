package handler

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/radityaharya/commuter/internal/store"
)

// Stations returns handlers for station-related routes backed by the SQLite cache.
func Stations(st *store.Store) (listFn, getFn http.HandlerFunc) {
	// GET /v1/stations
	listFn = func(w http.ResponseWriter, r *http.Request) {
		stations, err := st.AllStations()
		if err != nil {
			slog.Error("store: list stations", "err", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "failed to read stations from cache",
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"metadata": map[string]bool{"success": true},
			"data":     stations,
		})
	}

	// GET /v1/stations/{id}
	getFn = func(w http.ResponseWriter, r *http.Request) {
		id := strings.ToUpper(r.PathValue("id"))
		if id == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "station id is required"})
			return
		}

		station, err := st.StationByID(id)
		if err != nil {
			slog.Error("store: get station", "id", id, "err", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "failed to read station from cache",
			})
			return
		}
		if station == nil {
			writeJSON(w, http.StatusNotFound, map[string]any{
				"metadata": map[string]any{"success": false, "message": "station not found"},
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"metadata": map[string]bool{"success": true},
			"data":     station,
		})
	}

	return
}
