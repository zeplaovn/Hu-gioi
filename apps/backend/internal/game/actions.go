package game

import (
	"errors"
	"strings"
	"time"
)

type ActionRequest struct {
	Type    string         `json:"type"`
	Payload map[string]any `json:"payload,omitempty"`
}

type ActionResult struct {
	Message string `json:"message"`
}

var ErrInvalidAction = errors.New("invalid action")
var ErrNotEnough = errors.New("not enough resources")
var ErrCooldown = errors.New("cooldown")
var ErrNotReady = errors.New("not ready")

func ApplyAction(s *State, req ActionRequest, now time.Time) (ActionResult, error) {
	s.ApplyIdle(now)
	switch strings.ToLower(strings.TrimSpace(req.Type)) {
	case "cultivate":
		gain := int64(8 + s.Level*2 + s.Realm*6)
		s.Qi += gain
		s.RecalculatePower()
		return ActionResult{Message: "Tu luyện +" + itoa(gain) + " tu vi"}, nil

	case "breakthrough":
		cost := BreakthroughCost(s.Realm, s.Level)
		if s.Qi < cost {
			return ActionResult{}, ErrNotEnough
		}
		s.Qi -= cost
		s.Level++
		if s.Level > 9 {
			s.Level = 1
			s.Realm++
		}
		s.RecalculatePower()
		return ActionResult{Message: "Đột phá thành công"}, nil

	case "farm.plant":
		if s.Farm.PlantedAt != nil {
			return ActionResult{}, ErrCooldown
		}
		crop := stringPayload(req.Payload, "crop", "linh-thao")
		t := now.UTC()
		s.Farm = FarmState{Crop: crop, PlantedAt: &t}
		return ActionResult{Message: "Đã gieo linh thảo"}, nil

	case "farm.harvest":
		if s.Farm.PlantedAt == nil {
			return ActionResult{}, ErrNotReady
		}
		grow := 5 * time.Minute
		if now.Sub(*s.Farm.PlantedAt) < grow {
			return ActionResult{}, ErrNotReady
		}
		amount := int64(2 + s.Realm/2)
		s.Inventory["herb"] += amount
		s.Farm = FarmState{}
		s.RecalculatePower()
		return ActionResult{Message: "Thu hoạch +" + itoa(amount) + " linh thảo"}, nil

	case "craft.pill":
		const herbs = int64(3)
		if s.Inventory["herb"] < herbs {
			return ActionResult{}, ErrNotEnough
		}
		s.Inventory["herb"] -= herbs
		s.Inventory["pill"]++
		s.RecalculatePower()
		return ActionResult{Message: "Luyện đan thành công"}, nil

	case "use.pill":
		if s.Inventory["pill"] < 1 {
			return ActionResult{}, ErrNotEnough
		}
		s.Inventory["pill"]--
		gain := int64(120 + s.Realm*50)
		s.Qi += gain
		s.RecalculatePower()
		return ActionResult{Message: "Dùng đan dược +" + itoa(gain) + " tu vi"}, nil

	case "sect.mission":
		if s.Sect.LastMissionAt != nil && now.Sub(*s.Sect.LastMissionAt) < 30*time.Minute {
			return ActionResult{}, ErrCooldown
		}
		t := now.UTC()
		s.Sect.LastMissionAt = &t
		s.Sect.Contribution += int64(10 + s.Realm*2)
		s.SpiritStones += int64(15 + s.Realm*5)
		s.RecalculatePower()
		return ActionResult{Message: "Hoàn thành nhiệm vụ tông môn"}, nil

	default:
		return ActionResult{}, ErrInvalidAction
	}
}

func stringPayload(m map[string]any, key, fallback string) string {
	if m == nil {
		return fallback
	}
	v, _ := m[key].(string)
	v = strings.TrimSpace(v)
	if v == "" || len(v) > 40 {
		return fallback
	}
	return v
}

func itoa(v int64) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var b [32]byte
	i := len(b)
	for v > 0 {
		i--
		b[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
