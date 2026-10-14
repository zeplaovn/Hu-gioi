// Database-only persistence tests: node --test tests/test_cloud.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createMock } from "./mock_supabase.mjs";

const root = path.resolve(import.meta.dirname, "..");
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const EMAIL = "nguoichoi@example.com", PASS = "matkhau-manh-1";
const deq = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);

function device(mock, port, store = new Map()) {
  const ls = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => store.delete(k),
  };
  const timers = (f, ms) => { const t = setTimeout(f, ms); t.unref?.(); return t; };
  const ctx = vm.createContext({
    localStorage: ls, console, TextEncoder, Date, Math, JSON, Object, Array, Set, Number, String, Map,
    Uint8Array, Uint32Array, DataView, Error, Promise, parseInt, parseFloat, isFinite, fetch,
    setTimeout: timers, clearTimeout, clearInterval,
  });
  ctx.window = ctx;
  ctx.document = { addEventListener() {}, visibilityState: "visible" };
  ctx.h = () => ({});

  for (const f of ["src/game/core/data.js", "src/game/features/idle_data.js", "src/game/core/player.js"]) vm.runInContext(src(f), ctx, { filename: f });
  vm.runInContext("TT.ENC_IDS = []; TT.ui = { toast() {} };", ctx);
  vm.runInContext(src("src/platform/security.js"), ctx, { filename: "src/platform/security.js" });
  vm.runInContext(src("src/platform/runtime_store.js"), ctx, { filename: "src/platform/runtime_store.js" });
  ctx.__cfg = { url: `http://127.0.0.1:${port}`, anonKey: mock.anonKey };
  vm.runInContext("TT.CLOUD = globalThis.__cfg;", ctx);
  vm.runInContext(src("src/services/cloud.js"), ctx, { filename: "src/services/cloud.js" });

  const TT = vm.runInContext("TT", ctx);
  const player = (name = "Thử Nghiệm") => new TT.Player("Nam", 20, "Nhân", Object.fromEntries(TT.STATS.map(s => [s, 1])), { name });
  return {
    TT, store, ctx, cloud: TT.cloud, player,
    saveName: () => { const r = TT.readSave(); return r && r.player ? r.player.name : null; },
  };
}

async function withMock(opts, fn) {
  const mock = createMock(opts), port = await mock.ready;
  try { await fn(mock, port); } finally { await mock.close(); }
}

const assertNoGameplayLocalSave = store => {
  for (const k of ["tu_tien_save_v2", "tu_tien_meta_v1", "tu_tien_sec_v1", "tu_tien_cloud_rev", "tu_tien_cloud_uid", "tu_tien_cloud_dirty"])
    assert.equal(store.has(k), false, `${k} không được tồn tại trong localStorage`);
};

test("đăng ký/đăng nhập vẫn dùng Supabase Auth", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port);
  deq(await a.cloud.signUp(EMAIL, PASS), { signedIn: true });
  assert.equal(a.cloud.user().email, EMAIL);
  assert.ok(a.store.has("tu_tien_cloud_session"), "Auth session được phép lưu local");
  assertNoGameplayLocalSave(a.store);

  const b = device(mock, port);
  await b.cloud.signIn(EMAIL, PASS);
  assert.equal(b.cloud.user().email, EMAIL);
}));

test("save game chỉ tồn tại trong RAM trước khi ghi database", async () => withMock({ minGapMs: 0 }, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS);
  deq(await a.cloud.bootstrap(), { state: "ready" });
  a.TT.writeSave(1, a.player("Đạo Hữu A"));
  assert.equal(a.saveName(), "Đạo Hữu A");
  assert.equal(a.cloud.dirty(), true);
  assertNoGameplayLocalSave(a.store);

  await a.cloud.syncNow();
  assert.equal(a.cloud.dirty(), false);
  assert.equal(mock.state.rows.values().next().value.save.player.name, "Đạo Hữu A");
  assertNoGameplayLocalSave(a.store);
}));

test("mở thiết bị khác luôn lấy dữ liệu từ database", async () => withMock({ minGapMs: 0 }, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Từ Database")); await a.cloud.syncNow();

  const b = device(mock, port); await b.cloud.signIn(EMAIL, PASS);
  deq(await b.cloud.bootstrap(), { state: "ready" });
  assert.equal(b.saveName(), "Từ Database");
  assertNoGameplayLocalSave(b.store);
}));

test("không có mạng thì bootstrap thất bại, không chạy bằng save local", async () => {
  const mock = createMock({}), port = await mock.ready;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Đã Lưu")); await a.cloud.syncNow();
  const sessionStore = new Map(a.store);
  await mock.close();

  const off = device(mock, port, sessionStore);
  await assert.rejects(() => off.cloud.bootstrap(), e => !!e.net);
  assert.equal(off.saveName(), null, "không hydrate từ dữ liệu trình duyệt");
  assertNoGameplayLocalSave(off.store);
});

test("xung đột revision: database thắng và runtime nhận bản máy chủ", async () => withMock({ minGapMs: 0 }, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Bản Gốc")); await a.cloud.syncNow();

  const b = device(mock, port); await b.cloud.signIn(EMAIL, PASS); await b.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Máy A Mới")); await a.cloud.syncNow();
  b.TT.writeSave(1, b.player("Máy B Cũ")); await b.cloud.syncNow();

  assert.equal(mock.state.rows.values().next().value.save.player.name, "Máy A Mới");
  assert.equal(b.saveName(), "Máy A Mới", "runtime B được hydrate lại từ database");
  assert.equal(b.cloud.status().state, "server-newer");
}));

test("đăng xuất cố ghi phần dirty lên database rồi xóa runtime", async () => withMock({ minGapMs: 0 }, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Trước Khi Thoát"));
  await a.cloud.signOut();

  assert.equal(mock.state.rows.values().next().value.save.player.name, "Trước Khi Thoát");
  assert.equal(a.cloud.user(), null);
  assert.equal(a.saveName(), null);
  assert.equal(a.store.has("tu_tien_cloud_session"), false);
  assertNoGameplayLocalSave(a.store);
}));
