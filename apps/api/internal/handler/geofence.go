package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/radityaharya/commuter/internal/store"
	"github.com/radityaharya/commuter/internal/webhook"
)

type geofenceTriggerRequest struct {
	EventName   string    `json:"event_name"`
	GeofenceID  string    `json:"geofence_id"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	TriggeredAt time.Time `json:"triggered_at"`
}

func GeofenceTrigger(st *store.Store, hook *webhook.Client) http.HandlerFunc {
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

		logged := true
		if err := st.LogGeofenceEvent(req.GeofenceID, req.EventName, req.Latitude, req.Longitude, triggeredAt); err != nil {
			slog.Error("geofence: log event", "err", err)
			logged = false
		}

		slog.Info("geofence event", "event", req.EventName, "id", req.GeofenceID, "lat", req.Latitude, "lng", req.Longitude)

		data := map[string]any{
			"logged": logged,
		}

		if hook != nil && hook.Enabled() {
			status := &webhookStatus{}
			title := fmt.Sprintf("geofence · %s", req.EventName)
			body := fmt.Sprintf(
				"%s triggered at %.4f, %.4f",
				req.GeofenceID,
				req.Latitude,
				req.Longitude,
			)
			err := hook.Send(r.Context(), webhook.Notification{
				EventType: "geofence_trigger",
				Title:     title,
				Body:      body,
				Data: map[string]any{
					"geofence_id":  req.GeofenceID,
					"event_name":   req.EventName,
					"latitude":     req.Latitude,
					"longitude":    req.Longitude,
					"triggered_at": triggeredAt.UTC().Format(time.RFC3339),
				},
			})
			if err != nil {
				slog.Warn("geofence webhook failed", "err", err)
				status.Error = err.Error()
			} else {
				status.Sent = true
			}
			data["webhook"] = status
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"metadata": map[string]any{"success": true},
			"data":     data,
		})
	}
}
