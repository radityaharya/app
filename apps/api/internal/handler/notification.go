package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/radityaharya/commuter/internal/push"
	"github.com/radityaharya/commuter/internal/webhook"
)

// SendNotificationRequest is the expected JSON body for POST /notifications/send.
type SendNotificationRequest struct {
	// To is the Expo push token, e.g. "ExponentPushToken[xxx]"
	To    string         `json:"to"`
	Title string         `json:"title"`
	Body  string         `json:"body"`
	Data  map[string]any `json:"data,omitempty"`
}

// SendNotificationResponse is the JSON response from POST /notifications/send.
type SendNotificationResponse struct {
	Tickets  []push.Ticket   `json:"tickets,omitempty"`
	Webhook  *webhookStatus  `json:"webhook,omitempty"`
}

type webhookStatus struct {
	Sent  bool   `json:"sent"`
	Error string `json:"error,omitempty"`
}

type NotificationDeps struct {
	Push    *push.Client
	Webhook *webhook.Client
}

// Notifications returns an http.Handler for POST /notifications/send.
// Delivers to Expo push and, when configured, the Hermes webhook route (e.g. WhatsApp).
func Notifications(deps NotificationDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}

		var req SendNotificationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
			return
		}

		if err := validateSendRequest(req, deps.Webhook != nil && deps.Webhook.Enabled()); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}

		resp := SendNotificationResponse{}

		if strings.TrimSpace(req.To) != "" {
			msg := push.Message{
				To:       req.To,
				Title:    req.Title,
				Body:     req.Body,
				Data:     req.Data,
				Sound:    "default",
				Priority: "high",
			}

			tickets, err := deps.Push.Send(r.Context(), []push.Message{msg})
			if err != nil {
				writeJSON(w, http.StatusBadGateway, map[string]string{
					"error": fmt.Sprintf("failed to send push notification: %s", err),
				})
				return
			}
			resp.Tickets = tickets
		}

		if deps.Webhook != nil && deps.Webhook.Enabled() {
			status := &webhookStatus{}
			err := deps.Webhook.Send(r.Context(), webhook.Notification{
				EventType: "notification",
				Title:     req.Title,
				Body:      req.Body,
				Data:      req.Data,
			})
			if err != nil {
				slog.Warn("hermes webhook delivery failed", "err", err)
				status.Error = err.Error()
			} else {
				status.Sent = true
			}
			resp.Webhook = status
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

func validateSendRequest(req SendNotificationRequest, webhookEnabled bool) error {
	hasPush := strings.TrimSpace(req.To) != ""
	if hasPush && !strings.HasPrefix(req.To, "ExponentPushToken[") {
		return fmt.Errorf("'to' must be a valid Expo push token (ExponentPushToken[...])")
	}
	if !hasPush && !webhookEnabled {
		return fmt.Errorf("'to' is required (Expo push token) or configure HERMES_WEBHOOK_URL")
	}
	if strings.TrimSpace(req.Title) == "" && strings.TrimSpace(req.Body) == "" {
		return fmt.Errorf("at least one of 'title' or 'body' is required")
	}
	return nil
}
