package push

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Message represents the payload sent to the Expo Push Service.
// See: https://docs.expo.dev/push-notifications/sending-notifications/
type Message struct {
	To       string         `json:"to"`
	Title    string         `json:"title,omitempty"`
	Body     string         `json:"body,omitempty"`
	Data     map[string]any `json:"data,omitempty"`
	Sound    string         `json:"sound,omitempty"`
	Badge    int            `json:"badge,omitempty"`
	Priority string         `json:"priority,omitempty"`
}

// Ticket is the response item from Expo for each message sent.
type Ticket struct {
	Status  string `json:"status"`
	ID      string `json:"id,omitempty"`
	Message string `json:"message,omitempty"`
	Details any    `json:"details,omitempty"`
}

type sendResponse struct {
	Data []Ticket `json:"data"`
}

// Client sends push notifications via the Expo Push Service.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient creates a new Expo push notification client.
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Send delivers one or more push messages and returns the resulting tickets.
func (c *Client) Send(ctx context.Context, messages []Message) ([]Ticket, error) {
	body, err := json.Marshal(messages)
	if err != nil {
		return nil, fmt.Errorf("push: marshal messages: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("push: create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("push: http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("push: unexpected status %d", resp.StatusCode)
	}

	var result sendResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("push: decode response: %w", err)
	}

	return result.Data, nil
}
