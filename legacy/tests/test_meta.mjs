// Kiểm thử Thiên Mệnh / Mảnh Phi Thăng (src/game/features/meta.js): giá tăng dần, trừ đúng điểm, dữ liệu nhập bị sửa thì bị từ chối.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
function load() {
  const store = new Map(), ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String, Map, Date, Error, Promise, parseInt, parseFloat, isFinite, setTimeout, clearTimeout,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) } });
  ctx.window = ctx; ctx.h = () => ({}); ctx.document = { addEventListener() {}, body: { append() {} }, getElementById: () => null };
  for (const f of ["src/game/core/data.js", "src/game/features/idle_data.js", "src/game/core/player.js"]) vm.runInContext(src(f), ctx);
  vm.runInContext("TT.Game = class {}; TT.sec = { read: () => null, write() {}, sign: () => 's', verify: () => true, cleanPlayer: () => null, error: '' }; TT.A = { icon: () => '' }; TT.ui = {};", ctx);
  vm.runInContext(src("src/game/features/meta.js"), ctx);
  return vm.runInContext("TT", ctx);
}
test("Mảnh Phi Thăng: giá tăng dần, mua trừ đúng điểm, dừng ở 12 mảnh", () => {
  const M = load().meta, cost = [...M.FRAG.cost];
  assert.equal(cost.length, 12);
  for (let i = 1; i < 12; i++) assert.ok(cost[i] > cost[i - 1]);
  M.legacy = M.earned = 5; assert.equal(M.buyFrag(), false);           // thiếu điểm
  M.legacy = M.earned = 1000;
  for (let i = 0; i < 12; i++) assert.equal(M.buyFrag(), true);
  assert.equal(M.frag, 12); assert.equal(M.buyFrag(), false);
  assert.equal(M.legacy, 1000 - cost.reduce((a, b) => a + b, 0));
  assert.equal(M.fragTitle(), "Thiên Đạo Chi Chủ");
});
test("danh hiệu theo mốc 3 / 6 / 9 mảnh", () => {
  const M = load().meta; M.legacy = M.earned = 500;
  assert.equal(M.fragTitle(), "");
  for (let i = 0; i < 3; i++) M.buyFrag(); assert.equal(M.fragTitle(), "Hành giả cầu phi");
  for (let i = 0; i < 3; i++) M.buyFrag(); assert.equal(M.fragTitle(), "Lữ khách thiên môn");
});
test("dữ liệu nhập: tự thêm mảnh mà không trừ điểm thì bị từ chối", () => {
  const M = load().meta; M.legacy = M.earned = 100; M.buyFrag();
  const ok = JSON.parse(JSON.stringify({ meta: { v: 1, legacy: M.legacy, earned: M.earned, up: M.up, frag: M.frag, ach: {}, totals: M.totals, history: [], best: 0 } }));
  const pack = d => JSON.stringify({ game: "thien-van-dai-luc", v: 2, data: JSON.stringify(d), sig: "s" });
  assert.equal(M.importText(pack(ok), true), "");
  ok.meta.frag = 12;                                                    // gian lận: 12 mảnh nhưng điểm không đổi
  assert.match(M.importText(pack(ok), true), /không hợp lệ/);
});
