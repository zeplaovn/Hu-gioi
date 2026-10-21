import { describe, expect, it } from "vitest";
import { nextWorldName } from "../src/ui/ascend-banner.js";
describe("phi thăng", () => {
  it("giới kế tiếp", () => {
    expect(nextWorldName("Hạ Giới")).toBe("Linh Giới");
    expect(nextWorldName("Linh Giới")).toBe("Tiên Giới");
    expect(nextWorldName("Tiên Giới")).toBe("Đại Đạo");
  });
});
