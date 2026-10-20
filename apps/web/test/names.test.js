import { describe, expect, it } from "vitest";
import { NAME_MAX, cleanName, randomName } from "../src/names.js";

describe("đạo hiệu", () => {
  it("gợi ý ngẫu nhiên luôn hợp lệ cho cả hai giới", () => {
    for (let i = 0; i < 300; i++) for (const g of ["Nam", "Nữ"]) { const n = randomName(g); expect(cleanName(n)).toBe(n); expect(n.length).toBeLessThanOrEqual(NAME_MAX); }
  });
  it("random dùng nguồn được tiêm vào", () => { expect(randomName("Nam", () => 0)).toBe("Hàn Thiên Sơn"); expect(randomName("Nữ", () => 0)).toBe("Hàn Nhược Vân"); });
  it("chuẩn hoá và từ chối giá trị sai (khớp luật server)", () => {
    expect(cleanName("  Hàn   Thiên  Sơn ")).toBe("Hàn Thiên Sơn");
    for (const bad of ["", " A ", "a".repeat(21), "<b>xx</b>", "a&b", 'a"b', "a`b", "a[b]", "tab\u0007x", null]) expect(cleanName(bad)).toBeNull();
    expect(cleanName("a".repeat(20))).toHaveLength(20);
  });
});
