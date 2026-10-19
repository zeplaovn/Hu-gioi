import { describe, expect, it } from "vitest";
import { ApiError, createApi, errorText } from "../src/api.js";

function mk(handler, token = "tok") {
  const calls = [];
  const api = createApi({
    baseUrl: "https://x.supabase.co/functions/v1/api/",
    getToken: async () => token,
    anonKey: "anon",
    fetchImpl: async (url, init) => { calls.push({ url, init }); return handler(url, init); },
  });
  return { api, calls };
}
const ok = (body) => new Response(JSON.stringify(body), { status: 200 });

describe("api client", () => {
  it("gắn Bearer + apikey, chuẩn hóa dấu / cuối baseUrl", async () => {
    const { api, calls } = mk(() => ok({ now: "x" }));
    await api.state();
    expect(calls[0].url).toBe("https://x.supabase.co/functions/v1/api/state");
    const h = calls[0].init.headers;
    expect(h.authorization).toBe("Bearer tok");
    expect(h.apikey).toBe("anon");
    expect(calls[0].init.method).toBe("GET");
  });
  it("POST gửi JSON đúng trường", async () => {
    const { api, calls } = mk(() => ok({}));
    await api.confirmBreakthrough("abc");
    await api.upgradeStat("CanCot");
    await api.buyItem("TMITEM-004");
    expect(calls.map((c) => c.url.split("/api")[1])).toEqual(["/breakthrough/confirm", "/tm/stat", "/tm/item"]);
    expect(JSON.parse(calls[0].init.body)).toEqual({ intent_id: "abc" });
    expect(JSON.parse(calls[1].init.body)).toEqual({ stat: "CanCot" });
    expect(JSON.parse(calls[2].init.body)).toEqual({ item_id: "TMITEM-004" });
  });
  it("không có token: 401 và KHÔNG gọi mạng", async () => {
    const { api, calls } = mk(() => ok({}), null);
    await expect(api.state()).rejects.toMatchObject({ status: 401, code: "unauthorized" });
    expect(calls).toHaveLength(0);
  });
  it("ánh xạ mã lỗi server", async () => {
    const { api } = mk(() => new Response(JSON.stringify({ error: "insufficient_tm" }), { status: 409 }));
    const e = await api.upgradeStat("CanCot").catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(409);
    expect(errorText(e)).toBe("Không đủ Thiên Mệnh.");
  });
  it("lỗi mạng và thân không phải JSON", async () => {
    const net = mk(() => { throw new TypeError("fail"); });
    await expect(net.api.state()).rejects.toMatchObject({ code: "network" });
    const bad = mk(() => new Response("<html>", { status: 502 }));
    await expect(bad.api.state()).rejects.toMatchObject({ status: 502, code: "internal" });
  });
  it("lỗi lạ không lộ chi tiết", () => {
    expect(errorText(new ApiError(400, "weird_code"))).toBe("Có lỗi xảy ra, vui lòng thử lại.");
    expect(errorText(new Error("secret stack"))).toBe("Có lỗi xảy ra, vui lòng thử lại.");
  });
});
