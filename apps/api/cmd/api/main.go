package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/radityaharya/commuter/internal/config"
	"github.com/radityaharya/commuter/internal/handler"
	"github.com/radityaharya/commuter/internal/krl"
	"github.com/radityaharya/commuter/internal/push"
	"github.com/radityaharya/commuter/internal/store"
	commutesync "github.com/radityaharya/commuter/internal/sync"
	"github.com/radityaharya/commuter/internal/webhook"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()

	// --- SQLite store --------------------------------------------------------
	db, err := store.Open(cfg.DBPath)
	if err != nil {
		slog.Error("failed to open database", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	// --- KRL client + syncer -------------------------------------------------
	krlClient := krl.NewClient()
	syncer := commutesync.New(krlClient, db)

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Sync stations in background: immediately on start, then every 24 h.
	go syncer.Run(ctx)

	// --- HTTP routes ---------------------------------------------------------
	pushClient := push.NewClient(cfg.ExpoPushURL)
	hermesWebhook := webhook.NewClient(cfg.HermesWebhookURL, cfg.HermesWebhookSecret)
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", handler.Health)
	mux.HandleFunc("POST /notifications/send", handler.Notifications(handler.NotificationDeps{
		Push:    pushClient,
		Webhook: hermesWebhook,
	}))

	stationList, stationGet := handler.Stations(db)
	mux.HandleFunc("GET /v1/stations", stationList)
	mux.HandleFunc("GET /v1/stations/{id}", stationGet)

	mux.HandleFunc("GET /v1/schedule/{station_id}", handler.Schedule(db, syncer))

	mux.HandleFunc("POST /v1/geofence/trigger", handler.GeofenceTrigger(db, hermesWebhook))

	// --- Server --------------------------------------------------------------
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{Addr: addr, Handler: corsMiddleware(mux)}

	slog.Info("commuter API starting", "addr", addr, "db", cfg.DBPath, "hermes_webhook", hermesWebhook != nil)

	go func() {
		<-ctx.Done()
		slog.Info("shutting down")
		srv.Shutdown(context.Background()) //nolint:errcheck
	}()

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server failed", "err", err)
		os.Exit(1)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
