package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/radityaharya/commuter/internal/store"
)

type geofenceTriggerRequest struct {
	EventName   string    `json:"event_name"`
	GeofenceID  string    `json:"geofence_id"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	TriggeredAt time.Time `json:"triggered_at"`
}

func GeofenceTrigger(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req geofenceTriggerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"metadata": map[string]any{"success": false, "message": "invalid JSON"},
				"data":     nil,
			})
			return
		}
		if strings.TrimSpace(req.EventName) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"metadata": map[string]any{"success": false, "message": "event_name is required"},
				"data":     nil,
			})
			return
		}

		triggeredAt := req.TriggeredAt
		if triggeredAt.IsZero() {
			triggeredAt = time.Now()
		}

		if err := st.LogGeofenceEvent(req.GeofenceID, req.EventName, req.Latitude, req.Longitude, triggeredAt); err != nil {
			slog.Error("geofence: log event", "err", err)
			writeJSON(w, http.StatusOK, map[string]any{
				"metadata": map[string]any{"success": true},
				"data":     map[string]any{"logged": false},
			})
			return
		}

		slog.Info("geofence event", "event", req.EventName, "id", req.GeofenceID, "lat", req.Latitude, "lng", req.Longitude)
		writeJSON(w, http.StatusOK, map[string]any{
			"metadata": map[string]any{"success": true},
			"data":     map[string]any{"logged": true},
		})
	}
}
