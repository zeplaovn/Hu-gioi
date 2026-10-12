// Máy chủ Supabase giả (chỉ phần game dùng) để kiểm thử và phát triển cục bộ, không cần dự án thật.
//   node tools/mock_supabase.mjs            -> http://localhost:54321
// Hành vi bám sát supabase/migrations (rev, conflict, too_fast, kích thước...) và API Auth thật (mã lỗi, refresh token xoay vòng).
import http from "node:http"; import crypto from "node:crypto";

export function createMock({ port = 0, anonKey = "test-anon-key-0123456789", ttl = 3600, confirmEmail = false } = {}) {
  const users = new Map(), tokens = new Map(), refresh = new Map(), rows = new Map();
  const state = { users, rows, tokens, refresh, ttl, confirmEmail, calls: [], failNext: 0, minGapMs: 1000 };
  const rid = () => crypto.randomBytes(16).toString("hex");
  const issue = u => {
    const access = "at_" + rid(), rt = "rt_" + rid(), exp = Math.floor(Date.now() / 1000) + state.ttl;
    tokens.set(access, { uid: u.id, exp }); refresh.set(rt, u.id);
    return { access_token: access, refresh_token: rt, token_type: "bearer", expires_in: state.ttl, expires_at: exp, user: { id: u.id, email: u.email } };
  };
  const send = (res, code, body, extra = {}) => { res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...extra }); res.end(body === undefined ? "" : JSON.stringify(body)); };
  const authUser = req => { const t = tokens.get(String(req.headers.authorization || "").replace(/^Bearer /, "")); return t && t.exp > Date.now() / 1000 ? t.uid : null; };

  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info, prefer", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }); return res.end(); }
    let raw = ""; req.on("data", c => (raw += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x"), path = url.pathname; let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return send(res, 400, { message: "bad json" }); }
      state.calls.push(`${req.method} ${path}${url.search}`);
      if (state.failNext > 0) { state.failNext--; return send(res, 500, { message: "boom" }); }
      if (req.headers.apikey !== anonKey) return send(res, 401, { message: "Invalid API key" });

      if (path === "/auth/v1/signup" && req.method === "POST") {
        const email = String(body.email || "").toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 422, { error_code: "validation_failed", msg: "Unable to validate email address: invalid format" });
        if (String(body.password || "").length < 8) return send(res, 422, { error_code: "weak_password", msg: "Password should be at least 8 characters." });
        if (users.has(email)) return state.confirmEmail ? send(res, 200, { id: rid(), email, identities: [] }) : send(res, 422, { error_code: "user_already_exists", msg: "User already registered" });
        const u = { id: crypto.randomUUID(), email, password: body.password, confirmed: !state.confirmEmail }; users.set(email, u);
        return u.confirmed ? send(res, 200, issue(u)) : send(res, 200, { id: u.id, email, identities: [{}] });
      }
      if (path === "/auth/v1/token" && req.method === "POST") {
        const grant = url.searchParams.get("grant_type");
        if (grant === "password") {
          const u = users.get(String(body.email || "").toLowerCase());
          if (!u || u.password !== body.password) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
          if (!u.confirmed) return send(res, 400, { code: 400, error_code: "email_not_confirmed", msg: "Email not confirmed" });
          return send(res, 200, issue(u));
        }
        if (grant === "refresh_token") {
          const uid = refresh.get(body.refresh_token);
          if (!uid) return send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" });
          refresh.delete(body.refresh_token);                  // xoay vòng: refresh token chỉ dùng được một lần
          return send(res, 200, issue([...users.values()].find(x => x.id === uid)));
        }
        return send(res, 400, { msg: "unsupported grant_type" });
      }
      if (path === "/auth/v1/logout" && req.method === "POST") { const uid = authUser(req); if (uid) for (const [k, v] of refresh) if (v === uid) refresh.delete(k); return send(res, 204); }
      if (path === "/auth/v1/recover" && req.method === "POST") return send(res, 200, {});

      const uid = authUser(req);
      if (path.startsWith("/rest/v1/")) {
        if (!uid) return send(res, 401, { code: "PGRST301", message: "JWT expired" });
        if (path === "/rest/v1/player_saves" && req.method === "GET") { const r = rows.get(uid); return send(res, 200, r ? [{ save: r.save, meta: r.meta, rev: r.rev, updated_at: r.updated_at }] : []); }
        if (path === "/rest/v1/rpc/delete_account" && req.method === "POST") {
          rows.delete(uid); for (const [k, v] of refresh) if (v === uid) refresh.delete(k);
          for (const [k, u] of users) if (u.id === uid) users.delete(k);
          for (const [k, v] of tokens) if (v.uid === uid) tokens.delete(k);
          return send(res, 204);
        }
        if (path === "/rest/v1/rpc/save_game" && req.method === "POST") {
          const fail = m => send(res, 400, { code: "P0001", message: m, details: null, hint: null });
          const { p_save, p_meta, p_rev, p_force } = body, isObj = v => v && typeof v === "object" && !Array.isArray(v);
          if (!isObj(p_meta)) return fail("bad_meta");
          if (p_save != null && !isObj(p_save)) return fail("bad_save");
          if (JSON.stringify(p_save ?? "").length > 262144 || JSON.stringify(p_meta).length > 262144) return fail("too_large");
          if (isObj(p_save) && isObj(p_save.player)) { const q = p_save.player, n = k => typeof q[k] === "number"; if (!(n("realm") && n("tang") && n("months") && n("age") && n("lifespan") && q.realm >= 0 && q.realm <= 8 && q.tang >= 1 && q.tang <= 9 && q.months >= q.realm * 9 + q.tang - 1 && q.age >= 1 && q.age <= 20000 && q.lifespan >= 1 && q.lifespan <= 20000)) return fail("implausible"); }
          if (!Number.isInteger(p_rev) || p_rev < 0) return fail("bad_rev");
          const cur = rows.get(uid), now = Date.now();
          if (!cur) { if (p_rev !== 0 && !p_force) return fail("conflict"); const r = { save: p_save ?? null, meta: p_meta, rev: 1, updated_at: new Date(now).toISOString(), at: now }; rows.set(uid, r); return send(res, 200, { rev: 1, updated_at: r.updated_at }); }
          if (cur.rev !== p_rev && !p_force) return fail("conflict");
          if (now - cur.at < state.minGapMs && !p_force) return fail("too_fast");
          Object.assign(cur, { save: p_save ?? null, meta: p_meta, rev: cur.rev + 1, updated_at: new Date(now).toISOString(), at: now });
          return send(res, 200, { rev: cur.rev, updated_at: cur.updated_at });
        }
      }
      send(res, 404, { message: "not found" });
    });
  });
  const ready = new Promise(r => server.listen(port, "127.0.0.1", () => r(server.address().port)));
  return { state, anonKey, ready, close: () => new Promise(r => { server.closeAllConnections?.(); server.close(r); }), confirm: email => { users.get(email.toLowerCase()).confirmed = true; } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = createMock({ port: +process.env.PORT || 54321, anonKey: process.env.ANON_KEY || "local-dev-anon-key-0123456789", confirmEmail: process.env.CONFIRM_EMAIL === "1" });
  m.ready.then(p => console.log(`Supabase giả: http://localhost:${p}  (anon key: ${m.anonKey})`));
}
