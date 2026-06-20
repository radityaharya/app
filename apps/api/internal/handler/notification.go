package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/radityaharya/commuter/internal/push"
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
	Tickets []push.Ticket `json:"tickets"`
}

// Notifications returns an http.Handler for notification-related routes.
// It accepts a push.Client so the actual HTTP client is injected.
func Notifications(pushClient *push.Client) http.HandlerFunc {
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

		if err := validateSendRequest(req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}

		msg := push.Message{
			To:       req.To,
			Title:    req.Title,
			Body:     req.Body,
			Data:     req.Data,
			Sound:    "default",
			Priority: "high",
		}

		tickets, err := pushClient.Send(r.Context(), []push.Message{msg})
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{
				"error": fmt.Sprintf("failed to send push notification: %s", err),
			})
			return
		}

		writeJSON(w, http.StatusOK, SendNotificationResponse{Tickets: tickets})
	}
}

func validateSendRequest(req SendNotificationRequest) error {
	if strings.TrimSpace(req.To) == "" {
		return fmt.Errorf("'to' is required (Expo push token)")
	}
	if !strings.HasPrefix(req.To, "ExponentPushToken[") {
		return fmt.Errorf("'to' must be a valid Expo push token (ExponentPushToken[...])")
	}
	if strings.TrimSpace(req.Title) == "" && strings.TrimSpace(req.Body) == "" {
		return fmt.Errorf("at least one of 'title' or 'body' is required")
	}
	return nil
}
