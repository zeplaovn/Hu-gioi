import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const ctx = vm.createContext({ console, Set });
ctx.window = ctx;
ctx.TT = { REALMS: ["Phàm Nhân","Luyện Khí","Trúc Cơ","Kim Đan","Nguyên Anh","Hóa Thần","Luyện Hư","Đại Thừa","Độ Kiếp"] };
for (const file of ["registry.js","ha_gioi.js","tien_gioi.js","than_gioi.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "src/game/maps", file), "utf8"), ctx, { filename: file });
}

test("world maps are separated and registered in order", () => {
  assert.deepEqual(Array.from(ctx.TT.maps.order), ["ha_gioi","tien_gioi","than_gioi"]);
  assert.equal(ctx.TT.maps.get("ha_gioi").regions.length, 9);
  assert.equal(ctx.TT.maps.get("tien_gioi").regions.length, 4);
  assert.equal(ctx.TT.maps.get("than_gioi").regions.length, 4);
  assert.equal(ctx.TT.HA_GIOI_REGIONS, ctx.TT.maps.get("ha_gioi").regions);
});

test("Ha Gioi keeps progression reward and danger monotonic", () => {
  const rs = ctx.TT.maps.get("ha_gioi").regions;
  for (let i = 1; i < rs.length; i++) {
    assert.ok(rs[i].realm >= rs[i - 1].realm);
    assert.ok(rs[i].reward >= rs[i - 1].reward);
    assert.ok(rs[i].danger >= rs[i - 1].danger);
  }
  const p = { realm: 3, region: "hacphong" };
  assert.equal(ctx.TT.maps.currentRegion(p).id, "hacphong");
  assert.equal(ctx.TT.maps.canTravel(p, rs[4]), false);
  assert.equal(ctx.TT.maps.canTravel(p, rs[3]), true);
});

test("future worlds stay preview-only and all preview assets exist", () => {
  for (const id of ["tien_gioi", "than_gioi"]) {
    const w = ctx.TT.maps.get(id);
    assert.equal(w.playable, false);
    assert.equal(ctx.TT.maps.canEnterWorld({ realm: 99 }, w), false);
    for (const r of w.regions) assert.ok(fs.existsSync(path.join(root, r.preview)), r.preview);
  }
});
