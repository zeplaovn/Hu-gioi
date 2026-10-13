// Kiểm thử lớp bảo mật (js/security.js) bằng Node, không cần trình duyệt:  node tools/test_security.mjs
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm"; import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");

/** Dựng môi trường giả lập tối thiểu (localStorage + window) rồi nạp đúng các file js thật theo thứ tự trong index.html. */
function boot(store = new Map(), { quota = Infinity } = {}) {
  const ls = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { if ([...store.values()].reduce((n, x) => n + x.length, 0) + v.length > quota) throw new Error("QuotaExceededError"); store.set(k, String(v)); },
    removeItem: k => store.delete(k),
  };
  const toasts = [];
  const ctx = vm.createContext({ localStorage: ls, console, TextEncoder, Date, Math, JSON, Object, Array, Set, Number, String, Map, Uint8Array, Uint32Array, DataView, Error, parseInt, parseFloat, isFinite, setTimeout, clearInterval });
  ctx.window = ctx;
  ctx.h = () => ({});                                        // ui.js không được nạp trong test
  for (const f of ["js/data.js", "js/idle_data.js", "js/player.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  // TT.ENC_IDS nằm trong idle.js (cần DOM), ở đây chỉ cần danh sách rỗng vì các test không xét kỳ ngộ
  vm.runInContext("TT.ENC_IDS = []; TT.ui = { toast: (m, k) => globalThis.__toasts.push([m, k]) };", ctx);
  ctx.__toasts = toasts;
  vm.runInContext(fs.readFileSync(path.join(root, "js/security.js"), "utf8"), ctx, { filename: "js/security.js" });
  return { TT: vm.runInContext("TT", ctx), store, toasts, ctx };
}
const newPlayer = TT => new TT.Player("Nam", 20, "Nhân", Object.fromEntries(TT.STATS.map(s => [s, 1])), { name: "Thử Nghiệm" });

test("SHA-256 khớp node:crypto", () => {
  const { TT } = boot();
  for (const s of ["", "abc", "Thiên Vân Đại Lục", "x".repeat(55), "x".repeat(56), "x".repeat(64), "x".repeat(1000)])
    assert.equal(TT.sec._sha256hex(s), crypto.createHash("sha256").update(s).digest("hex"), JSON.stringify(s.slice(0, 20)));
});

test("HMAC-SHA256 khớp RFC 4231 (test case 2) và node:crypto", () => {
  const { TT } = boot();
  assert.equal(TT.sec._hmacHex("Jefe", "what do ya want for nothing?"), "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  const big = "k".repeat(100);                              // khóa dài hơn 1 khối (64 byte) phải được băm trước
  assert.equal(TT.sec._hmacHex(big, "msg"), crypto.createHmac("sha256", big).update("msg").digest("hex"));
});

test("khóa ký không còn nằm cố định trong mã nguồn", () => {
  const src = fs.readFileSync(path.join(root, "js/security.js"), "utf8");
  assert.ok(!src.includes("tvdl-v1-7f3a9c52e1b84d06"), "khóa cũ vẫn còn trong mã nguồn");
  assert.ok(boot().TT.sec.devKey, "chạy từ mã nguồn phải dùng khóa dev");
});

test("ghi rồi đọc lại đúng; sửa 1 ký tự thì bị từ chối", () => {
  const { TT, store } = boot();
  assert.equal(TT.sec.write("k", "save", { a: 1 }), true);
  assert.deepEqual(TT.sec.read("k", "save").obj, { a: 1 });
  assert.equal(TT.sec.read("k", "other-scope").bad, true, "sai scope phải bị từ chối");
  store.set("k", store.get("k").replace('\\"a\\":1', '\\"a\\":9'));
  assert.equal(TT.sec.read("k", "save").bad, true);
});

test("dữ liệu bị từ chối được giữ lại ở <key>_rejected, không bị xóa", () => {
  const { TT, store } = boot();
  store.set("k", JSON.stringify({ d: '{"a":1}', s: "0".repeat(64) }));
  store.set("tu_tien_sec_v1", "1");
  assert.equal(TT.sec.read("k", "save").bad, true);
  assert.equal(store.get("k_rejected"), store.get("k"));
});

test("dữ liệu quá lớn bị từ chối mà không bị parse", () => {
  const { TT, store } = boot();
  store.set("k", "x".repeat(3 * 1024 * 1024));
  assert.equal(TT.sec.read("k", "save").bad, true);
  assert.ok(store.get("k_rejected").length <= 1024, "chỉ giữ phần đầu của dữ liệu quá lớn");
});

test("sao lưu: giữ bản hợp lệ trước đó, và khôi phục được khi bản hiện tại hỏng", () => {
  const { TT, store } = boot();
  TT.sec.write("k", "save", { v: 1 });
  assert.equal(TT.sec.backupTime("k", "save"), 0, "lần ghi đầu chưa có gì để sao lưu");
  TT.sec.write("k", "save", { v: 2 });
  assert.ok(TT.sec.backupTime("k", "save") > 0, "lần ghi thứ hai phải tạo bản sao lưu của v1");
  TT.sec.write("k", "save", { v: 3 });                      // trong 5 phút: bản sao lưu vẫn là v1
  assert.deepEqual(JSON.parse(JSON.parse(store.get("k_bak")).d), { v: 1 });
  store.set("k", "hỏng");
  assert.equal(TT.sec.read("k", "save").bad, true);
  assert.equal(TT.sec.restore("k", "save"), true);
  assert.deepEqual(TT.sec.read("k", "save").obj, { v: 1 });
});

test("không sao lưu một bản đã hỏng (không để bản hỏng đè lên bản tốt)", () => {
  const { TT, store } = boot();
  TT.sec.write("k", "save", { v: 1 }); TT.sec.write("k", "save", { v: 2 });
  const good = store.get("k_bak");
  store.set("k", "hỏng"); TT.sec.write("k", "save", { v: 3 });
  assert.equal(store.get("k_bak"), good);
});

test("ghi thất bại (bộ nhớ đầy) trả về false và báo cho người chơi, không báo lặp", () => {
  const { TT, toasts } = boot(new Map(), { quota: 10 });
  assert.equal(TT.sec.write("k", "save", { big: "x".repeat(100) }), false);
  assert.equal(TT.sec.write("k", "save", { big: "x".repeat(100) }), false);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0][1], "bad");
});

test("tab đã bị thay thế (stale) thì không ghi đè save", () => {
  const { TT, store } = boot();
  TT.writeSave(1, newPlayer(TT));
  const before = store.get("tu_tien_save_v2");
  TT.sec.stale = true;
  assert.equal(TT.writeSave(2, null), false);
  assert.equal(store.get("tu_tien_save_v2"), before);
});

test("save hợp lệ đọc lại được và giữ nguyên đạo hiệu", () => {
  const { TT } = boot();
  TT.writeSave(3, newPlayer(TT));
  const r = TT.readSave();
  assert.equal(r.count, 3); assert.equal(r.player.name, "Thử Nghiệm");
});

test("khóa nguy hiểm trong save (__proto__, constructor) không làm ô nhiễm prototype", () => {
  const { TT, ctx } = boot();
  const d = JSON.parse(JSON.stringify(newPlayer(TT)));
  d.inv = JSON.parse('{"__proto__|1": 5, "constructor": 3, "Linh Thảo|1": 2}');
  d.__proto__x = 1;
  const p = TT.sec.cleanPlayer(d);
  assert.ok(p, TT.sec.error);
  assert.equal(vm.runInContext("({}).polluted", ctx), undefined);
  assert.deepEqual(Object.keys(p.inv), ["Linh Thảo|1"]);
});

test("cảnh giới cao hơn thời gian tu luyện cho phép bị từ chối", () => {
  const { TT } = boot();
  const d = JSON.parse(JSON.stringify(newPlayer(TT)));
  d.realm = 8; d.tang = 9; d.months = 5;
  assert.equal(TT.sec.cleanPlayer(d), null);
  assert.match(TT.sec.error, /Cảnh giới/);
});
