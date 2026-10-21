import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VFX, frameAt, frameUrls, vfxFor } from "../src/ui/vfx.js";

const all = [VFX.linhKhi, VFX.dotPha, ...Object.values(VFX.phiThang), ...Object.values(VFX.loiKiep)];
describe("VFX", () => {
  it("mọi khung hình khai báo đều có tệp trong public/assets", () => {
    for (const v of all) for (const u of frameUrls(v, "/assets")) expect(existsSync(new URL("../public" + u, import.meta.url)), u).toBe(true);
  });
  it("chọn theo đại giới; Hạ Giới không có Phi Thăng riêng", () => {
    expect(vfxFor("loiKiep", "ha_gioi").stem).toContain("tia_set");
    expect(vfxFor("phiThang", "ha_gioi")).toBeNull();
    expect(vfxFor("khongCo", "ha_gioi")).toBeNull();
  });
  it("trình phát: chạy hết thì trả null, lặp thì quay vòng", () => {
    const v = VFX.dotPha;
    expect(frameAt(v, 0)).toBe(0);
    expect(frameAt(v, 30)).toBeNull();
    expect(frameAt(v, 30, { loop: true })).toBeLessThan(v.frames.length);
  });
});
