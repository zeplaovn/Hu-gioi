/* Client mỏng gọi Edge Function `api`. Không chứa luật game: mọi kết quả (chết, Thiên Mệnh, đột phá) do server quyết định.
   Hình dạng JSON trả về: xem packages/game-core/src/types.ts (GameState, PrepareResult, ConfirmResult). */

export class ApiError extends Error {
  /** @param {number} status  @param {string} code */
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const TEXT = {
  unauthorized: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
  rate_limited: "Bạn thao tác quá nhanh, hãy đợi vài giây.",
  network: "Không kết nối được máy chủ. Hãy kiểm tra mạng.",
  not_ready: "Chưa đủ tu vi để đại đột phá.",
  not_major_stage: "Chỉ đại đột phá ở tầng 9.",
  no_alive_life: "Chưa có kiếp đang sống.",
  life_ended: "Kiếp này đã kết thúc.",
  lifespan_not_exhausted: "Thọ nguyên vẫn còn; chưa thể tọa hóa.",
  lifespan_intent_expired: "Lời xác nhận tọa hóa đã hết hạn, hãy chuẩn bị lại.",
  lifespan_intent_consumed: "Lời xác nhận tọa hóa đã được dùng.",
  lifespan_intent_not_found: "Không tìm thấy lời xác nhận tọa hóa của kiếp này.",
  intent_expired: "Lời xác nhận đã hết hạn, hãy bắt đầu lại.",
  intent_consumed: "Lời xác nhận đã được dùng.",
  intent_stale: "Trạng thái đã thay đổi, hãy thử lại.",
  insufficient_tm: "Không đủ Thiên Mệnh.",
  max_level: "Đã đạt cấp tối đa.",
  limit_reached: "Đã đạt giới hạn mua trong kiếp này.",
  internal: "Máy chủ gặp lỗi, hãy thử lại sau.",
};

export const errorText = (e) =>
  e instanceof ApiError ? (TEXT[e.code] ?? "Có lỗi xảy ra, vui lòng thử lại.") : "Có lỗi xảy ra, vui lòng thử lại.";

/**
 * @param {{ baseUrl: string, getToken: () => Promise<string | null>, anonKey?: string, fetchImpl?: typeof fetch }} o
 *   baseUrl: URL gốc của function, ví dụ https://xxx.supabase.co/functions/v1/api
 */
export function createApi(o) {
  const f = o.fetchImpl ?? ((...a) => fetch(...a));

  async function req(method, path, body) {
    const token = await o.getToken();
    if (!token) throw new ApiError(401, "unauthorized");
    let res;
    try {
      res = await f(o.baseUrl.replace(/\/+$/, "") + path, {
        method,
        cache: "no-store",
        headers: {
          authorization: "Bearer " + token,
          ...(o.anonKey ? { apikey: o.anonKey } : {}),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, "network");
    }
    let data = null;
    try { data = await res.json(); } catch { /* thân rỗng hoặc không phải JSON */ }
    if (!res.ok) {
      const code = data && typeof data === "object" && "error" in data ? String(data.error) : "internal";
      throw new ApiError(res.status, code);
    }
    return data;
  }

  return {
    state: () => req("GET", "/state"),
    startLife: () => req("POST", "/life/start", {}),
    prepareBreakthrough: () => req("POST", "/breakthrough/prepare", {}),
    confirmBreakthrough: (intentId) => req("POST", "/breakthrough/confirm", { intent_id: intentId }),
    prepareLifespan: () => req("POST", "/lifespan/prepare", {}),
    confirmLifespan: (intentId) => req("POST", "/lifespan/confirm", { intent_id: intentId }),
    upgradeStat: (stat) => req("POST", "/tm/stat", { stat }),
    buyItem: (itemId) => req("POST", "/tm/item", { item_id: itemId }),
  };
}
