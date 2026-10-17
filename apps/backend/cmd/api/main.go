package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/auth"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/config"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/httpapi"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/pvp"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil { log.Fatal(err) }

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil { log.Fatal(err) }
	poolCfg.MaxConns = 20
	poolCfg.MinConns = 2
	poolCfg.MaxConnLifetime = 30 * time.Minute
	poolCfg.MaxConnIdleTime = 5 * time.Minute
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil { log.Fatal(err) }
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil { log.Fatal(err) }

	st := store.New(pool)
	verifier := auth.NewVerifier(cfg.SupabaseURL, cfg.SupabaseAnonKey)
	handler := httpapi.New(verifier, st, pvp.New(st), cfg.AllowedOrigins)

	srv := &http.Server{
		Addr: cfg.Addr,
		Handler: handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout: 10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout: 60 * time.Second,
	}

	go func() {
		log.Printf("hu-gioi api listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("http server: %v", err)
			cancel()
		}
	}()

	<-ctx.Done()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
}
