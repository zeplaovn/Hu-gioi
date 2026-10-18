/* Supabase boundary: Auth + database-only player persistence.
   Game save/meta are kept in memory while the page is open; persistent state lives only in player_saves.
   localStorage is used only for the Auth session, never for gameplay save data. */
"use strict";
(function () {
  const cfg = TT.CLOUD || {};
  const enabled = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(String(cfg.url)) && String(cfg.anonKey).length >= 20;
  const cloud = TT.cloud = { enabled };
  if (!enabled) return;

  const SESSION = "tu_tien_cloud_session";
  /* PUSH_DELAY: chờ sau một thay đổi thường (hành động của người chơi) trước khi đẩy.
     ROUTINE_GAP: khoảng cách tối thiểu giữa hai lần đẩy cho lưu định kỳ (mỗi tháng game ~10s, xem cloud.routine). Phải giữ dưới 120s:
     máy chủ chỉ tính đủ thời gian thật cho 120s đầu kể từ lần ghi trước, quá mức đó chỉ 50% (private.trusted_credit_ms) và dung sai chỉ 30s,
     nên giãn quá mức này người chơi đang online sẽ bị 'time_jump'. Lần đẩy ngay sau khi bù offline là lưu thường nên vẫn chỉ chờ PUSH_DELAY. */
  const PUSH_DELAY = 8000, ROUTINE_GAP = 45000, KEEPALIVE_MAX = 60000;
  const base = String(cfg.url).replace(/\/+$/, "");
  const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

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
    if (code === "captcha_failed" || msg.includes("captcha")) return "Xác minh hCaptcha không thành công, hãy thử lại.";
    if (e.status === 429 || code.includes("rate_limit")) return "Bạn thao tác quá nhanh, hãy thử lại sau ít phút.";
    if (msg === "maintenance_mode") return "Máy chủ đang bảo trì.";
    if (msg === "time_jump" || msg === "level_reverse" || msg === "bad_life_sequence") return "Máy chủ từ chối lưu vì tiến độ không khớp với thời gian thực. Hãy tải lại trang để đồng bộ lại với máy chủ.";
    return "Có lỗi xảy ra, vui lòng thử lại.";
  };

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
      catch (e) {
        /* Chỉ khi máy chủ Auth từ chối chính refresh token (400/401/403) mới xóa phiên. Lỗi mạng, 429 và 5xx là tạm thời:
           giữ phiên để lần sau thử lại, nếu không người chơi bị đăng xuất oan mỗi khi Supabase chập chờn. */
        if (e && !e.net && [400, 401, 403].includes(e.status)) { keep(null); throw { auth: true, message: "Phiên đăng nhập đã hết hạn." }; }
        throw e && e.net ? e : { status: e && e.status, code: e && e.code, message: (e && e.message) || "Không làm mới được phiên, sẽ thử lại." };
      }
      finally { refreshing = null; }
    })();
    await refreshing; return session.access_token;
  }
  const isAuthLoss = e => !!(e && (e.auth || e.status === 401 || (e.status === 403 && /jwt|token/i.test(e.message))));

  cloud.user = () => (session ? { id: session.user.id, email: session.user.email } : null);
  const cap = t => (t ? { gotrue_meta_security: { captcha_token: String(t) } } : {});
  cloud.captchaKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(cfg.hcaptcha)) ? String(cfg.hcaptcha) : "";
  cloud.signUp = async (email, password, captchaToken) => {
    const d = await http("/auth/v1/signup", { method: "POST", body: { email, password, ...cap(captchaToken) } });
    if (d && d.access_token) { keep(toSession(d)); return { signedIn: true }; }
    return { signedIn: false };
  };
  cloud.signIn = async (email, password, captchaToken) => { keep(toSession(await http("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password, ...cap(captchaToken) } }))); };
  cloud.recover = (email, captchaToken) => http("/auth/v1/recover", { method: "POST", body: { email, ...cap(captchaToken) } });

  const store = () => TT.runtimeStore;
  /* `gen` tăng mỗi lần có thay đổi mới. Một lần gửi chỉ được xóa cờ dirty nếu trong lúc gửi không có thay đổi nào khác
     (nếu không, thay đổi mới nhất sẽ không bao giờ được đẩy lên và lần flush khi đóng tab cũng bị bỏ qua). */
  let revision = 0, dirty = false, gen = 0, timer = null, inflight = false, backoff = 0;
  /* Giãn nhịp lưu định kỳ. Đo bằng đồng hồ đơn điệu, KHÔNG dùng Date.now(): ha_gioi_fix.js tạm thay Date.now bằng đồng hồ máy chủ
     trong nhiều hàm game, nên hai lần gọi Date.now có thể thuộc hai đồng hồ lệch nhau hàng giờ. */
  const mono = () => (typeof performance !== "undefined" && performance && typeof performance.now === "function" ? performance.now() : Date.now());
  let lastPushAt = -Infinity, lastPushedGen = 0, urgentGen = 0, routineDepth = 0, timerDue = 0;
  let status = { state: "idle" };
  const listeners = [];
  cloud.status = () => status;
  cloud.onStatus = fn => { listeners.push(fn); };
  const emit = (state, extra) => { status = { state, ...(extra || {}) }; listeners.slice().forEach(f => { try { f(status); } catch (e) { /* ignore */ } }); };
  /* Một hẹn giờ duy nhất; hẹn sớm hơn thì thay hẹn muộn hơn (thay đổi quan trọng không bị kẹt sau một lần lưu định kỳ đang chờ).
     replace = true: đặt lại đúng theo ms dù sớm hay muộn hơn (sau khi gửi xong, tính lại theo lastPushAt mới). */
  const schedule = (ms, replace = false) => {
    const due = mono() + ms;
    if (timer) { if (!replace && timerDue <= due) return; clearTimeout(timer); }
    timerDue = due;
    timer = setTimeout(() => { timer = null; run(); }, ms);
  };
  const routineDelay = () => Math.max(PUSH_DELAY, lastPushAt + ROUTINE_GAP - mono());
  const snapshot = () => store() ? store().snapshot() : { save: null, meta: {} };
  const hydrate = row => {
    if (!store()) throw new Error("runtime_store_missing");
    store().hydrate(row && row.save ? row.save : null, row && row.meta ? row.meta : {});
    revision = row ? Math.max(0, Math.trunc(+row.rev) || 0) : 0;
    dirty = false; backoff = 0;
  };

  cloud.markDirty = () => {
    if (!session || TT.sec.stale) return;
    dirty = true; gen++;
    if (routineDepth > 0) { schedule(routineDelay()); return; }   // lưu định kỳ: giãn tối thiểu ROUTINE_GAP kể từ lần đẩy trước
    urgentGen = gen; schedule(PUSH_DELAY);
  };
  /** Chạy fn (đồng bộ) mà mọi markDirty bên trong là lưu định kỳ, được giãn nhịp. Không dùng cho hành động của người chơi. */
  cloud.routine = fn => { routineDepth++; try { return fn(); } finally { routineDepth--; } };
  cloud.dirty = () => dirty;

  cloud.push = async ({ force = false } = {}) => {
    if (!session) throw { auth: true, message: "Chưa đăng nhập." };
    const g = gen, s = snapshot();
    const token = await freshToken();
    const r = await http("/rest/v1/rpc/save_game", { method: "POST", token, body: { p_save: s.save, p_meta: s.meta, p_rev: revision, p_force: !!force } });
    revision = Math.max(0, Math.trunc(+r.rev) || revision);
    if (gen === g) dirty = false;                                   // có thay đổi mới trong lúc gửi thì giữ dirty để lần sau đẩy tiếp
    backoff = 0; lastPushAt = mono(); lastPushedGen = g;
    return r;
  };

  async function run() {
    if (inflight || !session || !dirty || TT.sec.stale) return;
    inflight = true; emit("syncing");
    try { await cloud.push(); emit("synced", { t: Date.now() }); if (dirty) schedule(urgentGen > lastPushedGen ? 1500 : routineDelay(), true); }
    catch (e) {
      const m = String((e && e.message) || "");
      if (m === "conflict") {
        try { hydrate(await cloud.pull()); emit("server-newer"); }
        catch (pullErr) { emit("error", { text: cloud.errorText(pullErr) }); }
      } else if (isAuthLoss(e)) emit("signedout");
      else if (m === "too_fast") { emit("waiting"); schedule(3000); }
      else if (m === "implausible") emit("error", { text: "Máy chủ từ chối dữ liệu nhân vật vì giá trị không hợp lệ." });
      else if (e && e.net) { backoff = Math.min(300000, (backoff || 15000) * 2); emit("offline"); schedule(backoff); }
      else { backoff = Math.min(300000, (backoff || 15000) * 2); emit("error", { text: cloud.errorText(e) }); schedule(backoff); }
    } finally { inflight = false; }
  }
  cloud.syncNow = () => { if (timer) { clearTimeout(timer); timer = null; } return run(); };

  function flushSync() {
    const token = validToken();
    if (!token || !dirty || TT.sec.stale) return;
    const g = gen, s = snapshot(), body = JSON.stringify({ p_save: s.save, p_meta: s.meta, p_rev: revision, p_force: false });
    if (body.length > KEEPALIVE_MAX) return;
    try {
      fetch(base + "/rest/v1/rpc/save_game", { method: "POST", keepalive: true, headers: { apikey: cfg.anonKey, "Content-Type": "application/json", Authorization: "Bearer " + token }, body })
        .then(r => (r.ok ? r.json() : null)).then(r => { if (r && r.rev) { revision = +r.rev || revision; if (gen === g) dirty = false; lastPushAt = mono(); lastPushedGen = g; } }, () => {});
    } catch (e) { /* page is closing */ }
  }
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSync(); });
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("pagehide", flushSync);
    window.addEventListener("online", () => { if (dirty) cloud.syncNow(); });
  }

  cloud.pull = async () => {
    const token = await freshToken();
    const rows = await http("/rest/v1/player_saves?select=save,meta,rev,updated_at&limit=1", { token });
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  };

  cloud.bootstrap = async () => {
    if (!session) return { state: "anon" };
    try {
      hydrate(await cloud.pull());
      return { state: "ready" };
    } catch (e) {
      if (isAuthLoss(e)) return { state: "anon", expired: true };
      throw e;
    }
  };

  cloud.leaderboard = async ({ days = 0 } = {}) => {
    const token = await freshToken(), cols = "select=user_id,name,level,months";
    const since = days > 0 ? `&updated_at=gte.${encodeURIComponent(new Date(Date.now() - days * 86400000).toISOString())}` : "";
    const top = await http(`/rest/v1/leaderboard?${cols}${since}&order=level.desc,months.asc,updated_at.asc&limit=50`, { token });
    const uid = session.user.id;
    let me = (Array.isArray(top) ? top : []).findIndex(r => r.user_id === uid), mine = me >= 0 ? top[me] : null, rank = me >= 0 ? me + 1 : null;
    if (!mine) {
      const rows = await http(`/rest/v1/leaderboard?${cols}&user_id=eq.${encodeURIComponent(uid)}${since}&limit=1`, { token });
      mine = Array.isArray(rows) && rows[0] ? rows[0] : null;
    }
    return { top: Array.isArray(top) ? top : [], mine, rank, uid };
  };

  let chatHasAdminCol = true;                                     // cột is_admin có từ migration 20261019; máy chủ cũ thì bỏ qua
  cloud.chatList = async ({ after = 0 } = {}) => {
    const token = await freshToken(), a = Math.max(0, Math.floor(+after) || 0);
    const q = cols => `/rest/v1/chat_messages?select=${cols}&` + (a > 0 ? `id=gt.${a}&order=id.asc&limit=100` : "order=id.desc&limit=50");
    let rows;
    try { rows = await http(q("id,user_id,name,body,created_at" + (chatHasAdminCol ? ",is_admin" : "")), { token }); }
    catch (e) {
      if (!chatHasAdminCol || !e || e.status !== 400) throw e;
      chatHasAdminCol = false; rows = await http(q("id,user_id,name,body,created_at"), { token });
    }
    const list = Array.isArray(rows) ? rows : [];
    return a > 0 ? list : list.reverse();
  };
  cloud.chatSend = async body => http("/rest/v1/rpc/send_chat", { method: "POST", token: await freshToken(), body: { p_body: String(body) } });

  cloud.signOut = async ({ force = false } = {}) => {
    if (session && dirty) { try { await Promise.race([cloud.push(), new Promise((_, reject) => setTimeout(() => reject({}), 4000))]); } catch (e) { /* checked below */ } }
    if (!force && session && dirty) throw { unsynced: true, message: "Còn tiến trình chưa lưu lên máy chủ." };
    const token = validToken();
    if (token) { try { await http("/auth/v1/logout", { method: "POST", token }); } catch (e) { /* local session removal is enough */ } }
    keep(null); dirty = false; revision = 0; if (store()) store().clear();
  };

  cloud.deleteAccount = async () => {
    const token = await freshToken();
    await http("/rest/v1/rpc/delete_account", { method: "POST", token, body: {} });
    keep(null); dirty = false; revision = 0; if (store()) store().clear();
  };
})();
