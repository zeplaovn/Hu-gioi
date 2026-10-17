package pvp

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"

	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/combat"
	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/store"
)

type Service struct {
	store *store.Store
}

func New(st *store.Store) *Service { return &Service{store: st} }

type ChallengeResult struct {
	BattleID      int64         `json:"battleId"`
	WinnerID      string        `json:"winnerId"`
	RatingDelta   int           `json:"ratingDelta"`
	Battle        combat.Result `json:"battle"`
}

func (s *Service) Challenge(ctx context.Context, attackerID, defenderID string) (ChallengeResult, error) {
	if attackerID == "" || defenderID == "" || attackerID == defenderID {
		return ChallengeResult{}, errors.New("invalid opponent")
	}
	attacker, _, err := s.store.LoadState(ctx, attackerID)
	if err != nil { return ChallengeResult{}, err }
	defender, _, err := s.store.LoadState(ctx, defenderID)
	if err != nil { return ChallengeResult{}, err }
	ap, err := s.store.Profile(ctx, attackerID)
	if err != nil { return ChallengeResult{}, fmt.Errorf("attacker profile: %w", err) }
	dp, err := s.store.Profile(ctx, defenderID)
	if err != nil { return ChallengeResult{}, fmt.Errorf("defender profile: %w", err) }

	seed, err := randomSeed()
	if err != nil { return ChallengeResult{}, err }
	aStats := attacker.CombatStats()
	dStats := defender.CombatStats()
	result := combat.Resolve(attackerID, defenderID, aStats, dStats, seed)
	aWon := result.Winner == attackerID
	delta := combat.RatingDelta(ap.Rating, dp.Rating, aWon)
	newA := ap.Rating + delta
	newD := dp.Rating - delta
	if newA < 0 { newA = 0 }
	if newD < 0 { newD = 0 }

	id, err := s.store.RecordBattle(ctx, store.BattleRecord{
		AttackerID: attackerID,
		DefenderID: defenderID,
		Seed: seed,
		AttackerSnapshot: aStats,
		DefenderSnapshot: dStats,
		Result: result,
		WinnerID: result.Winner,
		AttackerDelta: newA - ap.Rating,
		DefenderDelta: newD - dp.Rating,
	}, ap.Rating, dp.Rating, newA, newD)
	if err != nil { return ChallengeResult{}, err }

	return ChallengeResult{
		BattleID: id,
		WinnerID: result.Winner,
		RatingDelta: newA - ap.Rating,
		Battle: result,
	}, nil
}

func randomSeed() (int64, error) {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil { return 0, err }
	return int64(binary.LittleEndian.Uint64(b[:]) & 0x7fffffffffffffff), nil
}
