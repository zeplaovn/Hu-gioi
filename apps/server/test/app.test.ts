import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";

const app = buildApp();

test.after(async () => app.close());

test("health reports authoritative Node runtime", async () => {
  const res = await app.inject({ method: "GET", url: "/api/v2/health" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true, runtime: "node", authoritative: true });
});

test("character creation returns finite derived stats for 1..5 roots", async () => {
  const five = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
  for (let n = 1; n <= 5; n++) {
    const res = await app.inject({ method: "POST", url: "/api/v2/characters", payload: { name: "Test", gender: "Nam", age: 20, race: "Nhân", alloc: {}, root: { els: five.slice(0, n) } } });
    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.character.root.els.length, n);
    for (const value of Object.values(body.derived)) assert.ok(Number.isFinite(value));
  }
});

test("server rejects locked map travel", async () => {
  const locked = await app.inject({ method: "POST", url: "/api/v2/world/travel/validate", payload: { realm: 0, world: "ha_gioi", region: "thienmon" } });
  assert.equal(locked.statusCode, 403);
  const ok = await app.inject({ method: "POST", url: "/api/v2/world/travel/validate", payload: { realm: 8, world: "ha_gioi", region: "thienmon", site: "thienmon_dai" } });
  assert.equal(ok.statusCode, 200);
});
