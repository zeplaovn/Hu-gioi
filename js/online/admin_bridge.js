/* Cầu nối an toàn giữa game client và Admin Console.
   Chỉ gọi hai RPC công khai cho game: heartbeat_presence() và server_status().
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

  bridge.status = async () => {
    try {
      lastStatus = await rpc("server_status", {}, null);
      listeners.slice().forEach(fn => { try { fn(lastStatus); } catch (_) {} });
      return lastStatus;
    } catch (_) { return lastStatus; }
  };
  bridge.current = () => lastStatus;
  bridge.onStatus = fn => { if (typeof fn === "function") listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };

  bridge.heartbeat = async () => {
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

  bridge.status();
  bridge.heartbeat();
  setInterval(() => { if (document.visibilityState !== "hidden") bridge.heartbeat(); }, 45000);
  setInterval(() => { if (document.visibilityState !== "hidden") bridge.status(); }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { bridge.status(); bridge.heartbeat(); }
  });
})();
