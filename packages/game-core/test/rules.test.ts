import { describe, expect, it } from "vitest";
import { CLEAN_LIFE_TM, STAGES, TM_CATALOG, creditSeconds, deathProb, lifespanCap, multipliers, statCost, tangSeconds, usedYears } from "../src/index.ts";

describe("game-core", () => {
  it("một kiếp sạch = 135 TM, 15 giai đoạn, 33 ngày tham chiếu", () => {
    expect(CLEAN_LIFE_TM).toBe(135);
    expect(STAGES).toHaveLength(15);
    expect(STAGES.reduce((a, s) => a + s.day_end - s.day_start, 0)).toBe(33);
  });
  it("hiệu suất offline theo bậc", () => {
    expect(creditSeconds(3600)).toBe(3600);
    expect(creditSeconds(16 * 3600)).toBeCloseTo(8 * 3600 + 8 * 3600 * 0.7, 6);
    expect(creditSeconds(24 * 3600)).toBeCloseTo(60480, 6);
    expect(creditSeconds(99 * 3600)).toBeCloseTo(60480, 6);
    expect(creditSeconds(-1)).toBe(0);
  });
  it("thọ nguyên: 100 ở giai đoạn đầu, 100 + 20d sau khi hoàn tất", () => {
    expect(lifespanCap(0)).toBe(100);
    for (const s of STAGES) expect(s.lifespan_cap_after).toBe(100 + 20 * s.day_end);
    expect(lifespanCap(1)).toBe(111);
    expect(usedYears(86400)).toBe(10);
  });
  it("đường sạch dùng chưa tới một nửa thọ nguyên được cấp", () => {
    for (const s of STAGES) expect(usedYears(s.day_end * 86400)).toBeLessThanOrEqual(0.5 * s.lifespan_cap_after);
  });
  it("Quán Đỉnh: tổng giá 2.280 TM và guardrail", () => {
    const stats = TM_CATALOG.filter(c => c.kind === "stat");
    let total = 0;
    for (const c of stats) for (let l = 0; l < (c.level_cap ?? 0); l++) total += statCost(c.stat_key as never, l)!;
    expect(total).toBe(2280);
    expect(statCost("CanCot", 20)).toBeNull();
    const m = multipliers({ TuongMao: 20, PhucDuyen: 20, CanCot: 20, NgoTinh: 20, VanKhi: 20 });
    expect(m.speed).toBeCloseTo(1.12, 9); expect(m.risk).toBeCloseTo(0.7, 9);
    expect(m.speed).toBeLessThanOrEqual(1.25); expect(m.risk).toBeGreaterThanOrEqual(0.5);
  });
  it("xác suất chết", () => {
    expect(deathProb(0, 1)).toBe(0);
    expect(deathProb(9, 1)).toBe(0.06);
    expect(deathProb(9, 0.5)).toBe(0.03);
    expect(deathProb(9, 1, 1000)).toBe(1);
    expect(tangSeconds(0)).toBe(5076);
  });
});
