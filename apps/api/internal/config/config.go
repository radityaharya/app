package config

import (
	"os"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	Port               string
	ExpoPushURL        string
	DBPath             string
	HermesWebhookURL   string
	HermesWebhookSecret string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() Config {
	loadDotEnv()
	return Config{
		Port:                getEnv("PORT", "8080"),
		ExpoPushURL:         getEnv("EXPO_PUSH_URL", "https://exp.host/--/api/v2/push/send"),
		DBPath:              getEnv("DB_PATH", "commuter.db"),
		HermesWebhookURL:    getEnv("HERMES_WEBHOOK_URL", ""),
		HermesWebhookSecret: getEnv("HERMES_WEBHOOK_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
