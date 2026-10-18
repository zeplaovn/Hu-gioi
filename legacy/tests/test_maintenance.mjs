// Bảo trì không tính là thời gian vắng mặt: admin_bridge.maintenanceOverlap + idleTick trừ phần trùng với các đợt bảo trì.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
const base = { console, Math, JSON, Object, Array, Set, Number, String, Map, Date, Error, Promise, parseInt, parseFloat, isFinite, setTimeout, clearTimeout, clearInterval, setInterval: () => 0 };

function bridgeWith(status) {
  const el = () => ({ classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, style: {}, set className(v) {}, set textContent(v) {}, set id(v) {}, addEventListener() {} });
  const ctx = vm.createContext({ ...base, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000000" }, location: { replace() {} },
    fetch: async () => ({ ok: true, text: async () => JSON.stringify(status) }),
    document: { readyState: "complete", body: { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }, getElementById: () => null, createElement: el, addEventListener() {}, visibilityState: "visible" } });
  ctx.window = ctx;
  vm.runInContext('TT = { CLOUD: { url: "https://x.supabase.co", anonKey: "anon_key_for_local_testing_0123456789" } };', ctx);
  vm.runInContext(src("src/services/admin_bridge.js"), ctx);
  return vm.runInContext("TT", ctx);
}

test("maintenanceOverlap: chỉ tính phần trùng, bù lệch giờ máy chủ, đợt đang mở tính đến hiện tại", async () => {
  const now = Date.now(), skew = 5000;                                 // đồng hồ máy chủ nhanh hơn máy này 5 giây
  const TT = bridgeWith({ maintenance: false, server_ms: now + skew, maintenance_windows: [[now + skew - 3600e3, now + skew - 1800e3], [now + skew - 600e3, null]], banner: null });
  await TT.serverBridge.ready;
  const o = (a, b) => Math.round(TT.serverBridge.maintenanceOverlap(a, b) / 1000);
  assert.equal(o(now - 7200e3, now), 1800 + 600, "vắng 2 giờ: trừ cả hai đợt (30 phút + đợt đang mở 10 phút)");
  assert.equal(o(now - 3000e3, now - 2000e3), 1000, "khoảng nằm trọn trong đợt đầu");
  assert.equal(o(now - 2000e3, now - 1000e3), 200, "chỉ phần giao với đợt đầu");
  assert.equal(o(now - 100e3, now), 100, "đang trong đợt đang mở");
  assert.equal(o(now - 1700e3, now - 1000e3), 0, "khoảng nằm giữa hai đợt");
});

test("idleTick: thời gian vắng mặt đã trừ bảo trì; chỉ toàn bảo trì thì không bù gì", () => {
  const now = Date.now(), ctx = vm.createContext({ ...base, addEventListener() {}, document: { hidden: false, addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} } });
  ctx.window = ctx; ctx.h = () => ({});
  for (const f of ["src/game/core/data.js", "src/game/features/idle_data.js", "src/game/core/player.js"]) vm.runInContext(src(f), ctx);
  vm.runInContext("TT.Game = class {}; TT.ui = { btn() { return {}; }, anyModal: () => false };", ctx);
  vm.runInContext(src("src/game/features/idle.js"), ctx);
  const TT = vm.runInContext("TT", ctx), G = TT.Game.prototype;
  const run = (away, windows) => {
    let got = null;
    TT.serverBridge = { maintenanceOverlap: (a, b) => windows.reduce((s, [x, y]) => s + Math.max(0, Math.min(b, y) - Math.max(a, x)), 0) };
    const g = { inGame: true, dead: false, p: { idle: { on: true } }, token: 1, idleLast: now - away * 1000, farmSync() {}, secretCheck() {}, missionCheck() {}, idleCheckFull() {}, refresh() {}, idleRefresh() {}, idleCatchUp(dt) { got = dt; } };
    G.idleTick.call(g, 1);
    return got;
  };
  assert.ok(Math.abs(run(7200, []) - 7200) < 2, "không bảo trì: vắng đủ 2 giờ");
  assert.ok(Math.abs(run(7200, [[now - 5400e3, now - 1800e3]]) - 3600) < 2, "bảo trì 1 giờ nằm trong thời gian vắng: chỉ tính 1 giờ");
  assert.equal(run(1800, [[now - 3600e3, now]]), null, "cả khoảng vắng mặt là bảo trì: không bù thời gian");
});
