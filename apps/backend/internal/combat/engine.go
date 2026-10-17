package combat

import (
	"math"
	"math/rand"

	"github.com/zeplaovn/Hu-gioi/apps/backend/internal/game"
)

type Turn struct {
	Round      int    `json:"round"`
	Actor      string `json:"actor"`
	Target     string `json:"target"`
	Damage     int64  `json:"damage"`
	Critical   bool   `json:"critical"`
	TargetHP   int64  `json:"targetHp"`
}

type Result struct {
	Winner string `json:"winner"`
	Rounds int    `json:"rounds"`
	Log    []Turn `json:"log"`
}

type fighter struct {
	id    string
	stats game.CombatStats
	hp    int64
}

func Resolve(attackerID, defenderID string, a, d game.CombatStats, seed int64) Result {
	rng := rand.New(rand.NewSource(seed))
	left := fighter{id: attackerID, stats: a, hp: a.HP}
	right := fighter{id: defenderID, stats: d, hp: d.HP}
	log := make([]Turn, 0, 40)

	for round := 1; round <= 100; round++ {
		first, second := &left, &right
		if right.stats.Speed > left.stats.Speed || (right.stats.Speed == left.stats.Speed && rng.Intn(2) == 0) {
			first, second = &right, &left
		}
		attack(round, first, second, rng, &log)
		if second.hp <= 0 {
			return Result{Winner: first.id, Rounds: round, Log: log}
		}
		attack(round, second, first, rng, &log)
		if first.hp <= 0 {
			return Result{Winner: second.id, Rounds: round, Log: log}
		}
	}

	winner := left.id
	if right.hp > left.hp {
		winner = right.id
	}
	return Result{Winner: winner, Rounds: 100, Log: log}
}

func attack(round int, actor, target *fighter, rng *rand.Rand, log *[]Turn) {
	jitter := 0.90 + rng.Float64()*0.20
	base := float64(actor.stats.Attack) - float64(target.stats.Defense)*0.45
	if base < 1 {
		base = 1
	}
	crit := rng.Float64() < clamp(actor.stats.CritRate, 0, 0.45)
	if crit {
		base *= 1.65
	}
	damage := int64(math.Round(base * jitter))
	if damage < 1 {
		damage = 1
	}
	target.hp -= damage
	if target.hp < 0 {
		target.hp = 0
	}
	*log = append(*log, Turn{
		Round: round,
		Actor: actor.id,
		Target: target.id,
		Damage: damage,
		Critical: crit,
		TargetHP: target.hp,
	})
}

func clamp(v, min, max float64) float64 {
	if v < min { return min }
	if v > max { return max }
	return v
}

func RatingDelta(attackerRating, defenderRating int, attackerWon bool) int {
	expected := 1.0 / (1.0 + math.Pow(10, float64(defenderRating-attackerRating)/400.0))
	score := 0.0
	if attackerWon { score = 1.0 }
	delta := int(math.Round(24 * (score - expected)))
	if delta == 0 {
		if attackerWon { return 1 }
		return -1
	}
	return delta
}
