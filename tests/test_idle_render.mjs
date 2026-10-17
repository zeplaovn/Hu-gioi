// Tính bù offline (quiet) không được vẽ lại linh điền mỗi tháng game: chỉ vẽ một lần ở cuối.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");

function load() {
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String, Map, Date, Error, Promise, parseInt, parseFloat, isFinite,
    setTimeout, clearTimeout, clearInterval, setInterval: () => 0, addEventListener() {}, document: { hidden: false, addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} } });
  ctx.window = ctx; ctx.h = () => ({});
  for (const f of ["src/game/core/data.js", "src/game/features/idle_data.js", "src/game/core/player.js"]) vm.runInContext(src(f), ctx, { filename: f });
  vm.runInContext("TT.ui = { btn() { return {}; }, anyModal: () => false };", ctx);
  for (const f of ["src/game/core/game.js", "src/game/features/idle.js"]) vm.runInContext(src(f), ctx, { filename: f });
  return vm.runInContext("TT", ctx);
}

/** Game giả: dùng các hàm thật (passTime, idleMonth, idleRun, idleCatchUp), thay phần chạm DOM / ngẫu nhiên bằng bộ đếm. */
function fakeGame(TT, over = {}) {
  const calls = { renderFarm: 0, autosave: 0, refresh: 0, report: 0 };
  const p = { months: 0, age: 20, lifespan: 1e9, sect: null, hp: 100, max_hp: () => 100, regen: () => 0, realm_name: () => "Phàm Nhân tầng 1",
    exp: 0, stone: 0, plots: [], idle: { on: true, carry: 0, mt: 0, cd: 3, ts: 0 } };
  const g = Object.assign(Object.create(TT.Game.prototype), {
    p, quiet: false, dead: false, rep: null,
    rollEncounter() {}, log() {}, secretCheck() {}, missionCheck() {}, idleGain: () => 0,
    renderFarm() { calls.renderFarm++; }, autosave() { calls.autosave++; }, refresh() { calls.refresh++; }, showReport() { calls.report++; },
  }, over);
  return { g, p, calls };
}

test("passTime: chơi bình thường vẽ linh điền sau mỗi tháng", () => {
  const TT = load(), { g, p, calls } = fakeGame(TT);
  assert.equal(g.passTime(1), true);
  assert.equal(g.passTime(1), true);
  assert.equal(p.months, 2);
  assert.equal(calls.renderFarm, 2);
});

test("passTime: đang quiet (tính bù offline) thì bỏ qua việc vẽ nhưng vẫn trôi thời gian", () => {
  const TT = load(), { g, p, calls } = fakeGame(TT, { quiet: true });
  for (let i = 0; i < 50; i++) g.passTime(1);
  assert.equal(p.months, 50);
  assert.equal(calls.renderFarm, 0);
});

test("idleCatchUp: vắng mặt lâu (quiet) bù hàng chục tháng nhưng chỉ vẽ linh điền và lưu đúng một lần", () => {
  const TT = load(), { g, p, calls } = fakeGame(TT);
  g.idleCatchUp(1000);                                  // 120s đầu tính đủ + 880s * 50% = 560 nhịp = 56 tháng
  assert.equal(p.months, 56);
  assert.equal(calls.renderFarm, 1, "không vẽ mỗi tháng");
  assert.equal(calls.autosave, 1, "không lưu mỗi tháng khi quiet");
  assert.equal(calls.refresh, 1);
  assert.equal(calls.report, 1, "vắng >= 60s thì hiện báo cáo");
  assert.equal(g.quiet, false, "quiet được trả về false sau khi bù xong");
});

test("idleCatchUp: nhân vật tọa hóa giữa chừng thì không vẽ / lưu thêm", () => {
  const TT = load(), { g, p, calls } = fakeGame(TT);
  p.lifespan = 21;                                     // sống thêm đúng 1 năm = 12 tháng
  g.die = function () { this.dead = true; };
  g.idleCatchUp(1000);
  assert.equal(g.dead, true);
  assert.equal(calls.renderFarm, 0);
  assert.equal(calls.autosave, 0);
});
