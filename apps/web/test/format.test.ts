import { describe, expect, it } from "vitest";
import { causeLabel, clamp01, duration, pct } from "../src/lib/format.ts";

describe("format", () => {
  it("pct dùng dấu phẩy", () => { expect(pct(0.0625, 2)).toBe("6,25%"); expect(pct(0.5, 0)).toBe("50%"); });
  it("clamp01 chịu NaN/∞/âm", () => {
    expect(clamp01(NaN)).toBe(0); expect(clamp01(Infinity)).toBe(0); expect(clamp01(-3)).toBe(0); expect(clamp01(7)).toBe(1); expect(clamp01(0.4)).toBe(0.4);
  });
  it("duration", () => {
    expect(duration(20)).toBe("dưới 1 phút");
    expect(duration(3725)).toBe("1 giờ 2 phút");
    expect(duration(90000)).toBe("1 ngày 1 giờ");
  });
  it("nhãn nguyên nhân", () => { expect(causeLabel("lifespan")).toContain("Tọa hóa"); expect(causeLabel("x")).toBe("x"); });
});
