package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Addr            string
	DatabaseURL     string
	SupabaseURL     string
	SupabaseAnonKey string
	AllowedOrigins  []string
}

func Load() (Config, error) {
	cfg := Config{
		Addr:            env("ADDR", ":8080"),
		DatabaseURL:     strings.TrimSpace(os.Getenv("DATABASE_URL")),
		SupabaseURL:     strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/"),
		SupabaseAnonKey: strings.TrimSpace(os.Getenv("SUPABASE_ANON_KEY")),
		AllowedOrigins:  splitCSV(env("ALLOWED_ORIGINS", "http://localhost:5173")),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.SupabaseURL == "" || cfg.SupabaseAnonKey == "" {
		return Config{}, fmt.Errorf("SUPABASE_URL and SUPABASE_ANON_KEY are required")
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
