// SINH TỰ ĐỘNG bởi tools/gen-static.mjs từ data/*.csv. KHÔNG sửa tay.
export interface Stage { idx: number; stage_id: string; name: string; world: "Hạ Giới" | "Linh Giới" | "Tiên Giới"; day_start: number; day_end: number; lifespan_cap_after: number; clean_consumed_years: number; p_death_tang9: number }
export interface CatalogEntry { id: string; name: string; kind: "stat" | "item"; stat_key: string | null; base_cost: number | null; step_cost: number | null; level_cap: number | null; cost: number | null; per_life_limit: number | null; effect: string }
export const STAGES: readonly Stage[] = [
  {
    "idx": 0,
    "stage_id": "HG00",
    "name": "Phàm Nhân",
    "world": "Hạ Giới",
    "day_start": 0,
    "day_end": 1,
    "lifespan_cap_after": 120,
    "clean_consumed_years": 10,
    "p_death_tang9": 0
  },
  {
    "idx": 1,
    "stage_id": "HG01",
    "name": "Luyện Khí",
    "world": "Hạ Giới",
    "day_start": 1,
    "day_end": 3,
    "lifespan_cap_after": 160,
    "clean_consumed_years": 30,
    "p_death_tang9": 0.005
  },
  {
    "idx": 2,
    "stage_id": "HG02",
    "name": "Trúc Cơ",
    "world": "Hạ Giới",
    "day_start": 3,
    "day_end": 6,
    "lifespan_cap_after": 220,
    "clean_consumed_years": 60,
    "p_death_tang9": 0.008
  },
  {
    "idx": 3,
    "stage_id": "HG03",
    "name": "Kim Đan",
    "world": "Hạ Giới",
    "day_start": 6,
    "day_end": 10,
    "lifespan_cap_after": 300,
    "clean_consumed_years": 100,
    "p_death_tang9": 0.01
  },
  {
    "idx": 4,
    "stage_id": "HG04",
    "name": "Nguyên Anh",
    "world": "Hạ Giới",
    "day_start": 10,
    "day_end": 13,
    "lifespan_cap_after": 360,
    "clean_consumed_years": 130,
    "p_death_tang9": 0.012
  },
  {
    "idx": 5,
    "stage_id": "HG05",
    "name": "Hóa Thần",
    "world": "Hạ Giới",
    "day_start": 13,
    "day_end": 15,
    "lifespan_cap_after": 400,
    "clean_consumed_years": 150,
    "p_death_tang9": 0.03
  },
  {
    "idx": 6,
    "stage_id": "LG01",
    "name": "Luyện Hư",
    "world": "Linh Giới",
    "day_start": 15,
    "day_end": 20,
    "lifespan_cap_after": 500,
    "clean_consumed_years": 200,
    "p_death_tang9": 0.01
  },
  {
    "idx": 7,
    "stage_id": "LG02",
    "name": "Hợp Thể",
    "world": "Linh Giới",
    "day_start": 20,
    "day_end": 27,
    "lifespan_cap_after": 640,
    "clean_consumed_years": 270,
    "p_death_tang9": 0.012
  },
  {
    "idx": 8,
    "stage_id": "LG03",
    "name": "Đại Thừa",
    "world": "Linh Giới",
    "day_start": 27,
    "day_end": 33,
    "lifespan_cap_after": 760,
    "clean_consumed_years": 330,
    "p_death_tang9": 0.015
  },
  {
    "idx": 9,
    "stage_id": "LG04",
    "name": "Độ Kiếp / Phi Thăng",
    "world": "Linh Giới",
    "day_start": 33,
    "day_end": 35,
    "lifespan_cap_after": 800,
    "clean_consumed_years": 350,
    "p_death_tang9": 0.06
  },
  {
    "idx": 10,
    "stage_id": "TG01",
    "name": "Ngụy Tiên",
    "world": "Tiên Giới",
    "day_start": 35,
    "day_end": 39,
    "lifespan_cap_after": 880,
    "clean_consumed_years": 390,
    "p_death_tang9": 0.01
  },
  {
    "idx": 11,
    "stage_id": "TG02",
    "name": "Chân Tiên",
    "world": "Tiên Giới",
    "day_start": 39,
    "day_end": 45,
    "lifespan_cap_after": 1000,
    "clean_consumed_years": 450,
    "p_death_tang9": 0.012
  },
  {
    "idx": 12,
    "stage_id": "TG03",
    "name": "Kim Tiên",
    "world": "Tiên Giới",
    "day_start": 45,
    "day_end": 51,
    "lifespan_cap_after": 1120,
    "clean_consumed_years": 510,
    "p_death_tang9": 0.015
  },
  {
    "idx": 13,
    "stage_id": "TG04",
    "name": "Thái Ất",
    "world": "Tiên Giới",
    "day_start": 51,
    "day_end": 56,
    "lifespan_cap_after": 1220,
    "clean_consumed_years": 560,
    "p_death_tang9": 0.02
  },
  {
    "idx": 14,
    "stage_id": "TG05",
    "name": "Đại La sơ nhập / Đài Quy Hương",
    "world": "Tiên Giới",
    "day_start": 56,
    "day_end": 60,
    "lifespan_cap_after": 1300,
    "clean_consumed_years": 600,
    "p_death_tang9": 0.025
  }
] as const;
export const TM_CATALOG: readonly CatalogEntry[] = [
  {
    "id": "TMSTAT-001",
    "name": "Quán Đỉnh Tướng Mạo",
    "kind": "stat",
    "stat_key": "TuongMao",
    "base_cost": 6,
    "step_cost": 1,
    "level_cap": 20,
    "cost": null,
    "per_life_limit": null,
    "effect": "+1 Tướng Mạo vĩnh viễn"
  },
  {
    "id": "TMSTAT-002",
    "name": "Quán Đỉnh Phúc Duyên",
    "kind": "stat",
    "stat_key": "PhucDuyen",
    "base_cost": 7,
    "step_cost": 1,
    "level_cap": 20,
    "cost": null,
    "per_life_limit": null,
    "effect": "+1 Phúc Duyên vĩnh viễn"
  },
  {
    "id": "TMSTAT-003",
    "name": "Quán Đỉnh Căn Cốt",
    "kind": "stat",
    "stat_key": "CanCot",
    "base_cost": 8,
    "step_cost": 2,
    "level_cap": 20,
    "cost": null,
    "per_life_limit": null,
    "effect": "+1 Căn Cốt vĩnh viễn"
  },
  {
    "id": "TMSTAT-004",
    "name": "Quán Đỉnh Ngộ Tính",
    "kind": "stat",
    "stat_key": "NgoTinh",
    "base_cost": 8,
    "step_cost": 2,
    "level_cap": 20,
    "cost": null,
    "per_life_limit": null,
    "effect": "+1 Ngộ Tính vĩnh viễn"
  },
  {
    "id": "TMSTAT-005",
    "name": "Quán Đỉnh Vận Khí",
    "kind": "stat",
    "stat_key": "VanKhi",
    "base_cost": 9,
    "step_cost": 2,
    "level_cap": 20,
    "cost": null,
    "per_life_limit": null,
    "effect": "+1 Vận Khí vĩnh viễn"
  },
  {
    "id": "TMITEM-001",
    "name": "Định Linh Châu",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 20,
    "per_life_limit": 1,
    "effect": "Chọn một thuộc tính ưu tiên khi tinh luyện linh căn trong kiếp"
  },
  {
    "id": "TMITEM-002",
    "name": "Thiên Cơ Lệnh",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 25,
    "per_life_limit": 2,
    "effect": "Mở một kỳ ngộ Thiên Cơ đặc biệt"
  },
  {
    "id": "TMITEM-003",
    "name": "Phá Vọng Kính",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 28,
    "per_life_limit": 2,
    "effect": "Hiện một đường ẩn/bẫy quan trọng trong bí cảnh"
  },
  {
    "id": "TMITEM-004",
    "name": "Nghịch Mệnh Phù",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 35,
    "per_life_limit": 1,
    "effect": "Một lần chuyển lethal breakthrough failure thành trọng thương; phải kích hoạt trước lần đột phá"
  },
  {
    "id": "TMITEM-005",
    "name": "Thần Hành Phù",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 30,
    "per_life_limit": 1,
    "effect": "Cho phép rút khỏi bí cảnh lethal khi chưa tử vong; không dùng sau HP=0"
  },
  {
    "id": "TMITEM-006",
    "name": "Vạn Tượng Phôi",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 40,
    "per_life_limit": 1,
    "effect": "Phôi chế tạo trang bị hiếm với affix đặc biệt"
  },
  {
    "id": "TMITEM-007",
    "name": "Đạo Văn Mặc",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 45,
    "per_life_limit": 1,
    "effect": "Khắc một dòng Đạo Văn hiếm lên trang bị đủ điều kiện"
  },
  {
    "id": "TMITEM-008",
    "name": "Vô Tự Cổ Quyển",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 55,
    "per_life_limit": 1,
    "effect": "Mở lựa chọn học một công pháp Thiên Mệnh hiếm trong kiếp"
  },
  {
    "id": "TMITEM-009",
    "name": "Tẩy Tủy Thiên Đan",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 60,
    "per_life_limit": 2,
    "effect": "+1 chỉ số gốc của kiếp hiện tại, không tính vào permanent TM stat"
  },
  {
    "id": "TMITEM-010",
    "name": "Linh Hồn Định Châm",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 65,
    "per_life_limit": 1,
    "effect": "Giảm một bậc hình phạt tâm ma trong một lần thử"
  },
  {
    "id": "TMITEM-011",
    "name": "Thiên Mệnh Trận Kỳ",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 75,
    "per_life_limit": 1,
    "effect": "Mở một trận pháp phụ trợ hiếm cho bí cảnh"
  },
  {
    "id": "TMITEM-012",
    "name": "Cổ Ấn Vấn Đạo",
    "kind": "item",
    "stat_key": null,
    "base_cost": null,
    "step_cost": null,
    "level_cap": null,
    "cost": 90,
    "per_life_limit": 1,
    "effect": "Mở thử thách account-lore đặc biệt; phần thưởng không phải TM"
  }
] as const;
export const RULES = {
  "offline": {
    "full_hours": 8,
    "mid_efficiency": 0.7,
    "low_efficiency": 0.4,
    "cap_hours": 24
  },
  "tang_per_stage": 9,
  "tho_nguyen": {
    "start_years": 100,
    "use_years_per_credited_day": 10
  },
  "stat_effects": {
    "CanCot": {
      "speed": 0.002,
      "risk": 0.01
    },
    "NgoTinh": {
      "speed": 0.004,
      "risk": 0
    },
    "VanKhi": {
      "speed": 0,
      "risk": 0.005
    },
    "TuongMao": {
      "speed": 0,
      "risk": 0
    },
    "PhucDuyen": {
      "speed": 0,
      "risk": 0
    }
  },
  "speed_cap": 1.25,
  "risk_floor": 0.5,
  "hazard_scale": 1,
  "time_scale": 1,
  "intent_ttl_s": 120
} as const;
