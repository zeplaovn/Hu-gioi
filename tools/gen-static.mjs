#!/usr/bin/env node
/* Sinh dữ liệu tĩnh từ data/*.csv + data/balance_config.json:
 *   - supabase/migrations/20261020080000_design_v161_data.sql  (nguồn cho hàm pgSQL)
 *   - packages/game-core/src/data.generated.ts               (nguồn cho web/test)
 * Dùng --check để CI báo lỗi nếu file đã commit không khớp với CSV. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

import { parseCsv } from "./csv.mjs";

const csv = f => parseCsv(readFileSync(resolve(root, "data", f), "utf8"));
const cfg = JSON.parse(readFileSync(resolve(root, "data/balance_config.json"), "utf8"));

/* ---------- stages ---------- */
const prog = csv(cfg.progression_table), tho = csv("tho_nguyen.csv");
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

const xpRows = csv("xp_thresholds_45_days.csv");
const tierSeconds = stages.map(s => Array.from({ length: 9 }, (_, i) => {
  const rows = xpRows.filter(r => r.stage_id === s.stage_id && +r.tier === i + 1);
  if (rows.length !== 1 || !(+rows[0].xp_required > 0) || !(+rows[0].xp_per_effective_hour > 0)) throw new Error("XP thiếu/trùng/sai: " + s.stage_id);
  return +rows[0].xp_required / +rows[0].xp_per_effective_hour * 3600;
}));
if (xpRows.length !== 135) throw new Error("cần 135 mốc XP");

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
  design_version: "1.6.1",
  tier_seconds: tierSeconds,
  progression_reference: cfg.progression_reference,
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
-- Forward-only upgrade. Historical migrations stay immutable.
-- Preserve stage/tier, fraction of lifespan used, wallet, TM and fraction of current tier.
lock table game.lives in share row exclusive mode;
-- v1.3 used integral days; v1.6.1 has fractional day/year milestones.
alter table game.stages
  alter column day_start type numeric(10,4),
  alter column day_end type numeric(10,4),
  alter column clean_consumed_years type numeric(12,4);
create temporary table v161_progress on commit drop as
select life_id, least(1.0, greatest(0.0, progress_s / nullif(game.tang_seconds(stage_idx), 0))) fraction,
       credited_s / nullif(game.lifespan_cap(stage_idx)::double precision, 0) age_per_cap
from game.lives where status = 'alive';

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
${Object.entries(rules).filter(([k]) => !["time_scale", "hazard_scale"].includes(k)).map(([k, v]) => `  (${q(k)}, ${q(JSON.stringify(v))}::jsonb)`).join(",\n")}
on conflict (key) do update set value = excluded.value;

create or replace function game.tang_seconds(p_stage smallint, p_tang smallint) returns double precision
language sql stable set search_path = '' as $$
  select (game.rule('tier_seconds')->p_stage::int->>(p_tang::int - 1))::double precision
$$;
-- Retained compatibility wrapper for internal callers that request the final tier.
create or replace function game.tang_seconds(p_stage smallint) returns double precision
language sql stable set search_path = '' as $$
  select game.tang_seconds(p_stage, 9::smallint)
$$;
update game.lives l set progress_s = p.fraction * game.tang_seconds(l.stage_idx, l.tang),
  credited_s = p.age_per_cap * game.lifespan_cap(l.stage_idx)
from v161_progress p where p.life_id = l.life_id;
update game.breakthrough_intents set consumed_at = now(), outcome = 'superseded' where consumed_at is null;
revoke all on function game.tang_seconds(smallint, smallint) from public, anon, authenticated;
grant execute on function game.tang_seconds(smallint, smallint) to service_role;
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
  [resolve(root, "supabase/migrations/20261020080000_design_v161_data.sql"), "begin;\n" + sql + "\ncommit;\n"],
  [resolve(root, "packages/game-core/src/data.generated.ts"), ts],
];
let bad = 0;
for (const [f, content] of outs) {
  if (check) {
    if (!existsSync(f) || readFileSync(f, "utf8") !== content) { console.error("LỆCH: " + f + " — chạy `pnpm gen`"); bad++; }
  } else writeFileSync(f, content);
}
if (check) { if (bad) process.exit(1); console.log("gen:check OK"); } else console.log("đã sinh", outs.length, "file");
