package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/game"
)

var ErrConflict = errors.New("revision conflict")
var ErrNotFound = errors.New("not found")

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type Profile struct {
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Rating    int       `json:"rating"`
	Power     int64     `json:"power"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ChatMessage struct {
	ID        int64     `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
}

type ServerStatus struct {
	Maintenance bool   `json:"maintenance"`
	Reason      string `json:"reason"`
	Banner      string `json:"banner"`
}

type BattleRecord struct {
	AttackerID      string
	DefenderID      string
	Seed            int64
	AttackerSnapshot any
	DefenderSnapshot any
	Result           any
	WinnerID         string
	AttackerDelta    int
	DefenderDelta    int
}

type Battle struct {
	ID               int64           `json:"id"`
	AttackerID       string          `json:"attackerId"`
	DefenderID       string          `json:"defenderId"`
	Seed             int64           `json:"seed"`
	AttackerSnapshot json.RawMessage `json:"attackerSnapshot"`
	DefenderSnapshot json.RawMessage `json:"defenderSnapshot"`
	Result           json.RawMessage `json:"result"`
	WinnerID         *string         `json:"winnerId"`
	AttackerDelta    int             `json:"attackerDelta"`
	DefenderDelta    int             `json:"defenderDelta"`
	CreatedAt        time.Time       `json:"createdAt"`
}

func (s *Store) LoadState(ctx context.Context, userID string) (game.State, int64, error) {
	now := time.Now().UTC()
	initial, _ := json.Marshal(game.DefaultState(now))
	_, err := s.pool.Exec(ctx, `
		insert into public.game_player_state(user_id, state)
		values ($1::uuid, $2::jsonb)
		on conflict (user_id) do nothing`, userID, initial)
	if err != nil {
		return game.State{}, 0, err
	}
	var raw []byte
	var rev int64
	if err := s.pool.QueryRow(ctx, `
		select state, rev from public.game_player_state where user_id = $1::uuid`, userID).Scan(&raw, &rev); err != nil {
		return game.State{}, 0, err
	}
	var st game.State
	if err := json.Unmarshal(raw, &st); err != nil {
		return game.State{}, 0, fmt.Errorf("decode player state: %w", err)
	}
	st.Normalize(now)
	return st, rev, nil
}

func (s *Store) SaveState(ctx context.Context, userID string, st game.State, expectedRev int64) (int64, error) {
	body, err := json.Marshal(st)
	if err != nil {
		return 0, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	var rev int64
	if err := tx.QueryRow(ctx, `
		update public.game_player_state
		set state = $1::jsonb, rev = rev + 1, updated_at = now()
		where user_id = $2::uuid and rev = $3
		returning rev`, body, userID, expectedRev).Scan(&rev); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrConflict
		}
		return 0, err
	}
	snapshot, _ := json.Marshal(st.CombatStats())
	_, err = tx.Exec(ctx, `
		insert into public.game_pvp_profiles(user_id, name, power, defense_snapshot, updated_at)
		values ($1::uuid, $2, $3, $4::jsonb, now())
		on conflict (user_id) do update set
			name = excluded.name,
			power = excluded.power,
			defense_snapshot = excluded.defense_snapshot,
			updated_at = now()`, userID, st.Name, st.Power, snapshot)
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return rev, nil
}

func (s *Store) Profile(ctx context.Context, userID string) (Profile, error) {
	var p Profile
	err := s.pool.QueryRow(ctx, `
		select user_id::text, name, rating, power, updated_at
		from public.game_pvp_profiles where user_id = $1::uuid`, userID).
		Scan(&p.UserID, &p.Name, &p.Rating, &p.Power, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Profile{}, ErrNotFound
	}
	return p, err
}

func (s *Store) Leaderboard(ctx context.Context) ([]Profile, error) {
	rows, err := s.pool.Query(ctx, `
		select user_id::text, name, rating, power, updated_at
		from public.game_pvp_profiles
		order by rating desc, power desc, updated_at asc
		limit 50`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Profile, 0, 50)
	for rows.Next() {
		var p Profile
		if err := rows.Scan(&p.UserID, &p.Name, &p.Rating, &p.Power, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) Opponents(ctx context.Context, userID string) ([]Profile, error) {
	rows, err := s.pool.Query(ctx, `
		with me as (
			select coalesce((select rating from public.game_pvp_profiles where user_id = $1::uuid), 1000) rating
		)
		select p.user_id::text, p.name, p.rating, p.power, p.updated_at
		from public.game_pvp_profiles p, me
		where p.user_id <> $1::uuid
		order by abs(p.rating - me.rating), p.updated_at desc
		limit 20`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Profile
	for rows.Next() {
		var p Profile
		if err := rows.Scan(&p.UserID, &p.Name, &p.Rating, &p.Power, &p.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) ListChat(ctx context.Context, after int64) ([]ChatMessage, error) {
	rows, err := s.pool.Query(ctx, `
		select id, user_id::text, name, body, created_at
		from public.game_chat_messages
		where ($1 = 0 or id > $1)
		order by id desc
		limit 50`, after)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ChatMessage
	for rows.Next() {
		var m ChatMessage
		if err := rows.Scan(&m.ID, &m.UserID, &m.Name, &m.Body, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return out, rows.Err()
}

func (s *Store) SendChat(ctx context.Context, userID, body string) (ChatMessage, error) {
	var m ChatMessage
	err := s.pool.QueryRow(ctx, `
		insert into public.game_chat_messages(user_id, name, body)
		values (
			$1::uuid,
			coalesce((select name from public.game_pvp_profiles where user_id = $1::uuid), 'Vô Danh'),
			$2
		)
		returning id, user_id::text, name, body, created_at`, userID, body).
		Scan(&m.ID, &m.UserID, &m.Name, &m.Body, &m.CreatedAt)
	return m, err
}

func (s *Store) Status(ctx context.Context) (ServerStatus, error) {
	var st ServerStatus
	err := s.pool.QueryRow(ctx, `
		select maintenance, reason, banner from public.game_server_config where id = true`).
		Scan(&st.Maintenance, &st.Reason, &st.Banner)
	if errors.Is(err, pgx.ErrNoRows) {
		return ServerStatus{}, nil
	}
	return st, err
}

func (s *Store) RecordBattle(ctx context.Context, rec BattleRecord, oldAttacker, oldDefender, newAttacker, newDefender int) (int64, error) {
	aSnap, _ := json.Marshal(rec.AttackerSnapshot)
	dSnap, _ := json.Marshal(rec.DefenderSnapshot)
	result, _ := json.Marshal(rec.Result)
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	ct, err := tx.Exec(ctx, `update public.game_pvp_profiles set rating=$1 where user_id=$2::uuid and rating=$3`, newAttacker, rec.AttackerID, oldAttacker)
	if err != nil || ct.RowsAffected() != 1 {
		if err != nil { return 0, err }
		return 0, ErrConflict
	}
	ct, err = tx.Exec(ctx, `update public.game_pvp_profiles set rating=$1 where user_id=$2::uuid and rating=$3`, newDefender, rec.DefenderID, oldDefender)
	if err != nil || ct.RowsAffected() != 1 {
		if err != nil { return 0, err }
		return 0, ErrConflict
	}
	var id int64
	var winner any
	if rec.WinnerID != "" { winner = rec.WinnerID } else { winner = nil }
	err = tx.QueryRow(ctx, `
		insert into public.game_pvp_battles(
			attacker_id, defender_id, seed, attacker_snapshot, defender_snapshot,
			result, winner_id, attacker_delta, defender_delta
		) values ($1::uuid,$2::uuid,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::uuid,$8,$9)
		returning id`, rec.AttackerID, rec.DefenderID, rec.Seed, aSnap, dSnap, result, winner, rec.AttackerDelta, rec.DefenderDelta).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return id, nil
}

func (s *Store) Battle(ctx context.Context, id int64, userID string) (Battle, error) {
	var b Battle
	err := s.pool.QueryRow(ctx, `
		select id, attacker_id::text, defender_id::text, seed,
			attacker_snapshot, defender_snapshot, result, winner_id::text,
			attacker_delta, defender_delta, created_at
		from public.game_pvp_battles
		where id=$1 and (attacker_id=$2::uuid or defender_id=$2::uuid)`, id, userID).
		Scan(&b.ID, &b.AttackerID, &b.DefenderID, &b.Seed, &b.AttackerSnapshot, &b.DefenderSnapshot, &b.Result, &b.WinnerID, &b.AttackerDelta, &b.DefenderDelta, &b.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Battle{}, ErrNotFound
	}
	return b, err
}
