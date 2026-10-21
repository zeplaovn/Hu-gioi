import { beforeEach, describe, expect, it } from "vitest";
import { FEATURES, WORLDS, availableIn, effectiveWorld, featuresOf, setPreview, stagesOfWorld, worldByServerName } from "../src/world.js";

beforeEach(() => setPreview(null));
describe("khung ba giới", () => {
  it("lập tông môn, đấu giá, PvP chỉ có ở Linh Giới và Tiên Giới", () => {
    for (const f of ["sectCreate", "auction", "pvp"]) {
      expect(availableIn(f, "ha_gioi")).toBe(false);
      expect(availableIn(f, "linh_gioi")).toBe(true);
      expect(availableIn(f, "tien_gioi")).toBe(true);
    }
  });
  it("gia nhập tông môn Hạ Giới chỉ ở Hạ Giới", () => {
    expect(availableIn("sect", "ha_gioi")).toBe(true);
    expect(availableIn("sect", "linh_gioi")).toBe(false);
  });
  it("mỗi giới có cảnh giới và tính năng; id không trùng", () => {
    expect(new Set(FEATURES.map((f) => f.id)).size).toBe(FEATURES.length);
    for (const w of WORLDS) { expect(stagesOfWorld(w.id).length).toBeGreaterThan(0); expect(featuresOf(w.id).length).toBeGreaterThan(5); }
    expect(worldByServerName("Tiên Giới").id).toBe("tien_gioi");
  });
  it("xem trước ghi đè giới thật và xóa được", () => {
    expect(effectiveWorld("Hạ Giới")).toBe("ha_gioi");
    setPreview("tien_gioi"); expect(effectiveWorld("Hạ Giới")).toBe("tien_gioi");
    setPreview(null); expect(effectiveWorld("Hạ Giới")).toBe("ha_gioi");
  });
});
