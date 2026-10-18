/* Khởi tạo tối thiểu cho các trang độc lập (maintenance.html, staff.html): không nạp mã game, chỉ cần cấu hình Supabase (config.js). */
"use strict";
TT.sb = (function () {
  const cfg = TT.CLOUD || {};
  const ok = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(String(cfg.url)) && String(cfg.anonKey).length >= 20;
  const base = String(cfg.url).replace(/\/+$/, "");
  async function call(path, { body, token } = {}) {
    let res;
    try {
      res = await fetch(base + path, { method: "POST", cache: "no-store", headers: { apikey: cfg.anonKey, "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body || {}) });
    } catch (e) { throw { net: true, message: "network" }; }
    const text = await res.text(); let data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = { message: text.slice(0, 200) }; } }
    if (!res.ok) throw { status: res.status, code: (data && (data.error_code || data.code)) || "", message: String((data && (data.msg || data.message || data.error_description || data.error)) || "") };
    return data;
  }
  return { ok, hcaptcha: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(cfg.hcaptcha)) ? String(cfg.hcaptcha) : "", rpc: (name, body, token) => call("/rest/v1/rpc/" + name, { body, token }), auth: (path, body) => call(path, { body }) };
})();
