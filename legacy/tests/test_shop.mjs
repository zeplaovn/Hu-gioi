// Kiểm thử dữ liệu cửa hàng theo cảnh giới (src/game/core/data.js): mọi cảnh giới đều mở thêm hàng, vật phẩm hợp lệ, đã giảm chỉ số.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Number, String, Map, Date, Error, parseInt, parseFloat, isFinite });
ctx.window = ctx;
for (const f of ["src/game/core/data.js"]) vm.runInContext(fs.readFileSync(new URL("../" + f, import.meta.url), "utf8"), ctx);
const TT = vm.runInContext("TT", ctx), items = Object.entries(TT.ITEMS);
test("mỗi cảnh giới từ Phàm Nhân đến Độ Kiếp đều mở thêm ít nhất một vật phẩm", () => {
  for (let r = 0; r < TT.REALMS.length; r++) assert.ok(items.some(([, it]) => it.realm === r), "cảnh giới " + r);
});
test("vật phẩm hợp lệ: loại đã biết, giá dương, hàng mạnh có giới hạn mua", () => {
  for (const [n, it] of items) {
    assert.ok(["exp", "heal", "pill", "life", "stat"].includes(it.kind), n);
    assert.ok(it.cost > 0 && it.v > 0 && it.desc, n);
    if (["exp", "pill", "life", "stat"].includes(it.kind)) assert.ok(it.lim >= 1, n + " cần giới hạn mua");
  }
});
test("giá cùng loại tăng theo cảnh giới và tu vi mỗi viên không vượt 6%", () => {
  for (const kind of ["exp", "pill", "life"]) {
    const l = items.filter(([, it]) => it.kind === kind).sort((a, b) => a[1].realm - b[1].realm);
    for (let i = 1; i < l.length; i++) assert.ok(l[i][1].cost > l[i - 1][1].cost, kind);
  }
  for (const [, it] of items) if (it.kind === "exp") assert.ok(it.v <= 0.06);
});
test("đã giảm chỉ số: phẩm chất, đan, phù và pháp khí", () => {
  assert.equal(TT.QMUL[4], 1.9); assert.equal(TT.PROG.PILL, 0.06);
  assert.equal(TT.GEAR["Phi Kiếm"].power, 6); assert.equal(TT.GEAR["Pháp Bào"].hp, 24); assert.equal(TT.GEAR["Linh Giới"].exp, 0.04);
  assert.match(TT.itemDesc("Phá Cảnh Đan", 4), /\+19%/);
});
