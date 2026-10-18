import type { Session } from "@supabase/supabase-js";
import { configured, supabase } from "./supabase";

class AuthStore {
  session = $state<Session | null>(null);
  ready = $state(false);

  async init(): Promise<void> {
    if (!configured()) { this.ready = true; return; }
    const sb = supabase();
    const { data } = await sb.auth.getSession();
    this.session = data.session;
    sb.auth.onAuthStateChange((_e, s) => { this.session = s; });
    this.ready = true;
  }
  token = async (): Promise<string | null> => (await supabase().auth.getSession()).data.session?.access_token ?? null;

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    return error ? authError(error.message) : null;
  }
  async signUp(email: string, password: string): Promise<string | null> {
    const { data, error } = await supabase().auth.signUp({ email, password });
    if (error) return authError(error.message);
    return data.session ? null : "Đã gửi email xác nhận. Hãy mở hộp thư rồi đăng nhập.";
  }
  async signOut(): Promise<void> { await supabase().auth.signOut(); }
}

function authError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email hoặc mật khẩu không đúng.";
  if (m.includes("already registered")) return "Email này đã được đăng ký.";
  if (m.includes("password")) return "Mật khẩu quá yếu (cần ít nhất 8 ký tự).";
  if (m.includes("rate limit")) return "Bạn thao tác quá nhanh, hãy thử lại sau ít phút.";
  if (m.includes("not confirmed")) return "Email chưa được xác nhận.";
  return "Không đăng nhập được, vui lòng thử lại.";
}

export const auth = new AuthStore();
