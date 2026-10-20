import { describe, expect, it, vi } from "vitest";
import { handle, routeOf, type Deps, type RpcResult } from "../../supabase/functions/api/handler.ts";

const U = "11111111-1111-1111-1111-111111111111";
function mk(over: Partial<Deps> & { rpcImpl?: (fn: string, args: Record<string, unknown>) => RpcResult } = {}) {
  const calls: Array<[string, Record<string, unknown>]> = [];
  const deps: Deps = {
    allowedOrigins: ["https://game.example"],
    getUserId: async t => (t === "good" ? U : null),
    rpc: async (fn, args) => { calls.push([fn, args]); return over.rpcImpl ? over.rpcImpl(fn, args) : { data: fn === "hit_rate_limit" ? true : { ok: fn }, error: null }; },
    ...over,
  };
  return { deps, calls };
}
const req = (path: string, init: RequestInit & { token?: string | null } = {}) => {
  const { token = "good", ...rest } = init;
  return new Request("https://x.supabase.co/functions/v1/api" + path, { ...rest, headers: { ...(token ? { authorization: "Bearer " + token } : {}), ...(rest.headers as object) } });
};

describe("api handler", () => {
  it("routeOf", () => {
    expect(routeOf("https://x/functions/v1/api/state")).toBe("/state");
    expect(routeOf("https://x/api/tm/stat/")).toBe("/tm/stat");
    expect(routeOf("https://x/state")).toBe("/state");
    expect(routeOf("https://x/functions/v1/api")).toBe("/");
  });
  it("CORS preflight và origin", async () => {
    const { deps } = mk();
    const r = await handle(req("/state", { method: "OPTIONS", headers: { origin: "https://game.example" } }), deps);
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("https://game.example");
    const bad = await handle(req("/state", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), deps);
    expect(bad.headers.get("access-control-allow-origin")).toBeNull();
  });
  it("/health không cần token", async () => {
    const r = await handle(req("/health", { token: null }), mk().deps);
    expect(r.status).toBe(200);
  });
  it("401 khi thiếu hoặc sai token, không gọi database", async () => {
    const { deps, calls } = mk();
    expect((await handle(req("/state", { token: null }), deps)).status).toBe(401);
    expect((await handle(req("/state", { token: "bad" }), deps)).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
  it("404 / 405", async () => {
    const { deps } = mk();
    expect((await handle(req("/nope"), deps)).status).toBe(404);
    expect((await handle(req("/state", { method: "POST" }), deps)).status).toBe(405);
  });
  it("validate đầu vào", async () => {
    const { deps, calls } = mk();
    const post = (p: string, body: string) => handle(req(p, { method: "POST", body }), deps);
    expect((await post("/breakthrough/confirm", JSON.stringify({ intent_id: "x" }))).status).toBe(400);
    expect((await post("/tm/stat", JSON.stringify({ stat: "HP" }))).status).toBe(400);
    expect((await post("/tm/item", JSON.stringify({ item_id: "TMSTAT-001" }))).status).toBe(400);
    expect((await post("/tm/stat", "not json")).status).toBe(400);
    expect((await post("/tm/stat", "[1]")).status).toBe(400);
    expect((await post("/tm/stat", JSON.stringify({ stat: "CanCot", pad: "x".repeat(3000) }))).status).toBe(413);
    expect(calls.filter(c => c[0] !== "hit_rate_limit")).toHaveLength(0);
  });
  it("uid luôn lấy từ token, không từ body", async () => {
    const { deps, calls } = mk();
    const r = await handle(req("/tm/stat", { method: "POST", body: JSON.stringify({ stat: "CanCot", p_account: "evil", account_id: "evil" }) }), deps);
    expect(r.status).toBe(200);
    expect(calls.find(c => c[0] === "upgrade_stat")![1]).toEqual({ p_account: U, p_stat: "CanCot" });
  });
  it("429 khi vượt giới hạn tốc độ", async () => {
    const { deps, calls } = mk({ rpcImpl: () => ({ data: false, error: null }) });
    const r = await handle(req("/breakthrough/prepare", { method: "POST" }), deps);
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("10");
    expect(calls.map(c => c[0])).toEqual(["hit_rate_limit"]);
  });
  it("ánh xạ lỗi nghiệp vụ GM000", async () => {
    for (const [msg, status] of [["insufficient_tm", 409], ["intent_not_found", 404], ["not_ready", 409], ["la_la", 400]] as const) {
      const { deps } = mk({ rpcImpl: fn => (fn === "hit_rate_limit" ? { data: true, error: null } : { data: null, error: { code: "GM000", message: msg } }) });
      const r = await handle(req("/state"), deps);
      expect(r.status).toBe(status);
      expect(await r.json()).toEqual({ error: msg });
    }
  });
  it("lỗi hệ thống trả 500 và không lộ chi tiết", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = mk({ rpcImpl: fn => (fn === "hit_rate_limit" ? { data: true, error: null } : { data: null, error: { code: "42P01", message: 'relation "game.secret" does not exist' } }) });
    const r = await handle(req("/state"), deps);
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("secret");
    spy.mockRestore();
  });
  it("life/start gọi start_life rồi get_state", async () => {
    const { deps, calls } = mk();
    await handle(req("/life/start", { method: "POST" }), deps);
    expect(calls.map(c => c[0])).toEqual(["hit_rate_limit", "start_life", "get_state"]);
  });
  it("life/start với hồ sơ chỉ nhận đạo hiệu + giới tính, bỏ chủng tộc/linh căn do client gửi", async () => {
    const { deps, calls } = mk();
    const body = JSON.stringify({ dao_hieu: "Hàn Thiên Sơn", gender: "Nam", race: "Tiên Duệ", linh_can: "x" });
    const r = await handle(req("/life/start", { method: "POST", body }), deps);
    expect(r.status).toBe(200);
    expect(calls[1]).toEqual(["start_life", { p_account: U, p_profile: { dao_hieu: "Hàn Thiên Sơn", gender: "Nam" } }]);
    for (const bad of ['{"dao_hieu":"A","gender":"Khác"}', '{"gender":"Nam"}', '{"dao_hieu":5,"gender":"Nữ"}']) {
      expect((await handle(req("/life/start", { method: "POST", body: bad }), deps)).status).toBe(400);
    }
  });
  it("life/roll chỉ nhận race/linh_can", async () => {
    const { deps, calls } = mk();
    expect((await handle(req("/life/roll", { method: "POST", body: '{"fields":["race"]}' }), deps)).status).toBe(200);
    expect(calls.at(-1)).toEqual(["roll_character", { p_account: U, p_fields: ["race"] }]);
    expect((await handle(req("/life/roll", { method: "POST", body: '{"fields":["tm"]}' }), deps)).status).toBe(400);
    expect((await handle(req("/life/roll", { method: "POST", body: '{"fields":[]}' }), deps)).status).toBe(400);
    expect((await handle(req("/life/roll", { method: "POST" }), deps)).status).toBe(200);
  });
  it("tọa hóa: JWT được kiểm, input UUID/rate limit và RPC đúng", async () => {
    const { deps, calls } = mk();
    const bad = await handle(req("/lifespan/confirm", { method: "POST", body: '{"intent_id":"bad"}' }), deps);
    expect(bad.status).toBe(400);
    expect(calls.filter(c => c[0] === "lifespan_confirm")).toHaveLength(0);
    const goodId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const p = await handle(req("/lifespan/prepare", { method: "POST" }), deps);
    expect(p.status).toBe(200);
    const r = await handle(req("/lifespan/confirm", { method: "POST", body: JSON.stringify({ intent_id: goodId, p_account: "evil" }) }), deps);
    expect(r.status).toBe(200);
    expect(calls.find(c => c[0] === "lifespan_prepare")![1]).toEqual({ p_account: U });
    expect(calls.find(c => c[0] === "lifespan_confirm")![1]).toEqual({ p_account: U, p_intent: goodId });
    expect((await handle(req("/lifespan/prepare", { method: "POST", token: null }), deps)).status).toBe(401);
    const limited = mk({ rpcImpl: () => ({ data: false, error: null }) });
    expect((await handle(req("/lifespan/confirm", { method: "POST" }), limited.deps)).status).toBe(429);
  });
  it("tọa hóa: lỗi nghiệp vụ có mã HTTP ổn định", async () => {
    const { deps } = mk({ rpcImpl: fn => fn === "hit_rate_limit"
      ? { data: true, error: null }
      : { data: null, error: { code: "GM000", message: "lifespan_not_exhausted" } } });
    const r = await handle(req("/lifespan/prepare", { method: "POST" }), deps);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: "lifespan_not_exhausted" });
  });

  it("không cache", async () => {
    const r = await handle(req("/state"), mk().deps);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
