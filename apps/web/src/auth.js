/* Đăng nhập qua Supabase Auth. Web chỉ giữ phiên (access token) để gửi cho Edge Function; không có quyền gì trên dữ liệu game. */
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, configured } from "./config.js";

let client = null;
function supabase() {
  if (!configured()) throw new Error("Thiếu PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY");
  return (client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
}

export function authError(msg) {
  const m = String(msg ?? "").toLowerCase();
  if (m.includes("invalid login")) return "Email hoặc mật khẩu không đúng.";
  if (m.includes("already registered")) return "Email này đã được đăng ký.";
  if (m.includes("password")) return "Mật khẩu quá yếu (cần ít nhất 8 ký tự).";
  if (m.includes("rate limit")) return "Bạn thao tác quá nhanh, hãy thử lại sau ít phút.";
  if (m.includes("not confirmed")) return "Email chưa được xác nhận.";
  return "Không đăng nhập được, vui lòng thử lại.";
}

export function createAuth() {
  const listeners = new Set();
  const a = {
    session: null,
    ready: false,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { for (const fn of [...listeners]) fn(a); },

    async init() {
      if (!configured()) { a.ready = true; a.emit(); return; }
      try {
        const sb = supabase();
        const { data } = await sb.auth.getSession();
        a.session = data.session;
        sb.auth.onAuthStateChange((_event, s) => { a.session = s; a.emit(); });
      } catch { a.session = null; }
      a.ready = true;
      a.emit();
    },

    /** Token cho Edge Function; null nếu chưa đăng nhập. */
    token: async () => (await supabase().auth.getSession()).data.session?.access_token ?? null,

    /** Trả về thông báo lỗi tiếng Việt, hoặc null nếu thành công. */
    async signIn(email, password) {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      return error ? authError(error.message) : null;
    },
    async signUp(email, password) {
      const { data, error } = await supabase().auth.signUp({ email, password });
      if (error) return authError(error.message);
      return data.session ? null : "Đã gửi email xác nhận. Hãy mở hộp thư rồi đăng nhập.";
    },
    async signOut() { await supabase().auth.signOut(); },
  };
  return a;
}
