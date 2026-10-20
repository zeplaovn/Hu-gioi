import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api.js";
import { createGame } from "../src/game.js";

const stage = (idx, name, world = "Hạ Giới") => ({ idx, stage_id: "S" + idx, name, world });
const life = (o = {}) => ({
  life_id: "L1", life_no: 1, status: "alive", stage: stage(0, "Phàm Nhân"), tang: 1, progress_s: 0, need_s: 100, ready_for_major: false,
  lifespan: { used_years: 0, cap_years: 100 }, wallet: { ls: 0, lt: 0, tn: 0 }, tm_earned_life: 0, born_at: "x", speed_mult: 1, risk_mult: 1, items: [], ...o,
});
const st = (l, extra = {}) => ({ now: "x", account: { tm_balance: 0, tm_earned: 0, tm_spent: 0, life_count: 1, stats: {} }, life: l, pending_intent: null, history: [], ...extra });

function mk(states = []) {
  const queue = [...states];
  const api = {
    state: vi.fn(async () => queue.length > 1 ? queue.shift() : queue[0]),
    startLife: vi.fn(), prepareBreakthrough: vi.fn(), confirmBreakthrough: vi.fn(), upgradeStat: vi.fn(), buyItem: vi.fn(),
    prepareLifespan: vi.fn(), confirmLifespan: vi.fn(),
  };
  return { game: createGame({ api }), api };
}

describe("game store", () => {
  it("lần tải đầu: ghi 'trở lại thế gian', không phát hiệu ứng", async () => {
    const { game } = mk([st(life({ tang: 4, stage: stage(3, "Kim Đan") }))]);
    await game.refresh();
    expect(game.log).toHaveLength(1);
    expect(game.log[0].text).toContain("trở lại thế gian");
    expect(game.pulse).toBe(0);
  });

  it("lên tầng: pulse tăng, nhật ký ghi Thiên Mệnh +n", async () => {
    const { game } = mk([st(life({ tang: 2 })), st(life({ tang: 4 }))]);
    await game.refresh(); await game.refresh();
    expect(game.pulse).toBe(1);
    expect(game.log.at(-1)).toMatchObject({ tag: "green" });
    expect(game.log.at(-1).text).toContain("(+2 tầng)");
    expect(game.log.at(-1).text).toContain("Thiên Mệnh +2");
  });

  it("đột phá sang giới khác: ghi Phi Thăng, vẫn cùng kiếp", async () => {
    const a = life({ stage: stage(5, "Hóa Thần"), tang: 9 });
    const b = life({ stage: stage(6, "Luyện Hư", "Linh Giới"), tang: 1 });
    const { game } = mk([st(a), st(b)]);
    await game.refresh(); await game.refresh();
    expect(game.log.some((l) => l.text.includes("Phi Thăng"))).toBe(true);
  });

  it("trở lại khi thọ nguyên cạn: server giữ nguyên kiếp, chưa hiện kết quả tử vong", async () => {
    const capped = life({ lifespan: { used_years: 100, cap_years: 100, exhausted: true } });
    const { game } = mk([st(life()), st(capped)]);
    await game.refresh(); await game.refresh();
    expect(game.result).toBeNull();
    expect(game.state.life.life_id).toBe("L1");
  });

  it("chặn bấm đôi: thao tác thứ hai khi đang bận không gọi API", async () => {
    const { game, api } = mk([st(life())]);
    let release;
    api.upgradeStat.mockImplementation(() => new Promise((r) => { release = () => r({}); }));
    const p1 = game.upgradeStat("CanCot");
    const p2 = game.upgradeStat("CanCot");
    expect(game.busy).toBe(true);
    release(); await p1; await p2;
    expect(api.upgradeStat).toHaveBeenCalledTimes(1);
    expect(game.busy).toBe(false);
  });

  it("lỗi server hiện thành thông báo tiếng Việt", async () => {
    const { game, api } = mk([st(life())]);
    api.buyItem.mockRejectedValue(new ApiError(409, "insufficient_tm"));
    expect(await game.buyItem("TMITEM-004")).toBe(false);
    expect(game.error).toBe("Không đủ Thiên Mệnh.");
    expect(game.busy).toBe(false);
  });

  it("prepare → confirm dùng đúng intent_id, chết thì ghi nhật ký đỏ và tải lại", async () => {
    const { game, api } = mk([st(life({ tang: 9, ready_for_major: true })), st(life({ life_id: "L2", life_no: 2 }))]);
    await game.refresh();
    api.prepareBreakthrough.mockResolvedValue({ intent_id: "I1", stage_idx: 0, death_prob: 0.05, success_prob: 0.95, lethal: true, expires_at: "x", warning: "w" });
    api.confirmBreakthrough.mockResolvedValue({ outcome: "death", cause: "breakthrough", new_life_id: "L2" });
    await game.prepare();
    expect(game.prepared.intent_id).toBe("I1");
    await game.confirm();
    expect(api.confirmBreakthrough).toHaveBeenCalledWith("I1");
    expect(game.prepared).toBeNull();
    expect(game.result).toMatchObject({ outcome: "death" });
    expect(game.log.some((l) => l.tag === "red")).toBe(true);
    expect(game.state.life.life_no).toBe(2);
  });

  it("chuẩn bị, xác nhận và resume tọa hóa qua API", async () => {
    const capped = life({ lifespan: { used_years: 100, cap_years: 100, exhausted: true } });
    const next = life({ life_id: "L2", life_no: 2 });
    const { game, api } = mk([st(capped), st(next)]);
    await game.refresh();
    api.prepareLifespan.mockResolvedValue({ intent_id: "LIFE-1", expires_at: "t", warning: "Mất tài sản kiếp" });
    api.confirmLifespan.mockResolvedValue({ outcome: "death", cause: "lifespan", new_life_id: "L2" });
    await game.prepareLifespan();
    expect(game.lifespanPrepared.intent_id).toBe("LIFE-1");
    await game.confirmLifespan();
    expect(api.confirmLifespan).toHaveBeenCalledWith("LIFE-1");
    expect(game.result).toMatchObject({ outcome: "death", cause: "lifespan" });
    expect(game.state.life.life_id).toBe("L2");
    game.state.pending_lifespan_intent = { intent_id: "PENDING", expires_at: "t" };
    game.resumeLifespan();
    expect(game.lifespanPrepared.intent_id).toBe("PENDING");
    game.cancelLifespan();
    expect(game.lifespanPrepared).toBeNull();
  });

  it("resumePending dựng lại hộp thoại từ dữ liệu server", async () => {
    const pending = { intent_id: "I9", death_prob: 0.03, expires_at: "t" };
    const { game } = mk([st(life({ tang: 9, ready_for_major: true }), { pending_intent: pending })]);
    await game.refresh();
    game.resumePending();
    expect(game.prepared).toMatchObject({ intent_id: "I9", lethal: true, death_prob: 0.03 });
    expect(game.prepared.success_prob).toBeCloseTo(0.97);
  });

  it("subscribe nhận thông báo và hủy đăng ký được", async () => {
    const { game } = mk([st(life())]);
    const fn = vi.fn();
    const off = game.subscribe(fn);
    await game.refresh();
    const n = fn.mock.calls.length;
    expect(n).toBeGreaterThan(0);
    off();
    await game.refresh();
    expect(fn.mock.calls.length).toBe(n);
  });

  it("reset xóa sạch trạng thái", async () => {
    const { game } = mk([st(life())]);
    await game.refresh();
    game.reset();
    expect(game.state).toBeNull();
    expect(game.log).toEqual([]);
    expect(game.pulse).toBe(0);
  });
});
