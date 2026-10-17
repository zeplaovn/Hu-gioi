package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/auth"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/game"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/pvp"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/store"
)

type Server struct {
	verifier *auth.Verifier
	store    *store.Store
	pvp      *pvp.Service
	origins  map[string]struct{}
}

type userContextKey struct{}

func New(verifier *auth.Verifier, st *store.Store, pvpService *pvp.Service, allowedOrigins []string) http.Handler {
	s := &Server{verifier: verifier, store: st, pvp: pvpService, origins: make(map[string]struct{})}
	for _, o := range allowedOrigins { s.origins[o] = struct{}{} }

	r := chi.NewRouter()
	r.Use(s.cors)
	r.Get("/health", s.health)
	r.Get("/api/v1/server/status", s.status)
	r.Group(func(r chi.Router) {
		r.Use(s.requireUser)
		r.Get("/api/v1/bootstrap", s.bootstrap)
		r.Post("/api/v1/game/action", s.action)
		r.Get("/api/v1/leaderboard", s.leaderboard)
		r.Get("/api/v1/chat", s.chatList)
		r.Post("/api/v1/chat", s.chatSend)
		r.Get("/api/v1/pvp/opponents", s.opponents)
		r.Post("/api/v1/pvp/challenge", s.challenge)
		r.Get("/api/v1/pvp/battles/{id}", s.battle)
	})
	return r
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if _, ok := s.origins[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			}
		}
		if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
		next.ServeHTTP(w, r)
	})
}

func (s *Server) requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := s.verifier.Verify(r.Context(), auth.Bearer(r))
		if err != nil { writeError(w, http.StatusUnauthorized, "unauthorized"); return }
		ctx := context.WithValue(r.Context(), userContextKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func currentUser(r *http.Request) auth.User {
	u, _ := r.Context().Value(userContextKey{}).(auth.User)
	return u
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) { writeJSON(w, http.StatusOK, map[string]any{"ok": true}) }

func (s *Server) status(w http.ResponseWriter, r *http.Request) {
	st, err := s.store.Status(r.Context())
	if err != nil { writeError(w, 500, "status_unavailable"); return }
	writeJSON(w, 200, st)
}

func (s *Server) bootstrap(w http.ResponseWriter, r *http.Request) {
	u := currentUser(r)
	st, rev, err := s.store.LoadState(r.Context(), u.ID)
	if err != nil { writeError(w, 500, "load_failed"); return }
	gain := st.ApplyIdle(time.Now().UTC())
	if gain.Seconds > 0 {
		if newRev, err := s.store.SaveState(r.Context(), u.ID, st, rev); err == nil { rev = newRev }
	}
	if err := s.store.EnsureProfile(r.Context(), u.ID, st); err != nil { writeError(w, 500, "profile_failed"); return }
	serverStatus, _ := s.store.Status(r.Context())
	writeJSON(w, 200, map[string]any{"state": st, "rev": rev, "idle": gain, "server": serverStatus, "user": u})
}

type actionBody struct {
	Rev     int64          `json:"rev"`
	Type    string         `json:"type"`
	Payload map[string]any `json:"payload"`
}

func (s *Server) action(w http.ResponseWriter, r *http.Request) {
	var body actionBody
	if err := decodeJSON(r, &body); err != nil { writeError(w, 400, "bad_request"); return }
	u := currentUser(r)
	st, rev, err := s.store.LoadState(r.Context(), u.ID)
	if err != nil { writeError(w, 500, "load_failed"); return }
	if body.Rev != rev { writeError(w, 409, "revision_conflict"); return }
	result, err := game.ApplyAction(&st, game.ActionRequest{Type: body.Type, Payload: body.Payload}, time.Now().UTC())
	if err != nil {
		switch {
		case errors.Is(err, game.ErrNotEnough): writeError(w, 422, "not_enough_resources")
		case errors.Is(err, game.ErrCooldown): writeError(w, 429, "cooldown")
		case errors.Is(err, game.ErrNotReady): writeError(w, 422, "not_ready")
		default: writeError(w, 400, "invalid_action")
		}
		return
	}
	newRev, err := s.store.SaveState(r.Context(), u.ID, st, rev)
	if errors.Is(err, store.ErrConflict) { writeError(w, 409, "revision_conflict"); return }
	if err != nil { writeError(w, 500, "save_failed"); return }
	writeJSON(w, 200, map[string]any{"state": st, "rev": newRev, "result": result})
}

func (s *Server) leaderboard(w http.ResponseWriter, r *http.Request) {
	rows, err := s.store.Leaderboard(r.Context())
	if err != nil { writeError(w, 500, "leaderboard_failed"); return }
	writeJSON(w, 200, map[string]any{"items": rows})
}

func (s *Server) chatList(w http.ResponseWriter, r *http.Request) {
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	rows, err := s.store.ListChat(r.Context(), after)
	if err != nil { writeError(w, 500, "chat_failed"); return }
	writeJSON(w, 200, map[string]any{"items": rows})
}

func (s *Server) chatSend(w http.ResponseWriter, r *http.Request) {
	var body struct{ Body string `json:"body"` }
	if err := decodeJSON(r, &body); err != nil { writeError(w, 400, "bad_request"); return }
	body.Body = strings.TrimSpace(body.Body)
	if len([]rune(body.Body)) < 1 || len([]rune(body.Body)) > 300 { writeError(w, 422, "invalid_message"); return }
	u := currentUser(r)
	msg, err := s.store.SendChat(r.Context(), u.ID, body.Body)
	if err != nil { writeError(w, 500, "chat_failed"); return }
	writeJSON(w, 201, msg)
}

func (s *Server) opponents(w http.ResponseWriter, r *http.Request) {
	u := currentUser(r)
	rows, err := s.store.Opponents(r.Context(), u.ID)
	if err != nil { writeError(w, 500, "pvp_failed"); return }
	writeJSON(w, 200, map[string]any{"items": rows})
}

func (s *Server) challenge(w http.ResponseWriter, r *http.Request) {
	var body struct{ DefenderID string `json:"defenderId"` }
	if err := decodeJSON(r, &body); err != nil { writeError(w, 400, "bad_request"); return }
	u := currentUser(r)
	remaining, err := s.store.PvPCooldownRemaining(r.Context(), u.ID)
	if err != nil { writeError(w, 500, "pvp_failed"); return }
	if remaining > 0 { writeJSON(w, 429, map[string]any{"error": "cooldown", "retryAfterMs": remaining.Milliseconds()}); return }
	result, err := s.pvp.Challenge(r.Context(), u.ID, body.DefenderID)
	if errors.Is(err, store.ErrConflict) { writeError(w, 409, "rating_conflict"); return }
	if err != nil { writeError(w, 422, "challenge_failed"); return }
	writeJSON(w, 201, result)
}

func (s *Server) battle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id < 1 { writeError(w, 400, "bad_battle_id"); return }
	u := currentUser(r)
	b, err := s.store.Battle(r.Context(), id, u.ID)
	if errors.Is(err, store.ErrNotFound) { writeError(w, 404, "not_found"); return }
	if err != nil { writeError(w, 500, "battle_failed"); return }
	writeJSON(w, 200, b)
}

func decodeJSON(r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 64<<10)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func writeError(w http.ResponseWriter, status int, code string) { writeJSON(w, status, map[string]any{"error": code}) }
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
