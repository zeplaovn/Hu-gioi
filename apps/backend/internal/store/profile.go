package store

import (
	"context"
	"encoding/json"
	"time"

	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/game"
)

func (s *Store) EnsureProfile(ctx context.Context, userID string, st game.State) error {
	snapshot, _ := json.Marshal(st.CombatStats())
	_, err := s.pool.Exec(ctx, `
		insert into public.game_pvp_profiles(user_id, name, power, defense_snapshot, updated_at)
		values ($1::uuid, $2, $3, $4::jsonb, now())
		on conflict (user_id) do update set
			name=excluded.name,
			power=excluded.power,
			defense_snapshot=excluded.defense_snapshot,
			updated_at=now()`, userID, st.Name, st.Power, snapshot)
	return err
}

func (s *Store) PvPCooldownRemaining(ctx context.Context, userID string) (time.Duration, error) {
	var last *time.Time
	err := s.pool.QueryRow(ctx, `
		select max(created_at) from public.game_pvp_battles where attacker_id=$1::uuid`, userID).Scan(&last)
	if err != nil || last == nil {
		return 0, err
	}
	const cooldown = 8 * time.Second
	remaining := cooldown - time.Since(*last)
	if remaining < 0 { return 0, nil }
	return remaining, nil
}
