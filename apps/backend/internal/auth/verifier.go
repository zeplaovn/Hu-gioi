package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type cacheEntry struct {
	user User
	exp  time.Time
}

type Verifier struct {
	baseURL string
	anonKey string
	client  *http.Client
	mu      sync.RWMutex
	cache   map[string]cacheEntry
}

func NewVerifier(baseURL, anonKey string) *Verifier {
	return &Verifier{
		baseURL: strings.TrimRight(baseURL, "/"),
		anonKey: anonKey,
		client:  &http.Client{Timeout: 5 * time.Second},
		cache:   make(map[string]cacheEntry),
	}
}

func Bearer(r *http.Request) string {
	v := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(v) < 8 || !strings.EqualFold(v[:7], "Bearer ") {
		return ""
	}
	return strings.TrimSpace(v[7:])
}

func (v *Verifier) Verify(ctx context.Context, token string) (User, error) {
	if token == "" {
		return User{}, errors.New("missing token")
	}
	now := time.Now()
	v.mu.RLock()
	entry, ok := v.cache[token]
	v.mu.RUnlock()
	if ok && entry.exp.After(now) {
		return entry.user, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.baseURL+"/auth/v1/user", nil)
	if err != nil {
		return User{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("apikey", v.anonKey)
	res, err := v.client.Do(req)
	if err != nil {
		return User{}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return User{}, errors.New("invalid session")
	}
	var user User
	if err := json.NewDecoder(res.Body).Decode(&user); err != nil {
		return User{}, err
	}
	if user.ID == "" {
		return User{}, errors.New("invalid user payload")
	}
	v.mu.Lock()
	if len(v.cache) > 4096 {
		v.cache = make(map[string]cacheEntry)
	}
	v.cache[token] = cacheEntry{user: user, exp: now.Add(30 * time.Second)}
	v.mu.Unlock()
	return user, nil
}
