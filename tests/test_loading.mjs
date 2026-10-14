// Thanh tiến độ nạp tài nguyên: TT.A.preload báo tiến độ đủ từ 0 đến tổng, lỗi ảnh vẫn tính là xong, ảnh đã cache báo ngay.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";

function load({ cached = false, failEvery = 0 } = {}) {
  let n = 0;
  class Image { constructor() { this.complete = cached; this.id = n++; } set src(v) { if (cached) return; setTimeout(() => { if (failEvery && this.id % failEvery === 0) this.onerror?.(); else { this.complete = true; this.onload?.(); } }, 1); } }
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, Promise, Number, String, setTimeout, Image });
  ctx.window = ctx; vm.runInContext("TT = {};", ctx);
  vm.runInContext(fs.readFileSync(new URL("../src/platform/assets.js", import.meta.url), "utf8"), ctx);
  return vm.runInContext("TT", ctx);
}

test("preload báo tiến độ từ 0 đến tổng, tăng dần từng ảnh", async () => {
  const TT = load(), seen = [];
  await TT.A.preload((d, t) => seen.push([d, t]));
  const total = seen[0][1];
  assert.ok(total > 100, "có hàng trăm ảnh cần nạp");
  assert.deepEqual(seen[0], [0, total]);
  assert.deepEqual(seen[seen.length - 1], [total, total]);
  assert.equal(seen.length, total + 1);
  assert.ok(seen.every((x, i) => i === 0 || x[0] === seen[i - 1][0] + 1), "mỗi ảnh xong tăng đúng 1");
});

test("ảnh lỗi vẫn tính là xong (không kẹt thanh tiến độ); ảnh đã có trong cache báo ngay", async () => {
  const bad = load({ failEvery: 7 }), a = [];
  await bad.A.preload((d, t) => a.push(d === t));
  assert.ok(a[a.length - 1], "kết thúc ở 100% dù có ảnh lỗi");
  const hit = load({ cached: true }), b = [];
  await hit.A.preload((d, t) => b.push(d));
  assert.equal(b[b.length - 1], b.length - 1, "đủ số lần báo, không bỏ sót");
});

test("preload không cần callback và lỗi trong callback không làm hỏng việc nạp", async () => {
  const TT = load();
  await TT.A.preload();
  await TT.A.preload(() => { throw new Error("UI lỗi"); });
});
