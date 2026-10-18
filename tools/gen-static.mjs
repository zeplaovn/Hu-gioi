#!/usr/bin/env node
/* Sinh dữ liệu tĩnh từ data/*.csv + data/balance_config.json:
 *   - supabase/migrations/20261018100100_v2_static_data.sql  (nguồn cho hàm pgSQL)
 *   - packages/game-core/src/data.generated.ts               (nguồn cho web/test)
 * Dùng --check để CI báo lỗi nếu file đã commit không khớp với CSV. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(x => x !== ""));
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}
const csv = f => parseCsv(readFileSync(resolve(root, "data", f), "utf8"));
const cfg = JSON.parse(readFileSync(resolve(root, "data/balance_config.json"), "utf8"));

/* ---------- stages ---------- */
const prog = csv("progression_60_days.csv"), tho = csv("tho_nguyen.csv");
const stages = prog.map((p, idx) => {
  const t = tho.find(x => x.stage_id === p.stage_id);
  const pd = cfg.death_hazard_assumptions.stage_pdeath_at_tang9[p.stage_id];
  if (!t || pd === undefined) throw new Error("thiếu dữ liệu cho " + p.stage_id);
  return {
    idx, stage_id: p.stage_id, name: p.stage, world: p.world,
    day_start: +p.day_start, day_end: +p.day_end,
    lifespan_cap_after: +t.allowance_years, clean_consumed_years: +t.clean_consumed_years,
    p_death_tang9: pd,
  };
});
if (stages.length !== 15) throw new Error("cần 15 giai đoạn");

/* ---------- Thiên Mệnh Các ---------- */
const STAT_KEYS = { "Tướng Mạo": "TuongMao", "Phúc Duyên": "PhucDuyen", "Căn Cốt": "CanCot", "Ngộ Tính": "NgoTinh", "Vận Khí": "VanKhi" };
const catalog = csv("thien_menh_cac.csv").map(r => {
  if (r.type === "Permanent Stat") {
    const m = r.cost.match(/^(\d+)\s*\+\s*(\d+)×level$/);
    const key = Object.entries(STAT_KEYS).find(([k]) => r.name.includes(k))?.[1];
    if (!m || !key) throw new Error("không đọc được " + r.id);
    return { id: r.id, name: r.name, kind: "stat", stat_key: key, base_cost: +m[1], step_cost: +m[2], level_cap: +r.limit, cost: null, per_life_limit: null, effect: r.effect };
  }
  const lim = r.limit.match(/^(\d+)/);
  if (!lim) throw new Error("không đọc được limit " + r.id);
  return { id: r.id, name: r.name, kind: "item", stat_key: null, base_cost: null, step_cost: null, level_cap: null, cost: +r.cost, per_life_limit: +lim[1], effect: r.effect };
});

/* ---------- rules ---------- */
const rules = {
  offline: { full_hours: cfg.offline.full_hours, mid_efficiency: cfg.offline.hours_8_16_efficiency, low_efficiency: cfg.offline.hours_16_24_efficiency, cap_hours: cfg.offline.cap_hours },
  tang_per_stage: cfg.heaven_mandate.tang_per_realm,
  tho_nguyen: { start_years: cfg.tho_nguyen.start_years, use_years_per_credited_day: cfg.tho_nguyen.use_years_per_credited_day },
  // Hệ số lấy từ simulator v1.3 (giả định thiết kế, chưa đo): tốc độ và giảm rủi ro theo cấp Quán Đỉnh.
  stat_effects: {
    CanCot: { speed: 0.002, risk: 0.010 }, NgoTinh: { speed: 0.004, risk: 0 }, VanKhi: { speed: 0, risk: 0.005 },
    TuongMao: { speed: 0, risk: 0 }, PhucDuyen: { speed: 0, risk: 0 },
  },
  speed_cap: cfg.guardrails.speed_cap,
  risk_floor: cfg.guardrails.risk_floor,
  hazard_scale: 1.0,
  time_scale: 1.0,
  intent_ttl_s: 120,
};

/* ---------- SQL ---------- */
const q = s => s === null || s === undefined ? "null" : typeof s === "number" ? String(s) : "'" + String(s).replace(/'/g, "''") + "'";
let sql = `-- SINH TỰ ĐỘNG bởi tools/gen-static.mjs từ data/*.csv. KHÔNG sửa tay; sửa CSV rồi chạy \`pnpm gen\`.
-- Dữ liệu đã apply lên database thật thì thay đổi bằng migration mới (upsert), không sửa file này.

insert into game.stages (idx, stage_id, name, world, day_start, day_end, lifespan_cap_after, clean_consumed_years, p_death_tang9) values
${stages.map(s => `  (${s.idx}, ${q(s.stage_id)}, ${q(s.name)}, ${q(s.world)}, ${s.day_start}, ${s.day_end}, ${s.lifespan_cap_after}, ${s.clean_consumed_years}, ${s.p_death_tang9})`).join(",\n")}
on conflict (idx) do update set stage_id = excluded.stage_id, name = excluded.name, world = excluded.world,
  day_start = excluded.day_start, day_end = excluded.day_end, lifespan_cap_after = excluded.lifespan_cap_after,
  clean_consumed_years = excluded.clean_consumed_years, p_death_tang9 = excluded.p_death_tang9;

insert into game.tm_catalog (id, name, kind, stat_key, base_cost, step_cost, level_cap, cost, per_life_limit, effect) values
${catalog.map(c => `  (${[c.id, c.name, c.kind, c.stat_key, c.base_cost, c.step_cost, c.level_cap, c.cost, c.per_life_limit, c.effect].map(q).join(", ")})`).join(",\n")}
on conflict (id) do update set name = excluded.name, kind = excluded.kind, stat_key = excluded.stat_key, base_cost = excluded.base_cost,
  step_cost = excluded.step_cost, level_cap = excluded.level_cap, cost = excluded.cost, per_life_limit = excluded.per_life_limit, effect = excluded.effect;

insert into game.rules (key, value) values
${Object.entries(rules).map(([k, v]) => `  (${q(k)}, ${q(JSON.stringify(v))}::jsonb)`).join(",\n")}
on conflict (key) do update set value = excluded.value;
`;

/* ---------- TS ---------- */
const ts = `// SINH TỰ ĐỘNG bởi tools/gen-static.mjs từ data/*.csv. KHÔNG sửa tay.
export interface Stage { idx: number; stage_id: string; name: string; world: "Hạ Giới" | "Linh Giới" | "Tiên Giới"; day_start: number; day_end: number; lifespan_cap_after: number; clean_consumed_years: number; p_death_tang9: number }
export interface CatalogEntry { id: string; name: string; kind: "stat" | "item"; stat_key: string | null; base_cost: number | null; step_cost: number | null; level_cap: number | null; cost: number | null; per_life_limit: number | null; effect: string }
export const STAGES: readonly Stage[] = ${JSON.stringify(stages, null, 2)} as const;
export const TM_CATALOG: readonly CatalogEntry[] = ${JSON.stringify(catalog, null, 2)} as const;
export const RULES = ${JSON.stringify(rules, null, 2)} as const;
`;

const outs = [
  [resolve(root, "supabase/migrations/20261018100100_v2_static_data.sql"), sql],
  [resolve(root, "packages/game-core/src/data.generated.ts"), ts],
];
let bad = 0;
for (const [f, content] of outs) {
  if (check) {
    if (!existsSync(f) || readFileSync(f, "utf8") !== content) { console.error("LỆCH: " + f + " — chạy `pnpm gen`"); bad++; }
  } else writeFileSync(f, content);
}
if (check) { if (bad) process.exit(1); console.log("gen:check OK"); } else console.log("đã sinh", outs.length, "file");
