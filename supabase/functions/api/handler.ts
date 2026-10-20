/* API game — lớp mỏng: xác thực JWT, validate đầu vào, giới hạn tốc độ, ánh xạ lỗi.
 * KHÔNG chứa luật game: mọi quyết định (đột phá, chết, Thiên Mệnh) nằm trong hàm pgSQL schema `game`.
 * Chỉ dùng Web API chuẩn + deps được tiêm vào => test được bằng Node, chạy được trên Deno (Supabase Edge Functions). */

export interface RpcResult { data: unknown; error: { code?: string; message: string } | null }
export interface Deps {
  /** Xác minh access token của Supabase Auth, trả về user id hoặc null. */
  getUserId(token: string): Promise<string | null>;
  /** Gọi hàm trong schema `game` bằng service_role. */
  rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult>;
  /** Danh sách origin được phép CORS; "*" cho phép tất cả (chỉ dùng khi dev). */
  allowedOrigins: string[];
}

const STATS = new Set(["TuongMao", "PhucDuyen", "CanCot", "NgoTinh", "VanKhi"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM = /^TMITEM-\d{3}$/;
const MAX_BODY = 2048;

/** code lỗi nghiệp vụ (raise exception ... errcode GM000) -> HTTP status */
const STATUS: Record<string, number> = {
  no_alive_life: 409, not_major_stage: 409, not_ready: 409, life_ended: 409,
  intent_consumed: 409, intent_expired: 409, intent_stale: 409,
  insufficient_tm: 409, max_level: 409, limit_reached: 409,
  intent_not_found: 404, stat_not_found: 404, item_not_found: 404, life_not_found: 404,
  lifespan_not_exhausted: 409, lifespan_intent_consumed: 409, lifespan_intent_expired: 409,
  lifespan_intent_not_found: 404,
  invalid_dao_hieu: 400, invalid_gender: 400, life_already_started: 409,
};

class HttpError extends Error { constructor(readonly status: number, readonly code: string) { super(code); } }

function cors(req: Request, deps: Deps): Record<string, string> {
  const origin = req.headers.get("origin");
  const h: Record<string, string> = { "Vary": "Origin" };
  if (deps.allowedOrigins.includes("*")) h["Access-Control-Allow-Origin"] = "*";
  else if (origin && deps.allowedOrigins.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  h["Access-Control-Allow-Headers"] = "authorization, content-type, x-client-info, apikey";
  h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  h["Access-Control-Max-Age"] = "600";
  return h;
}

function json(status: number, body: unknown, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY) throw new HttpError(413, "body_too_large");
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "body_too_large");
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw 0;
    return v as Record<string, unknown>;
  } catch { throw new HttpError(400, "invalid_json"); }
}

type Route = { method: "GET" | "POST"; limit: [string, number, number]; run: (ctx: { uid: string; body: Record<string, unknown>; rpc: Deps["rpc"] }) => Promise<unknown> };

const call = async (rpc: Deps["rpc"], fn: string, args: Record<string, unknown>) => {
  const { data, error } = await rpc(fn, args);
  if (error) throw error;
  return data;
};

const ROUTES: Record<string, Route> = {
  "/social": { method: "GET", limit: ["read", 120, 60], run: ({ uid, rpc }) => call(rpc, "social_state", { p_account: uid }) },
  "/social/action": {
    method: "POST", limit: ["social", 40, 60],
    run: ({ uid, body, rpc }) => {
      if (typeof body.life_id !== "string" || !UUID.test(body.life_id)) throw new HttpError(400, "invalid_life_id");
      const kinds = ["daily", "story", "choose", "gift_prepare", "gift_confirm", "gift_cancel"];
      if (typeof body.kind !== "string" || !kinds.includes(body.kind)) throw new HttpError(400, "invalid_social_action");
      for (const key of ["npc_id", "id", "choice_id"]) {
        if (body[key] !== undefined && (typeof body[key] !== "string" || !/^[A-Za-z0-9_-]{0,80}$/.test(body[key] as string))) throw new HttpError(400, "invalid_social_input");
      }
      return call(rpc, "social_action", { p_account: uid, p_life: body.life_id, p_kind: body.kind,
        p_npc: body.npc_id ?? "", p_id: body.id ?? "", p_choice: body.choice_id ?? "" });
    },
  },
  "/state": { method: "GET", limit: ["read", 120, 60], run: ({ uid, rpc }) => call(rpc, "get_state", { p_account: uid }) },
  "/heartbeat": { method: "POST", limit: ["read", 120, 60], run: async ({ uid, rpc }) => ({ now: await call(rpc, "heartbeat", { p_account: uid }) }) },
  "/life/start": {
    method: "POST", limit: ["write", 30, 60],
    run: async ({ uid, body, rpc }) => {
      // Không gửi hồ sơ = kiếp không hồ sơ (tương thích cũ). Có hồ sơ: chỉ nhận đạo hiệu + giới tính; chủng tộc/linh căn do server gieo.
      let profile: Record<string, string> | undefined;
      if (body.dao_hieu !== undefined || body.gender !== undefined) {
        if (typeof body.dao_hieu !== "string" || body.dao_hieu.length > 60) throw new HttpError(400, "invalid_dao_hieu");
        if (body.gender !== "Nam" && body.gender !== "Nữ") throw new HttpError(400, "invalid_gender");
        profile = { dao_hieu: body.dao_hieu, gender: body.gender };
      }
      await call(rpc, "start_life", profile ? { p_account: uid, p_profile: profile } : { p_account: uid });
      return call(rpc, "get_state", { p_account: uid });
    },
  },
  "/life/roll": {
    method: "POST", limit: ["roll", 40, 60],
    run: ({ uid, body, rpc }) => {
      const allowed = ["race", "linh_can"];
      const fields = body.fields === undefined ? allowed : body.fields;
      if (!Array.isArray(fields) || fields.length === 0 || fields.length > 2 || !fields.every((f) => typeof f === "string" && allowed.includes(f))) {
        throw new HttpError(400, "invalid_roll_fields");
      }
      return call(rpc, "roll_character", { p_account: uid, p_fields: fields });
    },
  },
  "/breakthrough/prepare": { method: "POST", limit: ["bt", 12, 60], run: ({ uid, rpc }) => call(rpc, "breakthrough_prepare", { p_account: uid }) },
  "/breakthrough/confirm": {
    method: "POST", limit: ["bt", 12, 60],
    run: ({ uid, body, rpc }) => {
      const id = body.intent_id;
      if (typeof id !== "string" || !UUID.test(id)) throw new HttpError(400, "invalid_intent_id");
      return call(rpc, "breakthrough_confirm", { p_account: uid, p_intent: id });
    },
  },
  "/lifespan/prepare": {
    method: "POST", limit: ["lifespan", 6, 60],
    run: ({ uid, rpc }) => call(rpc, "lifespan_prepare", { p_account: uid }),
  },
  "/lifespan/confirm": {
    method: "POST", limit: ["lifespan", 6, 60],
    run: ({ uid, body, rpc }) => {
      const id = body.intent_id;
      if (typeof id !== "string" || !UUID.test(id)) throw new HttpError(400, "invalid_intent_id");
      return call(rpc, "lifespan_confirm", { p_account: uid, p_intent: id });
    },
  },
  "/tm/stat": {
    method: "POST", limit: ["write", 30, 60],
    run: ({ uid, body, rpc }) => {
      const s = body.stat;
      if (typeof s !== "string" || !STATS.has(s)) throw new HttpError(400, "invalid_stat");
      return call(rpc, "upgrade_stat", { p_account: uid, p_stat: s });
    },
  },
  "/tm/item": {
    method: "POST", limit: ["write", 30, 60],
    run: ({ uid, body, rpc }) => {
      const i = body.item_id;
      if (typeof i !== "string" || !ITEM.test(i)) throw new HttpError(400, "invalid_item_id");
      return call(rpc, "buy_tm_item", { p_account: uid, p_item: i });
    },
  },
};

/** Lấy phần đường dẫn sau tên function (`/functions/v1/api/state` hoặc `/api/state` hoặc `/state`). */
export function routeOf(url: string): string {
  const p = new URL(url).pathname.replace(/\/+$/, "") || "/";
  const m = p.match(/(?:^|\/)api(\/.*)?$/);
  return m ? (m[1] ?? "/") : p;
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const c = cors(req, deps);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: c });
  try {
    const path = routeOf(req.url);
    if (path === "/health") return json(200, { ok: true }, c);
    const route = ROUTES[path];
    if (!route) throw new HttpError(404, "not_found");
    if (req.method !== route.method) throw new HttpError(405, "method_not_allowed");

    const auth = req.headers.get("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(\S+)$/i);
    if (!m) throw new HttpError(401, "unauthorized");
    const uid = await deps.getUserId(m[1]!);
    if (!uid) throw new HttpError(401, "unauthorized");

    const body = route.method === "POST" ? await readBody(req) : {};
    const [key, max, windowS] = route.limit;
    const rl = await deps.rpc("hit_rate_limit", { p_account: uid, p_key: key, p_max: max, p_window_s: windowS });
    if (rl.error) throw rl.error;
    if (rl.data !== true) throw new HttpError(429, "rate_limited");

    return json(200, await route.run({ uid, body, rpc: deps.rpc }), c);
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.code }, e.status === 429 ? { ...c, "retry-after": "10" } : c);
    const err = e as { code?: string; message?: string };
    if (err && err.code === "GM000" && typeof err.message === "string") return json(STATUS[err.message] ?? 400, { error: err.message }, c);
    console.error("api internal error", err?.code, err?.message);   // không lộ chi tiết cho client
    return json(500, { error: "internal" }, c);
  }
}
