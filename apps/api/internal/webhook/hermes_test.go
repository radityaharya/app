package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestGitHubSignature256_matchesHermesFormat(t *testing.T) {
	body := []byte(`{"event_type":"notification","title":"test"}`)
	secret := []byte("test-secret")

	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write(body)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	got := GitHubSignature256(body, secret)
	if got != expected {
		t.Fatalf("got %q want %q", got, expected)
	}
	if got == GitHubSignature256([]byte("other"), secret) {
		t.Fatal("signature should differ for different bodies")
	}
}
