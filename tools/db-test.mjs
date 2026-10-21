#!/usr/bin/env node
/* Chạy test database trên Postgres thật.
 *  - Nếu có DATABASE_URL (CI / Supabase local): dùng luôn, database phải TRỐNG và dùng được cho test.
 *  - Nếu không: tự khởi động một Postgres 16 tạm (initdb) ở $HU_PG_DIR, không cần Docker.
 * Thứ tự: stub Supabase → supabase/migrations/*.sql → supabase/tests/*.test.sql → (tuỳ chọn) vitest parity. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, chownSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.HU_PG_PORT || "54329";
const asRoot = process.getuid?.() === 0;
const pgBin = (() => {
  for (const d of ["/usr/lib/postgresql/16/bin", "/usr/lib/postgresql/17/bin", "/usr/lib/postgresql/15/bin", "/usr/local/pgsql/bin"]) if (existsSync(join(d, "initdb"))) return d;
  return "";
})();
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: "inherit", encoding: "utf8", ...opts });
const asPg = (cmd, args, opts = {}) => asRoot ? sh("runuser", ["-u", "postgres", "--", cmd, ...args], opts) : sh(cmd, args, opts);

let url = process.env.DATABASE_URL, started = false, dataDir;
if (!url) {
  if (!pgBin) { console.error("Không tìm thấy Postgres (initdb). Cài postgresql hoặc đặt DATABASE_URL."); process.exit(2); }
  dataDir = process.env.HU_PG_DIR || join(tmpdir(), "hu-gioi-pg");
  mkdirSync(dataDir, { recursive: true });
  if (asRoot) { sh("chown", ["-R", "postgres:postgres", dataDir]); sh("chmod", ["750", dataDir]); }
  if (!existsSync(join(dataDir, "PG_VERSION"))) {
    const r = asPg(join(pgBin, "initdb"), ["-D", dataDir, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C.UTF-8"], { stdio: "ignore" });
    if (r.status !== 0) { console.error("initdb thất bại"); process.exit(2); }
  }
  const st = asPg(join(pgBin, "pg_ctl"), ["-D", dataDir, "status"], { stdio: "ignore" });
  if (st.status !== 0) {
    const r = asPg(join(pgBin, "pg_ctl"), ["-D", dataDir, "-o", `-p ${PORT} -k ${dataDir} -c listen_addresses=127.0.0.1`, "-l", join(dataDir, "log.txt"), "-w", "start"], { stdio: "ignore" });
    if (r.status !== 0) { console.error("pg_ctl start thất bại, xem " + join(dataDir, "log.txt")); process.exit(2); }
    started = true;
  }
  const admin = `postgresql://postgres@127.0.0.1:${PORT}/postgres`;
  const q = sql => spawnSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql], { encoding: "utf8" });
  q("drop database if exists hu_gioi_test with (force)");
  const c = q("create database hu_gioi_test");
  if (c.status !== 0) { console.error(c.stderr); process.exit(2); }
  url = `postgresql://postgres@127.0.0.1:${PORT}/hu_gioi_test`;
}

const psqlFile = f => spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-q", "-f", f], { encoding: "utf8" });
let failed = 0;
const run = (label, f) => {
  const r = psqlFile(f);
  const ok = r.status === 0;
  console.log((ok ? "  ok   " : "  FAIL ") + label);
  if (!ok) { failed++; console.log((r.stderr || "").split("\n").map(l => "       " + l).join("\n")); }
  return ok;
};

console.log("Áp dụng schema:");
const steps = [["stub supabase", join(root, "supabase/tests/_stub_supabase.sql")]];
for (const f of readdirSync(join(root, "supabase/migrations")).filter(f => f.endsWith(".sql")).sort()) steps.push([f, join(root, "supabase/migrations", f)]);
const current = steps.filter(([n]) => n.startsWith("202610211"));
const legacy = steps.filter(([n]) => !n.startsWith("202610211"));
let schemaOk = true;
for (const [l, f] of legacy) if (!run(l, f)) { schemaOk = false; break; }

if (schemaOk) {
  console.log("Test SQL:");
  for (const f of readdirSync(join(root, "supabase/tests")).filter(f => f.endsWith(".test.sql") && !/^0[7-9]_/.test(f)).sort()) run(f, join(root, "supabase/tests", f));
  if (!process.argv.includes("--sql-only")) {
    const r = sh("pnpm", ["exec", "vitest", "run", "tests/edge/handler.db.test.ts"], { cwd: root, env: { ...process.env, DATABASE_URL: url } });
    if (r.status !== 0) failed++;
  }
  console.log("Upgrade v2.1:");
  for (const [l,f] of current) if (!run(l,f)) { schemaOk=false; break; }
  if (schemaOk) for (const f of readdirSync(join(root,"supabase/tests")).filter(f => /^0[7-9]_.*\.test\.sql$/.test(f)).sort()) run(f,join(root,"supabase/tests",f));
  if (existsSync(join(root, "packages/game-core/package.json")) && !process.argv.includes("--sql-only")) {
    console.log("Test parity (game-core ↔ SQL):");
    const r = sh("pnpm", ["--filter", "@hu-gioi/game-core", "exec", "vitest", "run", "test/parity.test.ts"], { cwd: root, env: { ...process.env, DATABASE_URL: url } });
    if (r.status !== 0) failed++;

    if (schemaOk) { const r3=sh("pnpm",["exec","vitest","run","tests/edge/play.db.test.ts"],{cwd:root,env:{...process.env,DATABASE_URL:url}});if(r3.status!==0)failed++; }
  }
}
if (started && !process.env.HU_PG_KEEP) asPg(join(pgBin, "pg_ctl"), ["-D", dataDir, "-m", "fast", "stop"], { stdio: "ignore" });
console.log(failed ? `\n${failed} bước thất bại` : "\nTất cả test DB đạt");
process.exit(failed ? 1 : 0);

