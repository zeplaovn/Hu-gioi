// SINH TỰ ĐỘNG bởi tools/gen-static.mjs từ data/v21/*.json. KHÔNG sửa tay.
export interface Stage { idx: number; stage_id: string; name: string; world: "Hạ Giới" | "Linh Giới" | "Tiên Giới"; day_start: number; day_end: number; lifespan_cap_after: number; clean_consumed_years: number; p_death_tang9: number }
export interface CatalogEntry { id: string; name: string; kind: "stat" | "item"; stat_key: string | null; base_cost: number | null; step_cost: number | null; level_cap: number | null; cost: number | null; per_life_limit: number | null; effect: string }
export const STAGES: readonly Stage[] = [
  {
    "idx": 1,
    "stage_id": "HG01",
    "name": "Luyện Khí",
    "world": "Hạ Giới",
    "day_start": 0,
    "day_end": 1.65,
    "lifespan_cap_after": 133,
    "clean_consumed_years": 16.5,
    "p_death_tang9": 0.005
  },
  {
    "idx": 2,
    "stage_id": "HG02",
    "name": "Trúc Cơ",
    "world": "Hạ Giới",
    "day_start": 1.65,
    "day_end": 3.3,
    "lifespan_cap_after": 166,
    "clean_consumed_years": 33,
    "p_death_tang9": 0.008
  },
  {
    "idx": 3,
    "stage_id": "HG03",
    "name": "Kim Đan",
    "world": "Hạ Giới",
    "day_start": 3.3,
    "day_end": 5.5,
    "lifespan_cap_after": 210,
    "clean_consumed_years": 55,
    "p_death_tang9": 0.01
  },
  {
    "idx": 4,
    "stage_id": "HG04",
    "name": "Nguyên Anh",
    "world": "Hạ Giới",
    "day_start": 5.5,
    "day_end": 7.15,
    "lifespan_cap_after": 243,
    "clean_consumed_years": 71.5,
    "p_death_tang9": 0.012
  },
  {
    "idx": 5,
    "stage_id": "HG05",
    "name": "Hóa Thần",
    "world": "Hạ Giới",
    "day_start": 7.15,
    "day_end": 8.25,
    "lifespan_cap_after": 265,
    "clean_consumed_years": 82.5,
    "p_death_tang9": 0.03
  },
  {
    "idx": 6,
    "stage_id": "LG01",
    "name": "Luyện Hư",
    "world": "Linh Giới",
    "day_start": 8.25,
    "day_end": 11,
    "lifespan_cap_after": 320,
    "clean_consumed_years": 110,
    "p_death_tang9": 0.01
  },
  {
    "idx": 7,
    "stage_id": "LG02",
    "name": "Hợp Thể",
    "world": "Linh Giới",
    "day_start": 11,
    "day_end": 14.85,
    "lifespan_cap_after": 397,
    "clean_consumed_years": 148.5,
    "p_death_tang9": 0.012
  },
  {
    "idx": 8,
    "stage_id": "LG03",
    "name": "Đại Thừa",
    "world": "Linh Giới",
    "day_start": 14.85,
    "day_end": 18.15,
    "lifespan_cap_after": 463,
    "clean_consumed_years": 181.5,
    "p_death_tang9": 0.015
  },
  {
    "idx": 9,
    "stage_id": "LG04",
    "name": "Độ Kiếp / Phi Thăng",
    "world": "Linh Giới",
    "day_start": 18.15,
    "day_end": 19.25,
    "lifespan_cap_after": 485,
    "clean_consumed_years": 192.5,
    "p_death_tang9": 0.06
  },
  {
    "idx": 10,
    "stage_id": "TG01",
    "name": "Ngụy Tiên",
    "world": "Tiên Giới",
    "day_start": 19.25,
    "day_end": 21.45,
    "lifespan_cap_after": 529,
    "clean_consumed_years": 214.5,
    "p_death_tang9": 0.01
  },
  {
    "idx": 11,
    "stage_id": "TG02",
    "name": "Chân Tiên",
    "world": "Tiên Giới",
    "day_start": 21.45,
    "day_end": 24.75,
    "lifespan_cap_after": 595,
    "clean_consumed_years": 247.5,
    "p_death_tang9": 0.012
  },
  {
    "idx": 12,
    "stage_id": "TG03",
    "name": "Kim Tiên",
    "world": "Tiên Giới",
    "day_start": 24.75,
    "day_end": 28.05,
    "lifespan_cap_after": 661,
    "clean_consumed_years": 280.5,
    "p_death_tang9": 0.015
  },
  {
    "idx": 13,
    "stage_id": "TG04",
    "name": "Thái Ất",
    "world": "Tiên Giới",
    "day_start": 28.05,
    "day_end": 30.8,
    "lifespan_cap_after": 716,
    "clean_consumed_years": 308,
    "p_death_tang9": 0.02
  },
  {
    "idx": 14,
    "stage_id": "TG05",
    "name": "Đại La sơ nhập / Đài Quy Hương",
    "world": "Tiên Giới",
    "day_start": 30.8,
    "day_end": 33,
    "lifespan_cap_after": 760,
    "clean_consumed_years": 330,
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
  "design_version": "2.1",
  "tier_seconds": [
    [
      5076,
      5076,
      5076,
      5076,
      5076,
      5076,
      5076,
      5076,
      5076
    ],
    [
      7658.181818181819,
      8345.454545454546,
      9098.181818181818,
      9916.363636363636,
      10865.454545454546,
      11781.818181818182,
      12861.818181818182,
      14007.272727272728,
      15250.90909090909
    ],
    [
      7646.280991735536,
      8360.330578512398,
      9104.13223140496,
      9937.190082644629,
      10829.752066115703,
      11811.570247933883,
      12852.892561983472,
      14013.223140495867,
      15262.809917355371
    ],
    [
      10223.89181066867,
      11143.501126972202,
      12144.252441773104,
      13253.193087903832,
      14443.27573253193,
      15714.500375657402,
      17148.00901577761,
      18689.706987227648,
      20366.641622839972
    ],
    [
      7671.6071306604745,
      8360.084693668465,
      9097.739225462743,
      9933.747694829588,
      10818.93313298272,
      11802.472508708423,
      12835.188853220408,
      14015.436104091252,
      15269.44880814152
    ],
    [
      5118.907171685812,
      5565.973300217323,
      6080.099348028562,
      6616.578702266376,
      7220.117975783918,
      7846.010555728034,
      8561.316361378453,
      9343.682086308598,
      10170.754424091896
    ],
    [
      12781.666290358997,
      13919.620681869495,
      15179.498758184693,
      16540.97990517047,
      18024.38473696094,
      19650.03386769022,
      21417.92729735832,
      23348.385640099346,
      25441.4088959133
    ],
    [
      17882.691024785756,
      19489.91635449274,
      21244.932519115308,
      23147.739518653463,
      25235.285061836097,
      27507.56914866321,
      30001.539487863705,
      32680.248370708676,
      35636.06506902038
    ],
    [
      15316.290352677737,
      16710.207128195558,
      18221.68314984139,
      19850.718417615226,
      21630.901287553646,
      23579.025937674938,
      25711.886545997386,
      28012.688934502705,
      30531.815637245756
    ],
    [
      5099.452903006913,
      5572.755417956657,
      6076.59357903219,
      6610.967386233513,
      7206.412485686416,
      7862.928877390898,
      8565.248738284066,
      9343.90771449171,
      10183.637982950931
    ],
    [
      10215.522226934494,
      11131.588078806339,
      12144.812430119135,
      13241.315495238461,
      14434.977059798744,
      15725.797123799977,
      17141.53525851101,
      18682.191463931835,
      20361.64552569688
    ],
    [
      15330.692930496654,
      16706.03904524903,
      18207.563702639232,
      19847.884756931056,
      21639.62006238828,
      23582.7696190109,
      25702.56913532649,
      28024.254319862604,
      30547.825172619254
    ],
    [
      15325.006372673977,
      16701.503951057864,
      18215.651287280143,
      19844.506755034414,
      21645.42442008667,
      23583.991842977313,
      25706.092276319145,
      28023.19653326536,
      30546.77542696916
    ],
    [
      12774.092633896242,
      13921.154013266518,
      15172.493699852272,
      16538.539524375054,
      18029.71931755641,
      19656.460910117894,
      21418.764302059495,
      23347.912985545867,
      25454.334791298556
    ],
    [
      10219.354838709678,
      11138.907175773535,
      12134.29888084266,
      13233.969716919026,
      14418.959842001317,
      15717.709019091506,
      17139.697169190254,
      18684.924292297565,
      20362.87030941409
    ]
  ],
  "progression_reference": {
    "effective_hours_per_day": 16.8,
    "note": "XP reference assumes one collection per 24h; two evenly spaced collections yield 21.6h before other bonuses. Calendar completion must be validated separately."
  },
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
