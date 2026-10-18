import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/public";

/** Chỉ dùng khóa công khai (anon/publishable). service_role không bao giờ có mặt ở web. */
export const configured = (): boolean => /^https?:\/\//.test(env.PUBLIC_SUPABASE_URL ?? "") && (env.PUBLIC_SUPABASE_ANON_KEY ?? "").length > 20;

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!configured()) throw new Error("Thiếu PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY");
  return (client ??= createClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!));
}
export const functionUrl = (): string => env.PUBLIC_SUPABASE_URL!.replace(/\/+$/, "") + "/functions/v1/api";
