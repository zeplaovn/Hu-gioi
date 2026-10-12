// Kiểm thử đăng nhập + đồng bộ Supabase (js/cloud.js) với máy chủ giả:  node --test tools/test_cloud.mjs
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import path from "node:path"; import vm from "node:vm";
import { createMock } from "./mock_supabase.mjs";

const root = path.resolve(import.meta.dirname, "..");
const src = f => fs.readFileSync(path.join(root, f), "utf8");

/** Một "thiết bị" = một localStorage riêng + một bản game riêng, cùng nói chuyện với một máy chủ giả. */
function device(mock, port, store = new Map()) {
  const ls = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => store.delete(k) };
  const timers = (f, ms) => { const t = setTimeout(f, ms); t.unref?.(); return t; };
  const ctx = vm.createContext({ localStorage: ls, console, TextEncoder, Date, Math, JSON, Object, Array, Set, Number, String, Map, Uint8Array, Uint32Array, DataView, Error, Promise, parseInt, parseFloat, isFinite, fetch, setTimeout: timers, clearTimeout, clearInterval });
  ctx.window = ctx; ctx.h = () => ({});
  ctx.document = { addEventListener() {}, visibilityState: "visible" };
  for (const f of ["js/data.js", "js/idle_data.js", "js/player.js"]) vm.runInContext(src(f), ctx, { filename: f });
  vm.runInContext("TT.ENC_IDS = []; TT.ui = { toast() {} };", ctx);
  vm.runInContext(src("js/security.js"), ctx, { filename: "js/security.js" });
  ctx.__cfg = { url: `http://127.0.0.1:${port}`, anonKey: mock.anonKey };
  vm.runInContext("TT.CLOUD = globalThis.__cfg;", ctx);
  vm.runInContext(src("js/cloud.js"), ctx, { filename: "js/cloud.js" });
  const TT = vm.runInContext("TT", ctx);
  const player = (name = "Thử Nghiệm") => new TT.Player("Nam", 20, "Nhân", Object.fromEntries(TT.STATS.map(s => [s, 1])), { name });
  return { TT, store, ctx, cloud: TT.cloud, player, saveName: () => { const r = TT.readSave(); return r && r.player ? r.player.name : null; } };
}
async function withMock(opts, fn) {
  const mock = createMock(opts), port = await mock.ready;
  try { await fn(mock, port); } finally { await mock.close(); }
}
// đối tượng tạo trong vm có prototype khác nên so sánh qua JSON
const deq = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);
const EMAIL = "nguoichoi@example.com", PASS = "matkhau-manh-1";

test("khi chưa cấu hình, cloud tắt và không động vào dữ liệu", () => {
  const d = device({ anonKey: "x" }, 1); vm.runInContext("TT.CLOUD = { url: '__SUPABASE_URL__', anonKey: '__SUPABASE_ANON_KEY__' };", d.ctx);
  const ctx2 = d.ctx; vm.runInContext("TT.cloud = undefined", ctx2); vm.runInContext(src("js/cloud.js"), ctx2);
  assert.equal(d.TT.cloud.enabled, false);
});

test("đăng ký, đăng nhập và các lỗi được dịch sang tiếng Việt", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port);
  assert.equal(a.cloud.enabled, true);
  await assert.rejects(a.cloud.signUp(EMAIL, "ngan"), e => a.cloud.errorText(e).includes("ít nhất 8 ký tự"));
  await assert.rejects(a.cloud.signUp("khong-phai-email", PASS), e => a.cloud.errorText(e) === "Email không hợp lệ.");
  deq(await a.cloud.signUp(EMAIL, PASS), { signedIn: true });
  assert.equal(a.cloud.user().email, EMAIL);
  await assert.rejects(device(mock, port).cloud.signUp(EMAIL, PASS), e => a.cloud.errorText(e) === "Email này đã được đăng ký.");
  await assert.rejects(device(mock, port).cloud.signIn(EMAIL, "sai-mat-khau"), e => a.cloud.errorText(e) === "Email hoặc mật khẩu không đúng.");
  const b = device(mock, port); await b.cloud.signIn(EMAIL, PASS); assert.equal(b.cloud.user().email, EMAIL);
  assert.equal(a.cloud.errorText({ net: true }).includes("kết nối"), true);
  assert.equal(a.cloud.errorText({ status: 429 }).includes("quá nhanh"), true);
}));

test("bật xác nhận email: đăng ký chưa vào được, đăng nhập báo chưa xác nhận", async () => withMock({ confirmEmail: true }, async (mock, port) => {
  const a = device(mock, port);
  deq(await a.cloud.signUp(EMAIL, PASS), { signedIn: false });
  assert.equal(a.cloud.user(), null);
  await assert.rejects(a.cloud.signIn(EMAIL, PASS), e => a.cloud.errorText(e).includes("chưa được xác nhận"));
  mock.confirm(EMAIL); await a.cloud.signIn(EMAIL, PASS); assert.ok(a.cloud.user());
  const again = await device(mock, port).cloud.signUp(EMAIL, PASS);           // email đã có: trả lời giống hệt, không lộ việc đã đăng ký
  deq(again, { signedIn: false });
}));

test("phiên đăng nhập giữ qua lần mở lại; hết hạn thì tự làm mới; bị thu hồi thì về màn đăng nhập", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS);
  const reopened = device(mock, port, a.store); assert.equal(reopened.cloud.user().email, EMAIL);
  const s = JSON.parse(reopened.store.get("tu_tien_cloud_session")); s.expires_at = 1; reopened.store.set("tu_tien_cloud_session", JSON.stringify(s));
  const r2 = device(mock, port, reopened.store);
  assert.equal(await r2.cloud.pull(), null);                                    // pull thành công => đã tự refresh
  const after = JSON.parse(r2.store.get("tu_tien_cloud_session"));
  assert.notEqual(after.access_token, s.access_token); assert.ok(after.expires_at > Date.now() / 1000);
  assert.ok(mock.state.calls.some(c => c.includes("grant_type=refresh_token")));
  mock.state.refresh.clear(); after.expires_at = 1; r2.store.set("tu_tien_cloud_session", JSON.stringify(after));      // thu hồi refresh token
  const r3 = device(mock, port, r2.store);
  deq(await r3.cloud.bootstrap(), { state: "anon", expired: true });
  assert.equal(r3.store.get("tu_tien_cloud_session"), undefined);
}));

test("đồng bộ hai chiều: ghi ở máy A, mở ở máy B thấy đúng nhân vật", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS);
  deq(await a.cloud.bootstrap(), { state: "ready" });              // tài khoản mới, chưa có gì
  a.TT.writeSave(1, a.player("Đạo Hữu A"));
  assert.equal(a.cloud.dirty(), true);
  await a.cloud.syncNow();
  assert.equal(a.cloud.dirty(), false); assert.equal(a.cloud.status().state, "synced");
  const row = mock.state.rows.values().next().value; assert.equal(row.rev, 1); assert.equal(row.save.player.name, "Đạo Hữu A");
  const b = device(mock, port); await b.cloud.signIn(EMAIL, PASS);
  deq(await b.cloud.bootstrap(), { state: "reload" });             // nạp bản máy chủ rồi tải lại trang
  assert.equal(b.saveName(), "Đạo Hữu A");
  deq(await device(mock, port, b.store).cloud.bootstrap(), { state: "ready" });   // sau khi tải lại: khớp, vào game
}));

test("hai thiết bị cùng sửa: phát hiện xung đột, chọn bản máy chủ hoặc bản trên máy", async () => withMock({ minGapMs: 0 }, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Bản Đầu")); await a.cloud.syncNow();
  const b = device(mock, port); await b.cloud.signIn(EMAIL, PASS); await b.cloud.bootstrap();
  const b2 = device(mock, port, b.store); deq(await b2.cloud.bootstrap(), { state: "ready" });
  a.TT.writeSave(1, a.player("Từ Máy A")); await a.cloud.syncNow();             // A đi trước
  b2.TT.writeSave(1, b2.player("Từ Máy B")); await b2.cloud.syncNow();          // B ghi với rev cũ
  assert.equal(b2.cloud.status().state, "conflict");
  assert.equal(mock.state.rows.values().next().value.save.player.name, "Từ Máy A", "máy chủ không bị B đè");
  assert.equal(await b2.cloud.resolveConflict("cloud"), "reload");
  assert.equal(b2.saveName(), "Từ Máy A");
  // chọn giữ bản trên máy
  b2.TT.writeSave(1, b2.player("B Giữ Lại")); a.TT.writeSave(1, a.player("A Lại Đi Trước")); await a.cloud.syncNow();
  await b2.cloud.syncNow(); assert.equal(b2.cloud.status().state, "conflict");
  assert.equal(await b2.cloud.resolveConflict("local"), "ok");
  assert.equal(mock.state.rows.values().next().value.save.player.name, "B Giữ Lại");
}));

test("mở game khi máy chủ đã có bản mới hơn và máy này cũng có thay đổi chưa đẩy: hỏi người chơi", async () => withMock({}, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Gốc")); await a.cloud.syncNow();
  const b = device(mock, port); await b.cloud.signIn(EMAIL, PASS); await b.cloud.bootstrap();
  const b2 = device(mock, port, b.store); await b2.cloud.bootstrap();
  a.TT.writeSave(1, a.player("A Mới")); await a.cloud.syncNow();
  b2.TT.writeSave(1, b2.player("B Offline"));                                   // B chơi ngoại tuyến, chưa kịp đẩy
  const b3 = device(mock, port, b2.store); const r = await b3.cloud.bootstrap();
  assert.equal(r.state, "conflict"); assert.equal(r.row.save.player.name, "A Mới");
}));

test("dữ liệu cũ trên máy (chưa có tài khoản): đề nghị tải lên, hoặc hỏi nếu tài khoản đã có dữ liệu", async () => withMock({}, async (mock, port) => {
  const old = device(mock, port); old.TT.writeSave(3, old.player("Người Cũ"));   // chơi ngoại tuyến từ trước
  await old.cloud.signUp(EMAIL, PASS);
  deq(await old.cloud.bootstrap(), { state: "offer-upload" });
  await old.cloud.acceptLocalUpload();
  const row = mock.state.rows.values().next().value; assert.equal(row.save.count, 3); assert.equal(row.save.player.name, "Người Cũ");
  const other = device(mock, port); other.TT.writeSave(1, other.player("Máy Khác"));
  await other.cloud.signIn(EMAIL, PASS);
  const r = await other.cloud.bootstrap(); assert.equal(r.state, "conflict");
  other.cloud.discardLocal(r.row); assert.equal(other.saveName(), "Người Cũ");
}));

test("bộ nhớ đệm của tài khoản khác trên cùng trình duyệt bị xóa, không lộ sang người kế tiếp", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port); await a.cloud.signUp("a@example.com", PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Riêng Tư Của A")); await a.cloud.syncNow();
  a.store.delete("tu_tien_cloud_session");                                       // giả lập quên đăng xuất, người khác dùng máy
  const b = device(mock, port, a.store); await b.cloud.signUp("b@example.com", PASS);
  deq(await b.cloud.bootstrap(), { state: "ready" });
  assert.equal(b.saveName(), null, "dữ liệu của A không được còn trên máy khi B đăng nhập");
}));

test("mất mạng: vẫn vào game bằng dữ liệu trên máy, giữ cờ chưa đồng bộ, tự đẩy khi có lại", async () => {
  const mock = createMock({}), port = await mock.ready; mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Chơi Offline")); await a.cloud.syncNow();
  await mock.close();                                                            // sập mạng
  const off = device(mock, port, a.store);
  deq(await off.cloud.bootstrap(), { state: "ready", offline: true });
  off.TT.writeSave(1, off.player("Thay Đổi Offline")); await off.cloud.syncNow();
  assert.equal(off.cloud.status().state, "offline"); assert.equal(off.cloud.dirty(), true);
  assert.equal(off.saveName(), "Thay Đổi Offline", "dữ liệu trên máy không mất");
  const mock2 = createMock({ port }), p2 = await mock2.ready; assert.equal(p2, port);   // có mạng trở lại (cùng cổng, nhớ dữ liệu cũ)
  mock2.state.users = mock.state.users; for (const [k, v] of mock.state.users) mock2.state.users.set(k, v);
  for (const [k, v] of mock.state.tokens) mock2.state.tokens.set(k, v); for (const [k, v] of mock.state.rows) mock2.state.rows.set(k, v);
  mock2.state.minGapMs = 0; await off.cloud.syncNow();
  assert.equal(off.cloud.status().state, "synced"); assert.equal(off.cloud.dirty(), false);
  assert.equal(mock2.state.rows.values().next().value.save.player.name, "Thay Đổi Offline");
  await mock2.close();
});

test("đăng xuất: đẩy phần chưa lưu, xóa sạch dữ liệu trên máy và không cho game ghi lại", async () => withMock({}, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Trước Khi Thoát"));
  await a.cloud.signOut();
  assert.equal(mock.state.rows.values().next().value.save.player.name, "Trước Khi Thoát", "phần chưa đồng bộ được đẩy trước khi thoát");
  assert.equal(a.cloud.user(), null); assert.equal(a.saveName(), null);
  deq([...a.store.keys()].filter(k => k.startsWith("tu_tien")), []);
  a.TT.sec.stale = false; a.TT.writeSave(1, a.player("Ghi Muộn"));              // game còn chạy ngầm cố ghi
  assert.equal(a.saveName(), null, "sau đăng xuất không được ghi lại dữ liệu vào máy");
}));

test("đăng xuất khi chưa đồng bộ được (mất mạng): không xóa gì, trừ khi người chơi chấp nhận bỏ", async () => {
  const mock = createMock({}), port = await mock.ready; mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Chưa Lên Máy Chủ"));
  await mock.close();                                                            // sập mạng trước khi đồng bộ
  await assert.rejects(() => a.cloud.signOut(), e => e.unsynced === true);
  assert.notEqual(a.cloud.user(), null, "vẫn đăng nhập");
  assert.equal(a.saveName(), "Chưa Lên Máy Chủ", "tiến trình trên máy không bị xóa");
  await a.cloud.signOut({ force: true });
  assert.equal(a.cloud.user(), null); assert.equal(a.saveName(), null);
});

test("xóa tài khoản: dữ liệu trên máy chủ và trên máy đều mất, không đăng nhập lại được", async () => withMock({}, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Sắp Bị Xóa")); await a.cloud.syncNow();
  assert.equal(mock.state.rows.size, 1);
  await a.cloud.deleteAccount();
  assert.equal(mock.state.rows.size, 0); assert.equal(a.cloud.user(), null); assert.equal(a.saveName(), null);
  await assert.rejects(() => a.cloud.signIn(EMAIL, PASS), e => /không đúng/.test(a.cloud.errorText(e)));
}));

test("máy chủ từ chối nhân vật vô lý (cảnh giới ngoài phạm vi)", async () => withMock({}, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  const tok = a.cloud.user() && (await a.cloud.pull().then(() => [...mock.state.tokens.keys()].pop()));
  const r = await fetch(`http://127.0.0.1:${port}/rest/v1/rpc/save_game`, { method: "POST", headers: { apikey: mock.anonKey, Authorization: "Bearer " + tok, "Content-Type": "application/json" },
    body: JSON.stringify({ p_save: { player: { realm: 99, tang: 1, months: 0, age: 20, lifespan: 80 } }, p_meta: {}, p_rev: 0 }) });
  assert.equal(r.status, 400); assert.equal((await r.json()).message, "implausible");
}));

test("bảng xếp hạng: sắp theo cảnh giới, thấy dòng của mình, bị xóa khi xóa tài khoản", async () => withMock({}, async (mock, port) => {
  mock.state.minGapMs = 0;
  const a = device(mock, port); await a.cloud.signUp("a@example.com", PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Yếu Hơn")); await a.cloud.syncNow();
  const b = device(mock, port); await b.cloud.signUp("b@example.com", PASS); await b.cloud.bootstrap();
  const pb = b.player("Mạnh Hơn"); pb.realm = 2; pb.tang = 1; pb.months = 240; pb.age = 40; b.TT.writeSave(1, pb); await b.cloud.syncNow();
  const lb = await a.cloud.leaderboard();
  deq(lb.top.map(r => r.name), ["Mạnh Hơn", "Yếu Hơn"]);
  assert.equal(lb.rank, 2); assert.equal(lb.mine.name, "Yếu Hơn"); assert.equal(lb.top[0].level, 19);
  await b.cloud.deleteAccount();
  deq((await a.cloud.leaderboard()).top.map(r => r.name), ["Yếu Hơn"]);
}));

test("hCaptcha: Supabase bật CAPTCHA thì đăng ký / đăng nhập / quên mật khẩu cần mã, sai mã báo tiếng Việt", async () => withMock({}, async (mock, port) => {
  mock.state.captcha = true;
  const a = device(mock, port);
  await assert.rejects(() => a.cloud.signUp(EMAIL, PASS), e => /hCaptcha/.test(a.cloud.errorText(e)));
  await assert.rejects(() => a.cloud.signUp(EMAIL, PASS, "token-sai"), e => /hCaptcha/.test(a.cloud.errorText(e)));
  assert.deepEqual(JSON.parse(JSON.stringify(await a.cloud.signUp(EMAIL, PASS, "ok-token"))), { signedIn: true });
  const b = device(mock, port);
  await assert.rejects(() => b.cloud.signIn(EMAIL, PASS), e => /hCaptcha/.test(b.cloud.errorText(e)));
  await b.cloud.signIn(EMAIL, PASS, "ok-token"); assert.notEqual(b.cloud.user(), null);
  await assert.rejects(() => b.cloud.recover(EMAIL), e => /hCaptcha/.test(b.cloud.errorText(e)));
  await b.cloud.recover(EMAIL, "ok-token");
  mock.state.captcha = false; await b.cloud.signIn(EMAIL, PASS);                // không bật captcha: không gửi token vẫn được
}));

test("dữ liệu từ máy chủ không được tin: save bị chỉnh vô lý bị từ chối thay vì làm game sập", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Hợp Lệ")); await a.cloud.syncNow();
  const row = mock.state.rows.values().next().value; row.save.player.realm = 8; row.save.player.tang = 9; row.save.player.months = 5; row.rev++;   // ai đó ghi thẳng vào DB
  const b = device(mock, port); await b.cloud.signIn(EMAIL, PASS);
  deq(await b.cloud.bootstrap(), { state: "reload" });
  assert.doesNotThrow(() => b.TT.readSave());
  assert.equal(b.saveName(), null); assert.match(b.TT.sec.error, /Cảnh giới/);
}));

test("không đẩy dữ liệu đã bị từ chối (hỏng chữ ký) lên máy chủ", async () => withMock({}, async (mock, port) => {
  const a = device(mock, port); await a.cloud.signUp(EMAIL, PASS); await a.cloud.bootstrap();
  a.TT.writeSave(1, a.player("Tốt")); await a.cloud.syncNow(); const before = JSON.stringify(mock.state.rows.values().next().value.save);
  a.store.set("tu_tien_save_v2", a.store.get("tu_tien_save_v2").replace("Tốt", "Xấu")); a.store.set("tu_tien_cloud_dirty", "1");
  await a.cloud.syncNow();
  assert.equal(JSON.stringify(mock.state.rows.values().next().value.save), before);
  assert.equal(a.cloud.status().state, "error");
}));
