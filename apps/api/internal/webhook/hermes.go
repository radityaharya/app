package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Notification is the JSON payload posted to a Hermes webhook route.
// Route prompt templates can reference fields like {title} and {body}.
type Notification struct {
	EventType string         `json:"event_type"`
	Title     string         `json:"title,omitempty"`
	Body      string         `json:"body,omitempty"`
	Data      map[string]any `json:"data,omitempty"`
}

// Client posts signed payloads to a Hermes webhook route.
type Client struct {
	url        string
	secret     string
	httpClient *http.Client
}

// NewClient returns a Hermes webhook client, or nil if url or secret is empty.
func NewClient(url, secret string) *Client {
	url = strings.TrimSpace(url)
	secret = strings.TrimSpace(secret)
	if url == "" || secret == "" {
		return nil
	}
	return &Client{
		url:    url,
		secret: secret,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// Enabled reports whether webhook delivery is configured.
func (c *Client) Enabled() bool {
	return c != nil
}

// GitHubSignature256 computes the Hermes/GitHub webhook header value:
// X-Hub-Signature-256: sha256=<hex_digest>
func GitHubSignature256(body, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// Send delivers a notification event to the configured Hermes webhook route.
func (c *Client) Send(ctx context.Context, n Notification) error {
	if n.EventType == "" {
		n.EventType = "notification"
	}

	body, err := json.Marshal(n)
	if err != nil {
		return fmt.Errorf("webhook: marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("webhook: create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Hub-Signature-256", GitHubSignature256(body, []byte(c.secret)))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("webhook: http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		slurp, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("webhook: unexpected status %d: %s", resp.StatusCode, string(slurp))
	}

	return nil
}
