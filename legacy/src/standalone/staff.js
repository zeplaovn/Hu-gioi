/* Cổng quản trị viên (staff.html): endpoint riêng để admin / owner đăng nhập và vào game khi đang bảo trì.
   Đăng nhập bằng email + mật khẩu Supabase; chỉ lưu phiên (cùng khóa với game) SAU KHI máy chủ xác nhận admin_me là admin/owner.
   Người không có quyền: không lưu gì. Quyền ghi dữ liệu lúc bảo trì vẫn do máy chủ quyết định (private.maintenance_active). */
"use strict";
(function () {
  const SESSION = "tu_tien_cloud_session", $ = id => document.getElementById(id);
  const form = $("form"), email = $("email"), pass = $("pass"), go = $("go"), msg = $("msg"), capBox = $("captcha");
  let capToken = "", capWidget = null;
  const say = (t, bad) => { msg.textContent = t || ""; msg.className = bad ? "bad" : ""; };
  const errText = e => {
    const c = String((e && e.code) || ""), m = String((e && e.message) || "").toLowerCase();
    if (e && e.net) return "Không kết nối được máy chủ.";
    if (c === "invalid_credentials" || m.includes("invalid login")) return "Email hoặc mật khẩu không đúng.";
    if (c === "captcha_failed" || m.includes("captcha")) return "Xác minh hCaptcha không thành công, hãy thử lại.";
    if (e && e.status === 429) return "Thao tác quá nhanh, hãy thử lại sau ít phút.";
    return "Không đăng nhập được.";
  };

  const HC_URL = "https://js.hcaptcha.com/1/api.js?render=explicit";
  const hcHost = u => { try { const x = new URL(u, location.href); return x.protocol === "https:" && (x.hostname === "hcaptcha.com" || x.hostname.endsWith(".hcaptcha.com")); } catch (e) { return false; } };
  function loadHcaptcha() {
    return new Promise((resolve, reject) => {
      const tt = window.trustedTypes; let url = HC_URL;
      if (tt && tt.createPolicy) {
        if (!tt.defaultPolicy) { try { tt.createPolicy("default", { createScriptURL: u => { if (hcHost(u)) return u; throw new TypeError("Script URL không được phép"); }, createHTML: () => { throw new TypeError("HTML không được phép"); }, createScript: () => { throw new TypeError("Script không được phép"); } }); } catch (e) { /* đã có */ } }
        try { url = tt.createPolicy("tvdl-hcaptcha-staff", { createScriptURL: u => (u === HC_URL ? u : (() => { throw new TypeError("URL không được phép"); })()) }).createScriptURL(HC_URL); } catch (e) { /* fallback */ }
      }
      const s = document.createElement("script"); s.src = url; s.async = true;
      s.onload = () => { const t0 = Date.now(), wait = () => (window.hcaptcha && window.hcaptcha.render ? resolve() : Date.now() - t0 > 10000 ? reject({}) : setTimeout(wait, 100)); wait(); };
      s.onerror = () => reject({ net: true });
      document.head.appendChild(s);
    });
  }
  if (TT.sb.hcaptcha) {
    capBox.hidden = false;
    loadHcaptcha().then(() => { capWidget = window.hcaptcha.render(capBox, { sitekey: TT.sb.hcaptcha, theme: "dark", callback: t => { capToken = String(t || ""); }, "expired-callback": () => { capToken = ""; }, "error-callback": () => { capToken = ""; say("hCaptcha gặp lỗi, hãy tải lại trang.", true); } }); }).catch(() => say("Không tải được hCaptcha.", true));
  }
  const capReset = () => { capToken = ""; try { if (capWidget !== null) window.hcaptcha.reset(capWidget); } catch (e) { /* bỏ qua */ } };

  if (!TT.sb.ok) { say("Máy chủ chưa được cấu hình.", true); go.disabled = true; }
  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const em = email.value.trim(), pw = pass.value;
    if (!em || !pw) return say("Nhập email và mật khẩu.", true);
    if (TT.sb.hcaptcha && !capToken) return say("Hãy tích ô xác minh hCaptcha trước.", true);
    go.disabled = true; say("Đang đăng nhập…");
    try {
      const d = await TT.sb.auth("/auth/v1/token?grant_type=password", { email: em, password: pw, ...(capToken ? { gotrue_meta_security: { captcha_token: capToken } } : {}) });
      if (!d || !d.access_token || !d.refresh_token || !d.user || !d.user.id) throw { message: "bad" };
      let role = "";
      try { const r = await TT.sb.rpc("admin_me", {}, d.access_token); role = r && r.role ? String(r.role) : ""; } catch (e) { role = ""; }
      if (role !== "admin" && role !== "owner") {
        pass.value = ""; capReset(); return say("Tài khoản này không có quyền quản trị.", true);
      }
      localStorage.setItem(SESSION, JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: +d.expires_at || Math.floor(Date.now() / 1000) + (+d.expires_in || 3600), user: { id: String(d.user.id), email: String(d.user.email || "") } }));
      say("Xác nhận quyền quản trị, đang vào game…"); location.replace("./");
    } catch (e) { pass.value = ""; capReset(); say(errText(e), true); }
    finally { go.disabled = false; }
  });
})();
