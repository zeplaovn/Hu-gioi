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

test("Ha Gioi has three distinct gameplay sites per region", () => {
  const rs = ctx.TT.maps.get("ha_gioi").regions;
  const ids = [];
  for (const r of rs) {
    assert.equal(r.sites.length, 3, r.id);
    for (const s of r.sites) {
      ids.push(s.id);
      assert.equal(s.region, r.id);
      assert.equal(s.world, "ha_gioi");
      assert.ok(s.monsters.length >= 2, s.id);
      assert.ok(s.resources.length >= 2, s.id);
      assert.ok(s.npcs.length >= 1, s.id);
    }
  }
  assert.equal(ids.length, 27);
  assert.equal(new Set(ids).size, 27);
});

test("region travel selects the default site and site travel stays inside region", () => {
  const p = { realm: 4 };
  const region = ctx.TT.maps.travel(p, "ha_gioi", "thienha");
  assert.equal(region.id, "thienha");
  assert.equal(p.world, "ha_gioi");
  assert.equal(p.region, "thienha");
  assert.equal(p.site, "thienha_cang");
  assert.equal(ctx.TT.maps.currentSite(p).id, "thienha_cang");
  const site = ctx.TT.maps.travelSite(p, "thienha_vuc");
  assert.equal(site.id, "thienha_vuc");
  assert.equal(p.region, "thienha");
  assert.equal(p.site, "thienha_vuc");
});

test("old saves without world/site still receive safe map fallbacks", () => {
  const p = { realm: 2, region: "vanyeu" };
  assert.equal(ctx.TT.maps.currentWorld(p).id, "ha_gioi");
  assert.equal(ctx.TT.maps.currentRegion(p).id, "vanyeu");
  assert.equal(ctx.TT.maps.currentSite(p).id, "vanyeu_ngoai");
});

test("future worlds stay preview-only and all preview assets exist", () => {
  for (const id of ["tien_gioi", "than_gioi"]) {
    const w = ctx.TT.maps.get(id);
    assert.equal(w.playable, false);
    assert.equal(ctx.TT.maps.canEnterWorld({ realm: 99 }, w), false);
    assert.ok(fs.existsSync(path.join(root, w.preview)), w.preview);
  }
});
