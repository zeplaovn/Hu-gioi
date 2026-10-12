/* Đăng nhập + lưu dữ liệu người chơi trên Supabase (gọi thẳng REST bằng fetch, không cần SDK).
   - Mô hình: localStorage là bộ nhớ đệm, máy chủ là nơi giữ bản chính. Mỗi lần game lưu, thay đổi được đẩy lên (gộp, trễ vài giây).
   - Ghi qua hàm save_game() trên máy chủ, có số phiên bản (rev) để hai thiết bị không đè dữ liệu của nhau.
   - Dữ liệu từ máy chủ KHÔNG được tin tuyệt đối: khi nạp vẫn đi qua cleanPlayer() trong security.js như save trên máy. */
"use strict";
(function () {
  const cfg = TT.CLOUD || {};
  const enabled = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(String(cfg.url)) && String(cfg.anonKey).length >= 20;
  const cloud = TT.cloud = { enabled };
  if (!enabled) return;

  const SESSION = "tu_tien_cloud_session", REV = "tu_tien_cloud_rev", UID = "tu_tien_cloud_uid", DIRTY = "tu_tien_cloud_dirty";
  const SAVE = "tu_tien_save_v2", META = "tu_tien_meta_v1", FLAG = "tu_tien_sec_v1";
  const PUSH_DELAY = 8000, KEEPALIVE_MAX = 60000;
  const base = String(cfg.url).replace(/\/+$/, "");
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } },
  };

  /* ---------- HTTP ---------- */
  async function http(path, { method = "GET", body, token, keepalive } = {}) {
    let res;
    try {
      res = await fetch(base + path, {
        method, keepalive, cache: "no-store",
        headers: { apikey: cfg.anonKey, "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) { throw { net: true, message: "Không kết nối được máy chủ." }; }
    let data = null; const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch (e) { data = { message: text.slice(0, 200) }; } }
    if (!res.ok) throw { status: res.status, code: (data && (data.error_code || data.code)) || "", message: String((data && (data.msg || data.message || data.error_description || data.error)) || ""), data };
    return data;
  }

  /** Dịch lỗi của Supabase sang tiếng Việt cho người chơi. */
  cloud.errorText = e => {
    if (!e) return "Có lỗi xảy ra, vui lòng thử lại.";
    if (e.net) return "Không kết nối được máy chủ. Hãy kiểm tra mạng.";
    const code = String(e.code || ""), msg = String(e.message || "").toLowerCase();
    if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "Email hoặc mật khẩu không đúng.";
    if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "Email chưa được xác nhận. Hãy kiểm tra hộp thư.";
    if (code === "user_already_exists" || msg.includes("already registered")) return "Email này đã được đăng ký.";
    if (code === "weak_password" || msg.includes("password should be")) return "Mật khẩu quá yếu (cần ít nhất 8 ký tự).";
    if (code === "signup_disabled" || msg.includes("signups not allowed")) return "Hiện chưa nhận đăng ký mới.";
    if (code === "validation_failed" || msg.includes("unable to validate email")) return "Email không hợp lệ.";
    if (e.status === 429 || code.includes("rate_limit")) return "Bạn thao tác quá nhanh, hãy thử lại sau ít phút.";
    return "Có lỗi xảy ra, vui lòng thử lại.";
  };

  /* ---------- phiên đăng nhập ---------- */
  let session = null;
  try { session = JSON.parse(ls.get(SESSION)); } catch (e) { session = null; }
  if (!session || !session.access_token || !session.refresh_token || !session.user || !session.user.id) session = null;
  const keep = s => { session = s; if (s) ls.set(SESSION, JSON.stringify(s)); else ls.del(SESSION); };
  const toSession = d => {
    if (!d || !d.access_token || !d.refresh_token || !d.user || !d.user.id) throw { message: "Phản hồi đăng nhập không hợp lệ." };
    return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: +d.expires_at || Math.floor(Date.now() / 1000) + (+d.expires_in || 3600), user: { id: String(d.user.id), email: String(d.user.email || "") } };
  };
  const validToken = () => (session && session.expires_at - 30 > Date.now() / 1000 ? session.access_token : null);
  let refreshing = null;
  async function freshToken() {
    const t = validToken(); if (t) return t;
    if (!session) throw { auth: true, message: "Chưa đăng nhập." };
    if (!refreshing) refreshing = (async () => {
      try { keep(toSession(await http("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: session.refresh_token } }))); }
      catch (e) { if (!e.net) keep(null); throw e.net ? e : { auth: true, message: "Phiên đăng nhập đã hết hạn." }; }   // lỗi mạng giữ nguyên phiên; refresh token bị từ chối thì đăng xuất
      finally { refreshing = null; }
    })();
    await refreshing; return session.access_token;
  }
  const isAuthLoss = e => !!(e && (e.auth || e.status === 401 || (e.status === 403 && /jwt|token/i.test(e.message))));

  cloud.user = () => (session ? { id: session.user.id, email: session.user.email } : null);
  cloud.signUp = async (email, password) => {
    const d = await http("/auth/v1/signup", { method: "POST", body: { email, password } });
    if (d && d.access_token) { keep(toSession(d)); return { signedIn: true }; }
    return { signedIn: false };                                 // cần xác nhận email (hoặc email đã tồn tại: Supabase cố ý trả lời giống nhau)
  };
  cloud.signIn = async (email, password) => { keep(toSession(await http("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } }))); };
  cloud.recover = email => http("/auth/v1/recover", { method: "POST", body: { email } });

  /* ---------- bộ nhớ đệm trên máy ---------- */
  const rev = () => Math.max(0, parseInt(ls.get(REV), 10) || 0);
  const setRev = n => ls.set(REV, String(n));
  const readLocal = () => {
    const s = TT.sec.read(SAVE, "save"), m = TT.sec.read(META, "meta");
    return { save: s && s.obj ? s.obj : null, meta: m && m.obj && typeof m.obj === "object" ? m.obj : {}, bad: !!((s && s.bad) || (m && m.bad)) };
  };
  const hasLocalData = () => { const l = readLocal(); return !!(l.save && l.save.player) || Object.keys(l.meta).length > 0; };
  let muted = false, locked = false;
  function hydrate(row, uid) {                                  // ghi bản từ máy chủ vào bộ nhớ đệm (đã ký bằng khóa trên máy)
    muted = true;
    try {
      [SAVE, META].forEach(k => [k, k + "_bak", k + "_rejected"].forEach(ls.del));
      if (row && row.save) TT.sec.write(SAVE, "save", row.save);
      if (row && row.meta && Object.keys(row.meta).length) TT.sec.write(META, "meta", row.meta);
    } finally { muted = false; }
    setRev(row ? row.rev : 0); ls.set(UID, uid); ls.del(DIRTY);
  }
  cloud.wipeLocal = () => { [SAVE, META, FLAG, REV, UID, DIRTY].forEach(k => [k, k + "_bak", k + "_rejected"].forEach(ls.del)); };

  /* ---------- đồng bộ ---------- */
  let status = { state: "idle" }, timer = null, inflight = false, conflict = false, backoff = 0;
  const listeners = [];
  cloud.status = () => status;
  cloud.onStatus = fn => { listeners.push(fn); };
  const emit = (state, extra) => { status = { state, ...(extra || {}) }; listeners.slice().forEach(f => { try { f(status); } catch (e) { /* bỏ qua */ } }); };
  const schedule = ms => { if (!timer) timer = setTimeout(() => { timer = null; run(); }, ms); };
  const payload = (force) => {
    const l = readLocal();
    if (l.bad) return null;                                     // không bao giờ đẩy dữ liệu đã bị từ chối lên máy chủ
    return { p_save: l.save, p_meta: l.meta, p_rev: rev(), p_force: !!force };
  };
  const errName = e => String((e && e.message) || "");

  cloud.markDirty = () => { if (!session) return; ls.set(DIRTY, "1"); if (!conflict) schedule(PUSH_DELAY); };

  /** Đẩy ngay. force = true: ghi đè bất chấp rev (người chơi đã chọn dùng bản trên máy này). */
  cloud.push = async ({ force = false } = {}) => {
    const body = payload(force);
    if (!body) throw { message: "local_invalid" };
    const token = await freshToken();
    const r = await http("/rest/v1/rpc/save_game", { method: "POST", token, body });
    setRev(r.rev); ls.del(DIRTY); conflict = false; backoff = 0;
    return r;
  };
  async function run() {
    if (inflight || conflict || !session || ls.get(DIRTY) !== "1" || TT.sec.stale) return;
    inflight = true; emit("syncing");
    try { await cloud.push(); emit("synced", { t: Date.now() }); }
    catch (e) {
      const m = errName(e);
      if (m === "conflict") { conflict = true; emit("conflict"); }
      else if (isAuthLoss(e)) emit("signedout");
      else if (m === "too_fast") schedule(3000);
      else if (m === "local_invalid") emit("error", { text: "Dữ liệu trên máy không hợp lệ, không đồng bộ." });
      else if (e && e.net) { backoff = Math.min(300000, (backoff || 15000) * 2); emit("offline"); schedule(backoff); }
      else { backoff = Math.min(300000, (backoff || 15000) * 2); emit("error", { text: cloud.errorText(e) }); schedule(backoff); }
    } finally { inflight = false; }
  }
  cloud.syncNow = () => { if (timer) { clearTimeout(timer); timer = null; } return run(); };
  cloud.resolveConflict = async choice => {                     // "cloud" = dùng bản máy chủ (tải lại trang); "local" = ghi đè máy chủ bằng bản trên máy
    if (choice === "local") { conflict = false; await cloud.push({ force: true }); emit("synced", { t: Date.now() }); return "ok"; }
    const row = await cloud.pull(); hydrate(row, session.user.id); conflict = false; return "reload";
  };

  /** Đẩy đồng bộ khi đóng tab / ẩn trang: fetch keepalive, không chờ kết quả. */
  function flushSync() {
    const t = validToken();
    if (!t || ls.get(DIRTY) !== "1" || conflict || TT.sec.stale) return;
    const body = payload(false); if (!body) return;
    const text = JSON.stringify(body); if (text.length > KEEPALIVE_MAX) return;
    try {
      fetch(base + "/rest/v1/rpc/save_game", { method: "POST", keepalive: true, headers: { apikey: cfg.anonKey, "Content-Type": "application/json", Authorization: "Bearer " + t }, body: text })
        .then(r => (r.ok ? r.json() : null)).then(r => { if (r && r.rev) { setRev(r.rev); ls.del(DIRTY); } }, () => { /* mất mạng: lần mở sau sẽ đẩy tiếp */ });
    } catch (e) { /* bỏ qua */ }
  }
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSync(); });
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("pagehide", flushSync);
    window.addEventListener("online", () => { if (ls.get(DIRTY) === "1") cloud.syncNow(); });
  }

  /* ---------- đọc từ máy chủ + quyết định lúc mở game ---------- */
  cloud.pull = async () => {
    const token = await freshToken();
    const rows = await http("/rest/v1/player_saves?select=save,meta,rev,updated_at&limit=1", { token });
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  };

  /** Gọi khi mở game (và sau khi đăng nhập). Trả về một trong:
        { state: "anon" }                 chưa đăng nhập
        { state: "ready", offline }       dùng được dữ liệu trên máy, vào game
        { state: "reload" }               vừa nạp dữ liệu máy chủ vào bộ nhớ đệm, cần tải lại trang
        { state: "conflict", row }        máy chủ và máy này cùng có dữ liệu khác nhau -> hỏi người chơi
        { state: "offer-upload" }         máy này có dữ liệu cũ chưa gắn tài khoản, tài khoản còn trống -> hỏi tải lên */
  cloud.bootstrap = async () => {
    if (!session) return { state: "anon" };
    const uid = session.user.id;
    let row;
    try { row = await cloud.pull(); }
    catch (e) {
      if (e.net) return { state: "ready", offline: true };
      if (isAuthLoss(e)) return { state: "anon", expired: true };
      throw e;
    }
    const localUid = ls.get(UID), dirty = ls.get(DIRTY) === "1", has = hasLocalData();
    if (localUid && localUid !== uid) cloud.wipeLocal();        // bộ nhớ đệm của tài khoản khác trên cùng trình duyệt: bỏ
    const mine = localUid === uid, legacy = !localUid && has;
    if (!row) {
      if (legacy) return { state: "offer-upload" };
      ls.set(UID, uid); setRev(0);
      if (mine && has) cloud.markDirty();                       // máy chủ trống nhưng máy này có dữ liệu của chính tài khoản: đẩy lên
      return { state: "ready" };
    }
    if (legacy) return { state: "conflict", row };
    if (mine && row.rev === rev()) { ls.set(UID, uid); if (dirty) cloud.markDirty(); return { state: "ready" }; }
    if (mine && row.rev > rev() && dirty) return { state: "conflict", row };
    hydrate(row, uid);
    return { state: "reload" };
  };
  cloud.acceptLocalUpload = async () => {                       // dùng dữ liệu trên máy: gắn vào tài khoản (ghi đè nếu máy chủ đã có)
    ls.set(UID, session.user.id); setRev(0);
    let row = null; try { row = await cloud.pull(); } catch (e) { /* mất mạng: để lần sau */ }
    if (row) setRev(row.rev);
    ls.set(DIRTY, "1"); await cloud.push({ force: !!row });
  };
  cloud.discardLocal = row => { hydrate(row || null, session.user.id); };

  /** Đăng xuất. Nếu còn tiến trình chưa lên được máy chủ (mất mạng, xung đột, lỗi) thì KHÔNG xóa gì và ném { unsynced: true },
      trừ khi truyền force = true (người chơi đã đồng ý bỏ phần chưa đồng bộ). */
  cloud.signOut = async ({ force = false } = {}) => {
    if (session && ls.get(DIRTY) === "1" && !conflict) { try { await Promise.race([cloud.push(), new Promise((_, rj) => setTimeout(() => rj({}), 4000))]); } catch (e) { /* kiểm tra DIRTY bên dưới */ } }
    if (!force && session && (ls.get(DIRTY) === "1" || conflict)) throw { unsynced: true, message: "Còn tiến trình chưa đồng bộ." };
    locked = false;
    const t = validToken();
    if (t) { try { await http("/auth/v1/logout", { method: "POST", token: t }); } catch (e) { /* đã xóa phiên ở máy là đủ */ } }
    locked = true; keep(null); cloud.wipeLocal();            // từ đây game không ghi lại được dữ liệu vào máy (tránh lộ sang tài khoản kế tiếp)
  };

  /* ---------- mọi lần game ghi save/meta xuống máy đều đánh dấu cần đồng bộ ---------- */
  const write = TT.sec.write;
  TT.sec.write = (key, scope, obj) => {
    if (locked && (key === SAVE || key === META)) return false;
    const ok = write(key, scope, obj);
    if (ok && !muted && (key === SAVE || key === META)) cloud.markDirty();
    return ok;
  };
  cloud.dirty = () => ls.get(DIRTY) === "1";
})();
