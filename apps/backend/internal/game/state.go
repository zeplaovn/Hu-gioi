package game

import (
	"encoding/json"
	"math"
	"time"
)

type FarmState struct {
	Crop      string     `json:"crop,omitempty"`
	PlantedAt *time.Time `json:"plantedAt,omitempty"`
}

type SectState struct {
	Contribution  int64      `json:"contribution"`
	LastMissionAt *time.Time `json:"lastMissionAt,omitempty"`
}

type State struct {
	Name         string           `json:"name"`
	Realm        int              `json:"realm"`
	Level        int              `json:"level"`
	Qi           int64            `json:"qi"`
	SpiritStones int64            `json:"spiritStones"`
	Power        int64            `json:"power"`
	LastTick     time.Time        `json:"lastTick"`
	Inventory    map[string]int64 `json:"inventory"`
	Farm         FarmState        `json:"farm"`
	Sect         SectState        `json:"sect"`
	Legacy       json.RawMessage  `json:"legacy,omitempty"`
}

type IdleGain struct {
	Seconds      int64 `json:"seconds"`
	Qi           int64 `json:"qi"`
	SpiritStones int64 `json:"spiritStones"`
}

func DefaultState(now time.Time) State {
	return State{
		Name:         "Vô Danh",
		Realm:        0,
		Level:        1,
		Qi:           0,
		SpiritStones: 100,
		Power:        100,
		LastTick:     now.UTC(),
		Inventory: map[string]int64{
			"herb": 0,
			"pill": 0,
		},
	}
}

func (s *State) Normalize(now time.Time) {
	if s.Name == "" {
		s.Name = "Vô Danh"
	}
	if s.Level < 1 {
		s.Level = 1
	}
	if s.Realm < 0 {
		s.Realm = 0
	}
	if s.Inventory == nil {
		s.Inventory = map[string]int64{}
	}
	if s.LastTick.IsZero() {
		s.LastTick = now.UTC()
	}
	s.RecalculatePower()
}

func (s *State) RecalculatePower() {
	inventoryPower := int64(0)
	for _, n := range s.Inventory {
		if n > 0 {
			inventoryPower += n
		}
	}
	s.Power = 100 + int64(s.Realm)*750 + int64(s.Level)*120 + s.Qi/100 + inventoryPower*3 + s.Sect.Contribution/10
}

func (s *State) ApplyIdle(now time.Time) IdleGain {
	s.Normalize(now)
	if !now.After(s.LastTick) {
		return IdleGain{}
	}
	seconds := int64(now.Sub(s.LastTick).Seconds())
	const maxIdle = int64(12 * 60 * 60)
	if seconds > maxIdle {
		seconds = maxIdle
	}
	if seconds < 1 {
		return IdleGain{}
	}
	qiPerMinute := int64(4 + s.Level + s.Realm*5)
	stonePerTenMinutes := int64(1 + s.Realm)
	gain := IdleGain{
		Seconds:      seconds,
		Qi:           qiPerMinute * seconds / 60,
		SpiritStones: stonePerTenMinutes * seconds / 600,
	}
	s.Qi += gain.Qi
	s.SpiritStones += gain.SpiritStones
	s.LastTick = now.UTC()
	s.RecalculatePower()
	return gain
}

func BreakthroughCost(realm, level int) int64 {
	base := 150.0 * math.Pow(1.55, float64(realm))
	return int64(base) + int64(level*level*20)
}

func (s State) CombatStats() CombatStats {
	hp := int64(500 + s.Realm*350 + s.Level*70)
	return CombatStats{
		Name:     s.Name,
		Power:    s.Power,
		HP:       hp + s.Power/5,
		Attack:   int64(30+s.Realm*30+s.Level*8) + s.Power/30,
		Defense:  int64(15+s.Realm*18+s.Level*5) + s.Power/55,
		Speed:    int64(20+s.Level*2+s.Realm*4) + s.Power/400,
		CritRate: 0.08 + math.Min(0.22, float64(s.Realm)*0.012),
	}
}

type CombatStats struct {
	Name     string  `json:"name"`
	Power    int64   `json:"power"`
	HP       int64   `json:"hp"`
	Attack   int64   `json:"attack"`
	Defense  int64   `json:"defense"`
	Speed    int64   `json:"speed"`
	CritRate float64 `json:"critRate"`
}
