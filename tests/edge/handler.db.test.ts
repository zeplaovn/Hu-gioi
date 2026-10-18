/* Chạy toàn bộ luồng qua handler vào Postgres thật (thay PostgREST bằng gọi hàm trực tiếp). Cần DATABASE_URL. */
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { handle, type Deps } from "../../supabase/functions/api/handler.ts";

const url = process.env.DATABASE_URL;
describe.skipIf(!url)("api ↔ Postgres", () => {
  const sql = postgres(url ?? "postgresql://invalid", { max: 1, onnotice: () => {} });
  const users: string[] = [];
  afterAll(async () => { for (const u of users) await sql`delete from auth.users where id = ${u}`; await sql.end(); });

  const deps: Deps = {
    allowedOrigins: ["*"],
    getUserId: async t => (t.startsWith("tok-") ? t.slice(4) : null),
    async rpc(fn, args) {
      const keys = Object.keys(args);
      if (!/^[a-z_]+$/.test(fn) || keys.some(k => !/^p_[a-z_]+$/.test(k))) throw new Error("bad rpc name");
      const q = `select game.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as data`;
      try { const [r] = await sql.unsafe(q, keys.map(k => args[k] as never)); return { data: r!.data, error: null }; }
      catch (e) { const x = e as { code?: string; message: string }; return { data: null, error: { code: x.code, message: x.message } }; }
    },
  };
  const call = async (u: string, method: string, path: string, body?: unknown) => {
    const r = await handle(new Request("https://x/functions/v1/api" + path, { method, headers: { authorization: "Bearer tok-" + u }, body: body ? JSON.stringify(body) : undefined }), deps);
    return { status: r.status, json: (await r.json()) as any };
  };

  it("luồng: state → bắt đầu kiếp → đột phá hai bước → Quán Đỉnh → lỗi nghiệp vụ", async () => {
    const [{ id: u }] = (await sql`insert into auth.users (id) values (gen_random_uuid()) returning id`) as unknown as [{ id: string }];
    users.push(u);

    let r = await call(u, "GET", "/state");
    expect(r.status).toBe(200);
    expect(r.json.life).toBeNull();
    expect(r.json.account.stats.CanCot).toEqual({ level: 0, cap: 20, next_cost: 8 });

    r = await call(u, "POST", "/life/start");
    expect(r.json.life.status).toBe("alive");
    expect(r.json.life.stage.stage_id).toBe("HG00");
    expect(r.json.life.lifespan.cap_years).toBe(100);

    expect((await call(u, "POST", "/breakthrough/prepare")).json).toEqual({ error: "not_major_stage" });

    await sql`update game.lives set tang = 9, progress_s = game.tang_seconds(0::smallint) where account_id = ${u}`;
    expect((await call(u, "GET", "/state")).json.life.ready_for_major).toBe(true);

    const prep = await call(u, "POST", "/breakthrough/prepare");
    expect(prep.status).toBe(200);
    expect(prep.json.lethal).toBe(false);
    const done = await call(u, "POST", "/breakthrough/confirm", { intent_id: prep.json.intent_id });
    expect(done.json).toMatchObject({ outcome: "success", stage_id: "HG01", ascended: false });
    expect((await call(u, "POST", "/breakthrough/confirm", { intent_id: prep.json.intent_id })).json).toEqual({ error: "intent_consumed" });

    r = await call(u, "GET", "/state");
    expect(r.json.account.tm_balance).toBe(1);
    expect(r.json.life.stage.stage_id).toBe("HG01");

    expect((await call(u, "POST", "/tm/stat", { stat: "CanCot" })).json).toEqual({ error: "insufficient_tm" });
    await sql`update game.accounts set tm_balance = 50 where account_id = ${u}`;
    const up = await call(u, "POST", "/tm/stat", { stat: "CanCot" });
    expect(up.json).toEqual({ stat: "CanCot", level: 1, cost: 8, tm_balance: 42 });
    const buy = await call(u, "POST", "/tm/item", { item_id: "TMITEM-001" });
    expect(buy.json).toMatchObject({ catalog_id: "TMITEM-001", cost: 20, warning: "lost_on_death" });
    expect((await call(u, "POST", "/tm/item", { item_id: "TMITEM-001" })).json).toEqual({ error: "limit_reached" });
    expect((await call(u, "GET", "/state")).json.life.items).toHaveLength(1);
  });

  it("rate limit thật: vượt 12 lần/phút cho đột phá", async () => {
    const [{ id: u }] = (await sql`insert into auth.users (id) values (gen_random_uuid()) returning id`) as unknown as [{ id: string }];
    users.push(u);
    await call(u, "POST", "/life/start");
    const statuses: number[] = [];
    for (let i = 0; i < 14; i++) statuses.push((await call(u, "POST", "/breakthrough/prepare")).status);
    expect(statuses.slice(0, 12).every(s => s === 409)).toBe(true);
    expect(statuses.slice(12)).toEqual([429, 429]);
  });
});
