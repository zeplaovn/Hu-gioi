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

test("trang bảo trì và cổng quản trị là trang độc lập, game không còn lớp phủ bảo trì", async () => {
  const fs = await import("node:fs"), root = new URL("../", import.meta.url);
  for (const page of ["maintenance.html", "staff.html"]) {
    const html = fs.readFileSync(new URL(page, root), "utf8");
    const scripts = [...html.matchAll(/<script src="(src\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(scripts.length >= 3 && scripts.every(f => fs.existsSync(new URL(f, root))), page + " tham chiếu file script có thật");
    assert.ok(scripts.indexOf("src/services/config.js") < scripts.indexOf("src/standalone/boot.js"), "config.js phải nạp trước boot.js");
    assert.ok(!scripts.some(f => /game|ui\//.test(f)), page + " không nạp mã game");
  }
  const bridge = fs.readFileSync(new URL("src/services/admin_bridge.js", root), "utf8");
  assert.match(bridge, /location\.replace\("maintenance\.html"\)/);
  assert.doesNotMatch(bridge, /serverMaintenanceGate|Quản trị viên đăng nhập/);
});

test("errorText giải thích các mã save_game bị máy chủ từ chối vì tiến độ", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port);
  for (const code of ["time_jump", "level_reverse", "bad_life_sequence"])
    assert.match(a.cloud.errorText({ message: code }), /tải lại trang/, code);
  assert.equal(a.cloud.errorText({ message: "mã_lạ" }), "Có lỗi xảy ra, vui lòng thử lại.");
}));

test("lỗi tạm thời (5xx/429) khi làm mới token không xóa phiên đăng nhập; refresh token bị từ chối thì xóa", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port);
  await a.cloud.signUp(EMAIL, PASS);
  const stored = JSON.parse(a.store.get("tu_tien_cloud_session"));
  stored.expires_at = Math.floor(Date.now() / 1000) - 10;                    // token đã hết hạn -> bắt buộc làm mới
  const expired = new Map([["tu_tien_cloud_session", JSON.stringify(stored)]]);

  for (const status of [503, 429]) {
    const b = device(mock, port, new Map(expired));
    b.ctx.fetch = async () => new Response(JSON.stringify({ msg: "tam thoi" }), { status });
    await assert.rejects(b.cloud.pull(), e => e.status === status && !e.auth);
    assert.ok(b.store.has("tu_tien_cloud_session"), `HTTP ${status} không được đăng xuất người chơi`);
    assert.ok(b.cloud.user(), `HTTP ${status}: phiên vẫn còn trong bộ nhớ`);
  }

  const bad = JSON.parse(JSON.stringify(stored)); bad.refresh_token = "khong-ton-tai";
  const c = device(mock, port, new Map([["tu_tien_cloud_session", JSON.stringify(bad)]]));
  await assert.rejects(c.cloud.pull(), e => e.auth === true);
  assert.equal(c.store.has("tu_tien_cloud_session"), false, "refresh token bị từ chối -> xóa phiên");
}));
