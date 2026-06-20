package config

import (
	"os"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	Port        string
	ExpoPushURL string
	DBPath      string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() Config {
	return Config{
		Port:        getEnv("PORT", "8080"),
		ExpoPushURL: getEnv("EXPO_PUSH_URL", "https://exp.host/--/api/v2/push/send"),
		DBPath:      getEnv("DB_PATH", "commuter.db"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
