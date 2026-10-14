// Kiểm thử minigame nghề phụ (src/game/features/minigames.js) bằng DOM giả: điểm của MỌI công đoạn phải được ghi lại,
// kể cả công đoạn kết thúc bằng thao tác chuột / phím (trước đây mất điểm khiến luyện khí / vẽ phù luôn thất bại).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
function load() {
  const noop = () => {}, c2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "measureText" ? () => ({ width: 10 }) : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String, Map, Date, Error, parseInt, parseFloat, isFinite, setTimeout, clearTimeout, setInterval, clearInterval });
  ctx.window = ctx; ctx.addEventListener = noop; ctx.removeEventListener = noop;
  ctx.h = (tag, props, ...kids) => ({ tag, props, kids, textContent: "", className: "", addEventListener: noop, getContext: () => c2d, setPointerCapture: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 560, height: 300 }), append: noop, isConnected: true });
  vm.runInContext(src("src/game/core/data.js"), ctx);
  vm.runInContext("TT.ui = { modal: () => ({ overlay: { isConnected: true }, box: { append() {} }, close() {} }) };", ctx);
  vm.runInContext(src("src/game/features/minigames.js"), ctx);
  return vm.runInContext("TT", ctx);
}
/** Mở cửa sổ, chạy từng công đoạn bằng tay: hàm `play(stage)` mô phỏng người chơi, rồi bơm vòng lặp cho tới khi xong. */
function run(TT, stages, play) {
  let got = "unset"; const win = new TT.CraftWindow({ renderDialog() {} }, "t", stages, sc => { got = sc; return "ok"; });
  clearInterval(win.timer);
  win.advance();
  for (let guard = 0; guard < 5000 && !win.fin; guard++) {
    if (win.cur && !win.cur.done) play(win.cur);
    win.loop();
  }
  return got;
}
const perfect = st => {
  if (st.constructor.name === "TimingStage") { st.m = st.c; st.hit(); }
  else if (st.constructor.name === "PathStage") { st.press(st.g[0][0], st.g[0][1]); for (const [x, y] of st.g) st.move(x, y); st.release(); }
  else if (st.constructor.name === "FireStage") { st.hold = st.temp < 0.55; }
};
test("công đoạn kết thúc bằng sự kiện (bấm nhịp, kéo nét) vẫn được ghi điểm", () => {
  const TT = load();
  const sc = run(TT, [new TT.TimingStage("T", "", 1), new TT.PathStage("P", "", "loi")], perfect);
  assert.equal(sc.length, 2);
  assert.ok(sc[0] > 0.9 && sc[1] > 0.9, JSON.stringify(sc));
});
test("luyện khí đủ ba công đoạn: điểm đủ ba phần, không có NaN", () => {
  const TT = load();
  const sc = run(TT, [new TT.FireStage("N", "", 1, 0.24), new TT.TimingStage("T", "", 2), new TT.PathStage("P", "", "tran")], perfect);
  assert.equal(sc.length, 3); assert.ok(sc.every(Number.isFinite));
  assert.ok(sc[2] > 0.9);
  const s = 0.3 * sc[0] + 0.3 * sc[1] + 0.4 * sc[2];
  assert.ok(Number.isFinite(s));
});
test("vẽ phù: nét vẽ chuẩn cho điểm cao, vẽ lệch khỏi đường thì điểm thấp", () => {
  const TT = load();
  const good = run(TT, [new TT.PathStage("P", "", "khien")], perfect)[0];
  const bad = run(TT, [new TT.PathStage("P", "", "khien")], st => {
    if (!st.started) st.press(st.g[0][0], st.g[0][1]);
    st.move(st.last[0] + 15, st.last[1] + 15);                           // đi chéo ra xa phù văn cho tới khi hết mực
  })[0];
  assert.ok(good > 0.9 && bad < 0.4, `${good} ${bad}`);
});
test("hủy giữa chừng gọi onDone(null)", () => {
  const TT = load(); let got = "unset";
  const win = new TT.CraftWindow({ renderDialog() {} }, "t", [new TT.TimingStage("T", "", 1)], sc => { got = sc; return ""; });
  win.advance(); win.close();
  assert.equal(got, null);
});
