// Giãn nhịp đẩy save lên máy chủ: lưu định kỳ (mỗi tháng game ~10s) bị giãn, mọi đường lưu khác giữ nguyên.
// Đồng hồ và hẹn giờ là giả nên test chạy tức thì và xác định; mock Supabase thật (scripts/mock_supabase.mjs) đếm số lần gọi save_game.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createMock } from "./mock_supabase.mjs";

const root = path.resolve(import.meta.dirname, "..");
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = 100000, ROUTINE_GAP = 45000, PUSH_DELAY = 8000, SERVER_FULL_CREDIT_MS = 120000;

function device(mock, port, { skew = { ms: 0 } } = {}) {
  const store = new Map(), clock = { t: T0 }, timers = new Map(), delays = [], pushes = [];
  let nextId = 1;
  const FakeDate = class extends Date { static now() { return Date.now() + skew.ms; } };   // mô phỏng đồng hồ máy chủ bị tạm thay vào Date.now
  const ctx = vm.createContext({
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => store.delete(k) },
    console, TextEncoder, Date: FakeDate, Math, JSON, Object, Array, Set, Number, String, Map, Uint8Array, Uint32Array, DataView, Error, Promise, parseInt, parseFloat, isFinite,
    performance: { now: () => clock.t }, clearInterval,
    fetch: (url, opts) => { if (/rpc\/save_game/.test(String(url))) pushes.push(clock.t); return fetch(url, opts); },
    setTimeout: (fn, ms) => { const id = nextId++; delays.push(ms); timers.set(id, { due: clock.t + ms, fn }); return id; },
    clearTimeout: id => { timers.delete(id); },
  });
  ctx.window = ctx; ctx.document = { addEventListener() {}, visibilityState: "visible" }; ctx.h = () => ({});
  for (const f of ["src/game/core/data.js", "src/game/features/idle_data.js", "src/game/core/player.js"]) vm.runInContext(src(f), ctx, { filename: f });
  vm.runInContext("TT.ENC_IDS = []; TT.ui = { toast() {} };", ctx);
  for (const f of ["src/platform/security.js", "src/platform/runtime_store.js"]) vm.runInContext(src(f), ctx, { filename: f });
  ctx.__cfg = { url: `http://127.0.0.1:${port}`, anonKey: mock.anonKey };
  vm.runInContext("TT.CLOUD = globalThis.__cfg;", ctx);
  vm.runInContext(src("src/services/cloud.js"), ctx, { filename: "src/services/cloud.js" });
  const TT = vm.runInContext("TT", ctx);

  const settle = async () => { for (let i = 0; i < 400 && TT.cloud.status().state === "syncing"; i++) await sleep(2); };
  /** Chạy các hẹn giờ đến hạn trong ms mili-giây giả kế tiếp, chờ mỗi lần đẩy xong. */
  const advance = async ms => {
    const end = clock.t + ms;
    for (;;) {
      const next = [...timers].filter(([, v]) => v.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      timers.delete(next[0]); clock.t = Math.max(clock.t, next[1].due); next[1].fn(); await settle();
    }
    clock.t = end;
  };
  const player = name => new TT.Player("Nam", 20, "Nhân", Object.fromEntries(TT.STATS.map(s => [s, 1])), { name });
  const save = name => TT.writeSave(1, player(name));          // đường lưu thường (hành động của người chơi)
  const routineSave = name => TT.cloud.routine(() => save(name));  // đường lưu định kỳ
  return { TT, cloud: TT.cloud, clock, delays, pushes, advance, settle, save, routineSave, ctx };
}

async function ready(mock, port, opts) {
  mock.state.minGapMs = 0;
  const a = device(mock, port, opts);
  await a.cloud.signUp("nguoichoi@example.com", "matkhau-manh-1");
  await a.cloud.bootstrap();
  return a;
}
async function withMock(fn) { const mock = createMock({ minGapMs: 0 }), port = await mock.ready; try { await fn(mock, port); } finally { await mock.close(); } }
const gaps = xs => xs.slice(1).map((t, i) => t - xs[i]);

test("lưu định kỳ mỗi 10s trong 2 phút chỉ đẩy ~3 lần, cách nhau ít nhất ROUTINE_GAP và dưới mức máy chủ tính đủ thời gian", t => withMock(async (mock, port) => {
  const a = await ready(mock, port);
  for (let i = 0; i < 12; i++) { a.routineSave("Định kỳ " + i); await a.advance(10000); }
  t.diagnostic(`lưu định kỳ: ${a.pushes.length} lần đẩy / 120s, khoảng cách (s): ${gaps(a.pushes).map(g => g / 1000).join(", ")}`);
  assert.ok(a.pushes.length >= 2 && a.pushes.length <= 3, `đẩy ${a.pushes.length} lần`);
  for (const g of gaps(a.pushes)) assert.ok(g >= ROUTINE_GAP && g < SERVER_FULL_CREDIT_MS, `khoảng cách ${g}ms`);
  assert.equal(a.pushes[0] - T0, PUSH_DELAY, "lần đầu vẫn chờ PUSH_DELAY");
  assert.equal(a.cloud.status().state, "synced");
}));

test("đối chứng: lưu thường (không qua routine) vẫn đẩy mỗi lần như cũ", t => withMock(async (mock, port) => {
  const a = await ready(mock, port);
  for (let i = 0; i < 12; i++) { a.save("Thường " + i); await a.advance(10000); }
  t.diagnostic(`lưu thường (hành vi cũ): ${a.pushes.length} lần đẩy / 120s`);
  assert.ok(a.pushes.length >= 10, `đẩy ${a.pushes.length} lần`);
}));

test("hành động quan trọng xen vào lúc đang chờ lưu định kỳ: hẹn lại sớm, chỉ chờ PUSH_DELAY", () => withMock(async (mock, port) => {
  const a = await ready(mock, port);
  a.routineSave("A"); await a.advance(PUSH_DELAY);                 // đẩy lần đầu
  const first = a.pushes.length;
  a.routineSave("B"); await a.advance(1000);                        // hẹn lưu định kỳ xa (~36s)
  assert.ok(Math.max(...a.delays.slice(-1)) > 30000, "lưu định kỳ bị giãn");
  const mark = a.clock.t; a.save("Mua đồ");                         // đường lưu thường: ví dụ sau khi bù offline
  await a.advance(PUSH_DELAY);
  assert.equal(a.pushes.length, first + 1, "đẩy đúng một lần");
  assert.equal(a.pushes.at(-1) - mark, PUSH_DELAY, "không bị kẹt sau hẹn lưu định kỳ");
}));

test("syncNow (syncCritical) bỏ qua giãn nhịp và đẩy ngay", () => withMock(async (mock, port) => {
  const a = await ready(mock, port);
  a.routineSave("A"); await a.advance(PUSH_DELAY);
  a.routineSave("B");
  const before = a.pushes.length;
  await a.cloud.syncNow();
  assert.equal(a.pushes.length, before + 1);
  assert.equal(a.cloud.dirty(), false);
}));

test("thay đổi định kỳ phát sinh trong lúc đang gửi không bị đẩy lại sau 1,5s", () => withMock(async (mock, port) => {
  const a = await ready(mock, port);
  a.routineSave("A");
  const p = a.cloud.syncNow();                                      // đang gửi
  a.routineSave("B");                                               // thay đổi mới trong lúc gửi
  await p; await a.settle();
  assert.equal(a.cloud.dirty(), true, "vẫn còn thay đổi chưa gửi");
  assert.ok(a.delays.at(-1) >= 40000, `hẹn lại sau ${a.delays.at(-1)}ms`);
}));

test("thay đổi quan trọng phát sinh trong lúc đang gửi vẫn được đẩy lại sau 1,5s", () => withMock(async (mock, port) => {
  const a = await ready(mock, port);
  a.save("A");
  const p = a.cloud.syncNow();
  a.save("B");
  await p; await a.settle();
  assert.equal(a.delays.at(-1), 1500);
}));

test("khoảng giãn không phụ thuộc Date.now (đồng hồ máy chủ được tạm thay vào Date.now ở ha_gioi_fix.js)", () => withMock(async (mock, port) => {
  const skew = { ms: 0 }, a = await ready(mock, port, { skew });
  a.routineSave("A"); await a.advance(PUSH_DELAY);
  skew.ms = -3 * 3600 * 1000;                                       // Date.now lệch 3 giờ so với lúc đẩy trước
  a.routineSave("B");
  assert.ok(a.delays.at(-1) >= PUSH_DELAY && a.delays.at(-1) <= ROUTINE_GAP, `hẹn sau ${a.delays.at(-1)}ms`);
}));

test("cloud.routine trả về giá trị của fn và luôn thoát chế độ định kỳ, kể cả khi fn ném lỗi", () => withMock(async (mock, port) => {
  const a = await ready(mock, port);
  assert.equal(a.cloud.routine(() => 42), 42);
  assert.throws(() => a.cloud.routine(() => { throw new Error("x"); }), /x/);
  a.routineSave("A"); await a.advance(PUSH_DELAY);
  a.save("B");                                                      // sau lỗi vẫn là lưu thường
  assert.equal(a.delays.at(-1), PUSH_DELAY);
}));

test("idleMonth: lưu định kỳ đi qua cloud.routine; không có cloud thì vẫn lưu bình thường; quiet thì không lưu", () => {
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String, Map, Date, Error, Promise, parseInt, parseFloat, isFinite,
    setTimeout, clearTimeout, clearInterval, setInterval: () => 0, addEventListener() {}, document: { hidden: false, addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} } });
  ctx.window = ctx; ctx.h = () => ({});
  for (const f of ["src/game/core/data.js", "src/game/features/idle_data.js", "src/game/core/player.js"]) vm.runInContext(src(f), ctx, { filename: f });
  vm.runInContext("TT.ui = { btn() { return {}; }, anyModal: () => false };", ctx);
  for (const f of ["src/game/core/game.js", "src/game/features/idle.js"]) vm.runInContext(src(f), ctx, { filename: f });
  const TT = vm.runInContext("TT", ctx);
  const mk = () => {
    const events = [];
    const g = Object.assign(Object.create(TT.Game.prototype), { quiet: false, dead: false, rollEncounter() {}, log() {}, renderFarm() {}, autosave() { events.push("autosave"); },
      p: { months: 0, age: 20, lifespan: 1e9, sect: null, hp: 100, max_hp: () => 100, regen: () => 0, idle: { cd: 3 } } });
    return { g, events };
  };
  let { g, events } = mk();
  TT.cloud = { routine: fn => { events.push("routine:start"); const r = fn(); events.push("routine:end"); return r; } };
  g.idleMonth();
  assert.deepEqual(events, ["routine:start", "autosave", "routine:end"]);

  ({ g, events } = mk()); TT.cloud = { enabled: false };           // chưa bật cloud: không có routine
  g.idleMonth();
  assert.deepEqual(events, ["autosave"]);

  ({ g, events } = mk()); TT.cloud = { routine: fn => fn() }; g.quiet = true;
  g.idleMonth();
  assert.deepEqual(events, [], "quiet (đang bù offline) không lưu từng tháng");
});
