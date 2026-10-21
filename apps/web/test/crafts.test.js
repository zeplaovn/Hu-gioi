import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api.js";
import { createCraftsStore, remainingText } from "../src/ui/crafts.js";

const state = (extra = {}) => ({ now: "2026-10-21T00:00:00.000Z", wallet: { ls: 10, tn: 0 }, plots: [], goods: [], ...extra });
describe("nghề phụ (client)", () => {
  it("đếm ngược dễ đọc", () => {
    expect(remainingText(0)).toBe("Đã chín"); expect(remainingText(-5)).toBe("Đã chín");
    expect(remainingText(45_000)).toBe("45 giây"); expect(remainingText(61_000)).toBe("1 phút 01 giây"); expect(remainingText(7_260_000)).toBe("2 giờ 01 phút");
  });
  it("store: lấy giờ máy chủ làm mốc, gửi thao tác và trả trước/sau", async () => {
    const api = { crafts: vi.fn(async () => state()), craftsAction: vi.fn(async () => state({ wallet: { ls: 5, tn: 0 } })) };
    const store = createCraftsStore({ api });
    await store.load();
    expect(Math.abs(store.now() - Date.parse("2026-10-21T00:00:00.000Z"))).toBeLessThan(2000);
    const r = await store.act({ kind: "buy", id: "MAT-003", qty: 1 });
    expect(api.craftsAction).toHaveBeenCalledWith({ kind: "buy", id: "MAT-003", qty: 1 });
    expect(r.before.wallet.ls).toBe(10); expect(r.after.wallet.ls).toBe(5);
  });
  it("store: lỗi máy chủ hiện thành tiếng Việt, state cũ được giữ", async () => {
    const api = { crafts: async () => state(), craftsAction: async () => { throw new ApiError(409, "insufficient_ls"); } };
    const store = createCraftsStore({ api });
    await store.load();
    expect(await store.act({ kind: "fertilize", plot: 0 })).toBeNull();
    expect(store.error).toBe("Không đủ Linh Thạch."); expect(store.state.wallet.ls).toBe(10); expect(store.busy).toBe(false);
  });
});
