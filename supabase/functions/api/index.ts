// Entry của Supabase Edge Function `api` (Deno). Logic nằm ở handler.ts để test được ngoài Deno.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handle, type Deps } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// service_role key chỉ tồn tại ở đây (server), không bao giờ gửi xuống trình duyệt.
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const deps: Deps = {
  async getUserId(token) {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  },
  async rpc(fn, args) {
    const { data, error } = await admin.schema("game").rpc(fn, args);
    return { data, error: error ? { code: error.code, message: error.message } : null };
  },
  allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim()).filter(Boolean),
};

Deno.serve((req) => handle(req, deps));
