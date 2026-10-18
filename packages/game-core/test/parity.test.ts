/* Đối chiếu công thức TypeScript với hàm pgSQL trên Postgres thật. Cần DATABASE_URL (tools/db-test.mjs tự đặt). */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STAGES, STAT_KEYS, creditSeconds, deathProb, lifespanCap, multipliers, statCost, tangSeconds, type StatKey } from "../src/index.ts";

const url = process.env.DATABASE_URL;
describe.skipIf(!url)("parity TS ↔ SQL", () => {
  const sql = postgres(url ?? "postgresql://invalid", { max: 1, onnotice: () => {} });
  const users: string[] = [];
  const newUser = async () => { const [r] = await sql`insert into auth.users (id) values (gen_random_uuid()) returning id`; users.push(r!.id); return r!.id as string; };
  afterAll(async () => { for (const u of users) await sql`delete from auth.users where id = ${u}`; await sql.end(); });

  it("credit_seconds", async () => {
    const samples = [0, 1, 59, 3600, 8 * 3600, 8 * 3600 + 1, 12.5 * 3600, 16 * 3600, 20 * 3600, 24 * 3600, 25 * 3600, 1e7, -10];
    for (let i = 0; i < 200; i++) samples.push(Math.random() * 30 * 3600);
    for (const t of samples) {
      const [r] = await sql`select game.credit_seconds(${t}::float8) as v`;
      expect(Number(r!.v)).toBeCloseTo(creditSeconds(t), 6);
    }
  });

  it("tang_seconds và lifespan_cap theo giai đoạn", async () => {
    for (const s of STAGES) {
      const [r] = await sql`select game.tang_seconds(${s.idx}::smallint) as t, game.lifespan_cap(${s.idx}::smallint) as c`;
      expect(Number(r!.t)).toBeCloseTo(tangSeconds(s.idx), 6);
      expect(Number(r!.c)).toBe(lifespanCap(s.idx));
    }
  });

  it("multipliers theo cấp Quán Đỉnh ngẫu nhiên", async () => {
    for (let n = 0; n < 25; n++) {
      const u = await newUser();
      await sql`select game.ensure_account(${u}::uuid)`;
      const lv = {} as Record<StatKey, number>;
      for (const k of STAT_KEYS) { lv[k] = Math.floor(Math.random() * 21); await sql`update game.account_stats set level = ${lv[k]} where account_id = ${u} and stat_key = ${k}`; }
      const [r] = await sql`select speed, risk from game.multipliers(${u}::uuid)`;
      const m = multipliers(lv);
      expect(Number(r!.speed)).toBeCloseTo(m.speed, 9);
      expect(Number(r!.risk)).toBeCloseTo(m.risk, 9);
    }
  });

  it("giá nâng cấp từng cấp", async () => {
    const u = await newUser();
    await sql`select game.ensure_account(${u}::uuid)`;
    await sql`update game.accounts set tm_balance = 100000 where account_id = ${u}`;
    for (const k of STAT_KEYS) for (let l = 0; l < 20; l++) {
      const [r] = await sql`select game.upgrade_stat(${u}::uuid, ${k}) as j`;
      expect((r!.j as { cost: number }).cost).toBe(statCost(k, l));
    }
  });

  it("xác suất chết khi đại đột phá ở mọi giai đoạn", async () => {
    for (const s of STAGES) {
      const u = await newUser();
      const risk = 0.5 + Math.random() * 0.5;
      const t0 = "2026-10-18T00:00:00Z";
      await sql`select game.start_life(${u}::uuid, ${t0}::timestamptz)`;
      await sql`update game.lives set stage_idx = ${s.idx}, tang = 9, progress_s = game.tang_seconds(${s.idx}::smallint) where account_id = ${u}`;
      // đặt cấp Căn Cốt để risk giảm theo ý muốn: rủi ro = 1 - 0.010 x level (kẹp 0.5)
      const level = Math.min(20, Math.round((1 - risk) / 0.01));
      await sql`update game.account_stats set level = ${level} where account_id = ${u} and stat_key = 'CanCot'`;
      const [r] = await sql`select game.breakthrough_prepare(${u}::uuid, ${t0}::timestamptz) as j`;
      const expected = deathProb(s.idx, multipliers({ CanCot: level }).risk);
      expect(Number((r!.j as { death_prob: number }).death_prob)).toBeCloseTo(expected, 6);
    }
  });
});
