import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { StaticAuthVerifier } from "../src/auth.js";
import { MemoryGameStateRepository } from "../src/state.js";

const authHeader = { authorization: "Bearer token-u1" };
const makeApp = () => buildApp({
  auth: new StaticAuthVerifier({ "token-u1": { id: "u1", email: "u1@example.test" } }),
  state: new MemoryGameStateRepository(),
});

test("health reports authoritative Node runtime", async () => {
  const app = makeApp();
  try {
    const res = await app.inject({ method: "GET", url: "/api/v2/health" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true, runtime: "node", authoritative: true });
  } finally { await app.close(); }
});

test("authoritative state rejects anonymous access", async () => {
  const app = makeApp();
  try {
    const res = await app.inject({ method: "GET", url: "/api/v2/state" });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error, "unauthorized");
  } finally { await app.close(); }
});

test("character creation is server-owned and persists by revision", async () => {
  const app = makeApp();
  try {
    const injectedRoot = await app.inject({
      method: "POST", url: "/api/v2/characters", headers: authHeader,
      payload: { revision: 0, name: "Test", gender: "Nam", age: 20, race: "Nhân", alloc: {}, root: { els: ["Lôi"] } },
    });
    assert.equal(injectedRoot.statusCode, 400, "client must not choose root");

    const created = await app.inject({
      method: "POST", url: "/api/v2/characters", headers: authHeader,
      payload: { revision: 0, name: "Test", gender: "Nam", age: 20, race: "Nhân", alloc: {} },
    });
    assert.equal(created.statusCode, 201);
    const body = created.json();
    assert.equal(body.revision, 1);
    assert.ok(body.character.root.els.length >= 1 && body.character.root.els.length <= 5);
    for (const value of Object.values(body.derived)) assert.ok(Number.isFinite(value));

    const state = await app.inject({ method: "GET", url: "/api/v2/state", headers: authHeader });
    assert.equal(state.statusCode, 200);
    assert.equal(state.json().revision, 1);
    assert.equal(state.json().state.character.name, "Test");

    const duplicate = await app.inject({
      method: "POST", url: "/api/v2/characters", headers: authHeader,
      payload: { revision: 1, name: "Other", gender: "Nữ", age: 20, race: "Nhân", alloc: {} },
    });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.json().error, "character_exists");
  } finally { await app.close(); }
});

test("travel uses stored realm and optimistic revision, never client realm", async () => {
  const app = makeApp();
  try {
    const created = await app.inject({
      method: "POST", url: "/api/v2/characters", headers: authHeader,
      payload: { revision: 0, name: "Traveler", gender: "Nam", age: 20, race: "Nhân", alloc: {} },
    });
    assert.equal(created.statusCode, 201);

    const locked = await app.inject({
      method: "POST", url: "/api/v2/world/travel", headers: authHeader,
      payload: { revision: 1, world: "ha_gioi", region: "thienmon", site: "thienmon_dai" },
    });
    assert.equal(locked.statusCode, 403);

    const ok = await app.inject({
      method: "POST", url: "/api/v2/world/travel", headers: authHeader,
      payload: { revision: 1, world: "ha_gioi", region: "pham", site: "pham_rung" },
    });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().revision, 2);
    assert.equal(ok.json().character.site, "pham_rung");

    const stale = await app.inject({
      method: "POST", url: "/api/v2/world/travel", headers: authHeader,
      payload: { revision: 1, world: "ha_gioi", region: "pham", site: "pham_mieu" },
    });
    assert.equal(stale.statusCode, 409);
    assert.equal(stale.json().error, "state_conflict");
  } finally { await app.close(); }
});
