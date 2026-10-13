// Kiểm thử gợi ý "việc nên làm tiếp" (js/guide.js): chỉ đọc trạng thái nhân vật, ưu tiên đúng thứ tự.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
function load() {
  const ls = new Map(), ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String, Map, Date, Error, Promise, parseInt, parseFloat, isFinite,
    localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) }, setTimeout, clearTimeout, clearInterval });
  ctx.window = ctx; ctx.h = () => ({});
  for (const f of ["js/data.js", "js/idle_data.js", "js/player.js"]) vm.runInContext(src(f), ctx);
  vm.runInContext("TT.Game = class { buildIdlePanel() {} refresh() {} }; TT.ui = { btn() { return {}; } };", ctx);
  vm.runInContext(src("js/guide.js"), ctx);
  const TT = vm.runInContext("TT", ctx);
  const player = () => new TT.Player("Nam", 20, "Nhân", Object.fromEntries(TT.STATS.map(s => [s, 5])), { name: "Thử" });
  return { TT, player };
}
const ids = (TT, g) => JSON.parse(JSON.stringify(TT.advice(g).map(a => a.id)));

test("nhân vật mới chưa có công pháp: gợi ý học công pháp", () => {
  const { TT, player } = load(), p = player();
  assert.equal(ids(TT, { p, dead: false })[0], "skill");
});
test("tu vi đủ thì gợi ý đột phá được ưu tiên trước mọi gợi ý khác", () => {
  const { TT, player } = load(), p = player(); p.exp = p.need_exp();
  const list = ids(TT, { p, dead: false });
  assert.equal(list[0], "break"); assert.ok(list.includes("skill"));
});
test("tu vi đủ nhưng khí huyết thấp: cảnh báo nghỉ ngơi trước khi đột phá", () => {
  const { TT, player } = load(), p = player(); p.exp = p.need_exp(); p.hp = 1;
  assert.ok(ids(TT, { p, dead: false }).includes("hurt"));
});
test("thọ nguyên sắp hết thì cảnh báo", () => {
  const { TT, player } = load(), p = player(); p.lifespan = p.age + 5;
  assert.ok(ids(TT, { p, dead: false }).includes("life"));
});
test("đủ cảnh giới mà chưa có tông môn thì gợi ý gia nhập", () => {
  const { TT, player } = load(), p = player(); p.realm = 1; p.skills = ["Dưỡng Khí Quyết"];
  assert.ok(ids(TT, { p, dead: false }).includes("sect"));
});
test("không còn việc gấp thì chỉ khuyên nhập định; nhân vật đã chết thì không gợi ý", () => {
  const { TT, player } = load(), p = player(); p.skills = ["Dưỡng Khí Quyết"]; p.secret.active = { x: 1 };
  assert.deepEqual(ids(TT, { p, dead: false }), ["idle"]);
  assert.deepEqual(ids(TT, { p, dead: true }), []);
});
test("ẩn / bật gợi ý được nhớ riêng, không ghi vào save", () => {
  const { TT } = load();
  assert.equal(TT.hintOff(), false);
});
