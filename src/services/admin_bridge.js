/* Cầu nối an toàn giữa game client và Admin Console.
   Chỉ gọi RPC public cho game: update_player_presence() và get_server_status().
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
  let peek = false;                  // quản trị viên bấm "đăng nhập quản trị" để thấy màn hình đăng nhập lúc bảo trì
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

  /** Tài khoản đang đăng nhập có phải admin / owner không (máy chủ xác nhận bằng admin_me; chỉ để ẩn màn hình bảo trì, quyền ghi dữ liệu do máy chủ quyết định). */
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

  function ensureMaintenanceGate() {
    let gate = document.getElementById("serverMaintenanceGate");
    if (gate) return gate;

    gate = document.createElement("div");
    gate.id = "serverMaintenanceGate";
    gate.className = "server-maintenance-gate";

    const card = document.createElement("section");
    card.className = "server-maintenance-card";

    const seal = document.createElement("div");
    seal.className = "server-maintenance-seal";
    seal.textContent = "天";

    const eyebrow = document.createElement("div");
    eyebrow.className = "server-maintenance-eyebrow";
    eyebrow.textContent = "THIÊN VÂN ĐẠI LỤC";

    const title = document.createElement("h1");
    title.textContent = "Thiên Đạo tạm phong bế";

    const reason = document.createElement("p");
    reason.id = "serverMaintenanceReason";
    reason.textContent = "Máy chủ đang bảo trì. Vui lòng quay lại sau.";

    const admin = document.createElement("button");
    admin.type = "button";
    admin.id = "serverMaintenanceAdmin";
    admin.className = "server-maintenance-admin";
    admin.textContent = "Quản trị viên đăng nhập";
    admin.addEventListener("click", () => {
      peek = true; renderMaintenance(lastStatus);
      const wait = setInterval(() => { if (session()) { clearInterval(wait); bridge.status(); } }, 1500);   // đăng nhập xong thì kiểm tra lại vai trò ngay
      setTimeout(() => clearInterval(wait), 600000);
    });

    const note = document.createElement("small");
    note.textContent = "Tiến trình sẽ không được ghi lên máy chủ trong thời gian bảo trì.";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "server-maintenance-retry";
    retry.textContent = "Kiểm tra lại";
    retry.addEventListener("click", async () => {
      retry.disabled = true;
      retry.textContent = "Đang kiểm tra…";
      await bridge.status();
      retry.disabled = false;
      retry.textContent = "Kiểm tra lại";
    });

    card.appendChild(seal);
    card.appendChild(eyebrow);
    card.appendChild(title);
    card.appendChild(reason);
    card.appendChild(note);
    card.appendChild(retry);
    card.appendChild(admin);
    gate.appendChild(card);
    document.body.appendChild(gate);
    return gate;
  }

  /** Quản trị viên vào game lúc bảo trì: màn hình bảo trì ẩn đi. Đang chờ đăng nhập (chưa có phiên) thì cho thấy màn hình đăng nhập. */
  function renderMaintenance(status) {
    if (typeof document === "undefined" || !document.body) return;
    const gate = ensureMaintenanceGate();
    const active = !!(status && status.maintenance) && !bridge.admin && !(peek && !session());
    gate.classList.toggle("show", active);
    document.body.classList.toggle("server-maintenance-active", active);
    const reason = document.getElementById("serverMaintenanceReason");
    if (reason) reason.textContent = active && status.maintenance_reason ? String(status.maintenance_reason).slice(0, 500) : "Máy chủ đang bảo trì. Vui lòng quay lại sau.";
  }

  bridge.status = async () => {
    try {
      lastStatus = await rpc("get_server_status", {}, null);
      bridge.admin = lastStatus.maintenance ? await isAdmin() : false;
      renderMaintenance(lastStatus);
      renderTicker(lastStatus.maintenance && bridge.admin ? { ...lastStatus, maintenance: false } : lastStatus);
      listeners.slice().forEach(fn => { try { fn(lastStatus); } catch (_) {} });
      return lastStatus;
    } catch (_) { return lastStatus; }
  };
  bridge.admin = false;
  bridge.current = () => lastStatus;
  bridge.onStatus = fn => { if (typeof fn === "function") listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };

  bridge.heartbeat = async () => {
    if (lastStatus && lastStatus.maintenance && !bridge.admin) return false;
    const s = session();
    if (!s || !s.access_token || (s.expires_at && s.expires_at <= Date.now() / 1000)) return false;
    try {
      await rpc("update_player_presence", {
        p_session_id: sessionId(),
        p_client_version: String(TT.VERSION || "web").slice(0, 40),
        p_realm_level: null
      }, s.access_token);
      return true;
    } catch (_) { return false; }
  };

  const start = () => {
    bridge.status();
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
