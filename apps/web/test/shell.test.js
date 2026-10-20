import { describe, expect, it } from "vitest";
import { cheapestUpgrade, idleStatus, lifeDay, lifespanLeft, nextHint, progressOf, seasonOf } from "../src/shell.js";

const life = (o = {}) => ({
  status: "alive", tang: 3, progress_s: 25, need_s: 100, ready_for_major: false, born_at: "2026-10-17T00:00:00Z",
  lifespan: { used_years: 118.4, cap_years: 300 }, ...o,
});
const stats = (o = {}) => ({ TuongMao: { level: 0, cap: 20, next_cost: 6 }, CanCot: { level: 0, cap: 20, next_cost: 8 }, ...o });
const state = (l, o = {}) => ({ life: l, pending_intent: null, account: { tm_balance: 0, stats: stats() }, ...o });

describe("shell: thời gian và tiến độ", () => {
  it("seasonOf: 9 tầng chia 4 mùa", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(seasonOf)).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it("lifeDay: ngày đầu là 1, qua 24h là 2, chịu dữ liệu hỏng", () => {
    expect(lifeDay(life(), "2026-10-17T05:00:00Z")).toBe(1);
    expect(lifeDay(life(), "2026-10-18T00:00:00Z")).toBe(2);
    expect(lifeDay(life(), "2026-10-16T00:00:00Z")).toBe(1);       // đồng hồ lệch về trước: không âm
    expect(lifeDay(life({ born_at: "x" }), "2026-10-18T00:00:00Z")).toBeNull();
  });
  it("progressOf chịu need_s = 0 và vượt mức", () => {
    expect(progressOf(life())).toBe(0.25);
    expect(progressOf(life({ need_s: 0 }))).toBe(0);
    expect(progressOf(life({ progress_s: 500 }))).toBe(1);
  });
  it("lifespanLeft không âm", () => {
    expect(lifespanLeft(life())).toBe(182);
    expect(lifespanLeft(life({ lifespan: { used_years: 310, cap_years: 300 } }))).toBe(0);
  });
});

describe("shell: trạng thái và gợi ý", () => {
  it("idleStatus theo trạng thái kiếp", () => {
    expect(idleStatus(life()).text).toContain("nhập định");
    expect(idleStatus(life({ tang: 9 })).text).toContain("tích tụ");
    expect(idleStatus(life({ tang: 9, ready_for_major: true })).tone).toBe("gold");
    expect(idleStatus(life({ status: "cleared" })).text).toContain("hoàn tất");
  });
  it("cheapestUpgrade bỏ stat đã tối đa", () => {
    expect(cheapestUpgrade(stats())).toEqual({ key: "TuongMao", cost: 6 });
    expect(cheapestUpgrade(stats({ TuongMao: { level: 20, cap: 20, next_cost: null } }))).toEqual({ key: "CanCot", cost: 8 });
    expect(cheapestUpgrade({ A: { next_cost: null } })).toBeNull();
    expect(cheapestUpgrade(undefined)).toBeNull();
  });
  it("nextHint: lời xác nhận đang chờ > sẵn sàng đột phá > đủ Thiên Mệnh > không có", () => {
    expect(nextHint(state(life(), { pending_intent: { intent_id: "i" } })).id).toBe("pending");
    expect(nextHint(state(life({ tang: 9, ready_for_major: true }))).id).toBe("ready");
    expect(nextHint(state(life(), { account: { tm_balance: 6, stats: stats() } })).id).toBe("spend-tm");
    expect(nextHint(state(life(), { account: { tm_balance: 5, stats: stats() } }))).toBeNull();
    expect(nextHint(state(null))).toBeNull();
    expect(nextHint(state(life({ status: "cleared" })))).toBeNull();
  });
});
