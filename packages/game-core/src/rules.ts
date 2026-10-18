/* Công thức game phía TypeScript — CHỈ để hiển thị/dự đoán ở client và test.
 * Nguồn sự thật là hàm pgSQL trong supabase/migrations; test/parity.test.ts đối chiếu hai bên trên Postgres thật. */
import { RULES, STAGES, TM_CATALOG } from "./data.generated.ts";

export type StatKey = "TuongMao" | "PhucDuyen" | "CanCot" | "NgoTinh" | "VanKhi";
export const STAT_KEYS: readonly StatKey[] = ["TuongMao", "PhucDuyen", "CanCot", "NgoTinh", "VanKhi"];
export const STAT_LABEL: Record<StatKey, string> = {
  TuongMao: "Tướng Mạo", PhucDuyen: "Phúc Duyên", CanCot: "Căn Cốt", NgoTinh: "Ngộ Tính", VanKhi: "Vận Khí",
};

export const TANG_PER_STAGE = RULES.tang_per_stage;
export const STAGE_COUNT = STAGES.length;
/** TM cho một kiếp hoàn tất: 15 giai đoạn × 9 tầng × 1 TM/tầng = 135. */
export const CLEAN_LIFE_TM = STAGE_COUNT * TANG_PER_STAGE;

/** Giây được tính từ khoảng vắng mặt: 8h đầu 100%, 8–16h 70%, 16–24h 40%, quá 24h không tính. */
export function creditSeconds(elapsedS: number): number {
  const o = RULES.offline, full = o.full_hours * 3600, cap = o.cap_hours * 3600;
  const t = Math.min(Math.max(elapsedS, 0), cap);
  return Math.min(t, full) + Math.max(Math.min(t, 2 * full) - full, 0) * o.mid_efficiency + Math.max(t - 2 * full, 0) * o.low_efficiency;
}

/** Số giây tu luyện (tốc độ 1.0) cho một tầng của giai đoạn. */
export function tangSeconds(stageIdx: number): number {
  const s = STAGES[stageIdx];
  if (!s) throw new RangeError("stage " + stageIdx);
  return ((s.day_end - s.day_start) * 86400) / TANG_PER_STAGE;
}

/** Thọ nguyên tối đa khi đang ở giai đoạn này. */
export function lifespanCap(stageIdx: number): number {
  if (stageIdx === 0) return RULES.tho_nguyen.start_years;
  const prev = STAGES[stageIdx - 1];
  if (!prev) throw new RangeError("stage " + stageIdx);
  return prev.lifespan_cap_after;
}

export function usedYears(creditedSeconds: number): number {
  return (creditedSeconds / 86400) * RULES.tho_nguyen.use_years_per_credited_day;
}

export function multipliers(levels: Partial<Record<StatKey, number>>): { speed: number; risk: number } {
  let s = 0, r = 0;
  for (const k of STAT_KEYS) {
    const lv = levels[k] ?? 0, e = RULES.stat_effects[k];
    s += lv * e.speed; r += lv * e.risk;
  }
  return { speed: Math.min(RULES.speed_cap, 1 + s), risk: Math.max(RULES.risk_floor, 1 - r) };
}

/** Giá nâng cấp Quán Đỉnh lên cấp tiếp theo; null nếu đã tới trần. */
export function statCost(stat: StatKey, level: number): number | null {
  const c = TM_CATALOG.find(x => x.kind === "stat" && x.stat_key === stat);
  if (!c || c.base_cost === null || c.step_cost === null || c.level_cap === null) throw new Error("stat " + stat);
  return level >= c.level_cap ? null : c.base_cost + c.step_cost * level;
}

/** Xác suất chết khi đại đột phá (đã làm tròn 6 chữ số như SQL). Xác suất gốc là GIẢ ĐỊNH chưa đo. */
export function deathProb(stageIdx: number, risk: number, hazardScale: number = RULES.hazard_scale): number {
  const s = STAGES[stageIdx];
  if (!s) throw new RangeError("stage " + stageIdx);
  return Math.round(Math.min(1, s.p_death_tang9 * hazardScale * risk) * 1e6) / 1e6;
}
