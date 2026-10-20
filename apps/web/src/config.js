import assetPaths from "./asset-paths.generated.js";
/* Cấu hình công khai: chỉ URL + khóa anon/publishable. service_role không bao giờ có mặt ở web.
   Vite nhúng các biến PUBLIC_* vào bản build, nên đổi giá trị trên Vercel phải Redeploy. */
const env = import.meta.env ?? {};

export const SUPABASE_URL = String(env.PUBLIC_SUPABASE_URL ?? "");
export const SUPABASE_ANON_KEY = String(env.PUBLIC_SUPABASE_ANON_KEY ?? "");

export const configured = () => /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
export const functionUrl = () => SUPABASE_URL.replace(/\/+$/, "") + "/functions/v1/api";
export const assetBase = () => String(env.BASE_URL ?? "/").replace(/\/+$/, "") + "/assets";

export function resolveAssetUrl(src) {
  const base = assetBase() + "/";
  if (typeof src !== "string" || !src.startsWith(base)) return src;
  return base + (assetPaths[src.slice(base.length)] ?? src.slice(base.length));
}
