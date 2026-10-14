/* Cầu nối an toàn giữa game client và Admin Console.
   Chỉ gọi RPC public cho game: heartbeat_presence() và server_status().
   Không chứa quyền admin, không chứa service_role. */
"use strict";
(function () {
  const cfg = TT.CLOUD || {};
  const enabled = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(String(cfg.url)) && String(cfg.anonKey).length >= 20;
  const bridge = TT.serverBridge = { enabled };
  if (!enabled) return;

  const base = String(cfg.url).replace(/\/+$/, "");
  const SESSION_KEY = "tu_tien_cloud_session";
  const SESSION_ID_KEY = "tu_tien_presence_session";
  const listeners = [];
  let lastStatus = null;
  let windows = [];                  // các đợt bảo trì [bắt đầu_ms, kết thúc_ms | null] đã đổi sang đồng hồ máy này
  const adminCache = { token: null, ok: false };

  function session() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      return s && s.access_token && s.user && s.user.id ? s : null;
    } catch (_) { return null; }
  }

  function sessionId() {
    try {
      let id = localStorage.getItem(SESSION_ID_KEY);
      if (!id) {
        id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padEnd(12, "0");
        localStorage.setItem(SESSION_ID_KEY, id);
      }
      return id;
    } catch (_) {
      return (crypto && crypto.randomUUID) ? crypto.randomUUID() : "00000000-0000-4000-8000-000000000000";
    }
  }

  /** Tài khoản đang đăng nhập có phải admin / owner không (máy chủ xác nhận bằng admin_me; chỉ để quyết định có chuyển sang trang bảo trì hay không, quyền ghi dữ liệu do máy chủ quyết định). */
  async function isAdmin() {
    const s = session();
    if (!s || !s.access_token || (s.expires_at && s.expires_at <= Date.now() / 1000)) { adminCache.token = null; adminCache.ok = false; return false; }
    if (adminCache.token === s.access_token) return adminCache.ok;
    let ok = false;
    try { const r = await rpc("admin_me", {}, s.access_token); ok = !!(r && (r.role === "admin" || r.role === "owner")); } catch (_) { ok = false; }
    adminCache.token = s.access_token; adminCache.ok = ok;
    return ok;
  }

  async function rpc(name, body, token) {
    const res = await fetch(base + "/rest/v1/rpc/" + name, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: cfg.anonKey,
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {})
      },
      body: JSON.stringify(body || {})
    });
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch (_) { data = text; } }
    if (!res.ok) throw new Error((data && (data.message || data.error)) || "server_rpc_failed");
    return data;
  }

  function ensureTicker() {
    let root = document.getElementById("serverTicker");
    if (root) return root;
    root = document.createElement("div");
    root.id = "serverTicker";
    root.className = "server-ticker";

    const label = document.createElement("div");
    label.className = "server-ticker-label";
    label.textContent = "THIÊN ĐẠO";

    const win = document.createElement("div");
    win.className = "server-ticker-window";

    const track = document.createElement("div");
    track.className = "server-ticker-track";
    track.id = "serverTickerTrack";

    win.appendChild(track);
    root.appendChild(label);
    root.appendChild(win);
    document.body.appendChild(root);
    return root;
  }

  function renderTicker(status) {
    if (typeof document === "undefined" || !document.body) return;
    const banner = status && status.banner;
    const root = ensureTicker();
    const track = document.getElementById("serverTickerTrack");

    if (!banner || !banner.body || (status && status.maintenance)) {
      root.className = "server-ticker";
      document.body.classList.remove("server-ticker-active");
      if (track) track.textContent = "";
      return;
    }

    const level = ["info", "warning", "critical"].includes(String(banner.level)) ? String(banner.level) : "info";
    root.className = "server-ticker show " + level;
    document.body.classList.add("server-ticker-active");

    if (track) {
      track.textContent = "";
      if (banner.title) {
        const strong = document.createElement("strong");
        strong.textContent = String(banner.title).slice(0, 80) + " —";
        track.appendChild(strong);
      }
      track.appendChild(document.createTextNode(" " + String(banner.body).slice(0, 500)));
    }
  }

  /** Đang bảo trì và không phải admin / owner: chuyển sang trang bảo trì riêng (maintenance.html), không che lên màn hình game.
      Admin vào game bằng cổng đăng nhập riêng staff.html. Trang bảo trì tự quay về game khi hết bảo trì nên không bị vòng lặp. */
  let leaving = false;
  async function gotoMaintenance() {
    if (leaving) return;
    leaving = true;
    /* Máy chủ cho thêm 60 giây ân hạn ghi dữ liệu sau khi bật bảo trì: lưu nốt tiến trình chưa đồng bộ rồi mới rời game. */
    try {
      const c = TT.cloud;
      if (c && c.enabled && c.syncNow && (!c.dirty || c.dirty())) await Promise.race([Promise.resolve(c.syncNow()).catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    } catch (_) { /* vẫn chuyển trang */ }
    try { location.replace("maintenance.html"); } catch (_) { leaving = false; }
  }

  /** Số mili giây trong khoảng [from, to] (đồng hồ máy này) rơi vào các đợt bảo trì: phần này không tính là người chơi vắng mặt. */
  bridge.maintenanceOverlap = (from, to) => {
    let ms = 0;
    for (const [s, e] of windows) ms += Math.max(0, Math.min(to, e == null ? to : e) - Math.max(from, s));
    return ms;
  };

  bridge.status = async () => {
    try {
      lastStatus = await rpc("server_status", {}, null);
      const skew = +lastStatus.server_ms > 0 ? +lastStatus.server_ms - Date.now() : 0;
      windows = Array.isArray(lastStatus.maintenance_windows)
        ? lastStatus.maintenance_windows.filter(w => Array.isArray(w) && isFinite(+w[0])).map(w => [+w[0] - skew, w[1] == null ? null : +w[1] - skew])
        : [];
      bridge.admin = lastStatus.maintenance ? await isAdmin() : false;
      if (lastStatus.maintenance && !bridge.admin) gotoMaintenance();
      renderTicker(lastStatus.maintenance && bridge.admin ? { ...lastStatus, maintenance: false } : lastStatus);
      listeners.slice().forEach(fn => { try { fn(lastStatus); } catch (_) {} });
      return lastStatus;
    } catch (_) { return lastStatus; }
  };
  bridge.admin = false;
  bridge.loaded = false;
  bridge.current = () => lastStatus;
  bridge.onStatus = fn => { if (typeof fn === "function") listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };

  bridge.heartbeat = async () => {
    if (lastStatus && lastStatus.maintenance && !bridge.admin) return false;
    const s = session();
    if (!s || !s.access_token || (s.expires_at && s.expires_at <= Date.now() / 1000)) return false;
    try {
      await rpc("heartbeat_presence", {
        p_session_id: sessionId(),
        p_client_version: String(TT.VERSION || "web").slice(0, 40),
        p_realm_level: null
      }, s.access_token);
      return true;
    } catch (_) { return false; }
  };

  /* Lần hỏi trạng thái đầu tiên: game chờ (tối đa 4 giây) để biết các đợt bảo trì trước khi tính thời gian vắng mặt. */
  let first = () => {};
  bridge.ready = new Promise(resolve => {
    let done = false;
    const fin = () => { if (!done) { done = true; bridge.loaded = true; resolve(); } };
    first = () => { bridge.status().finally(fin); };
    setTimeout(fin, 4000);
  });

  const start = () => {
    first();
    bridge.heartbeat();
    setInterval(() => { if (document.visibilityState !== "hidden") bridge.heartbeat(); }, 45000);
    setInterval(() => { if (document.visibilityState !== "hidden") bridge.status(); }, 15000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") { bridge.status(); bridge.heartbeat(); }
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
