import { buildApp } from "./app.js";
import { SupabaseAuthVerifier } from "./auth.js";
import { SupabaseGameStateRepository } from "./state.js";

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";
const url = String(process.env.SUPABASE_URL || "");
const anonKey = String(process.env.SUPABASE_ANON_KEY || "");

if (!url || !anonKey) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required for the authoritative server");

const app = buildApp({
  auth: new SupabaseAuthVerifier(url, anonKey),
  state: new SupabaseGameStateRepository(url, anonKey),
});

app.listen({ port, host }).catch(error => {
  app.log.error(error);
  process.exitCode = 1;
});
