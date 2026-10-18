/* Client mỏng gọi Edge Function `api`. Không chứa luật game: mọi kết quả (chết, Thiên Mệnh, đột phá) do server quyết định. */
import type { ConfirmResult, GameState, PrepareResult } from "@hu-gioi/game-core";
import type { StatKey } from "@hu-gioi/game-core";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

const TEXT: Record<string, string> = {
  unauthorized: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
  rate_limited: "Bạn thao tác quá nhanh, hãy đợi vài giây.",
  network: "Không kết nối được máy chủ. Hãy kiểm tra mạng.",
  not_ready: "Chưa đủ tu vi để đại đột phá.",
  not_major_stage: "Chỉ đại đột phá ở tầng 9.",
  no_alive_life: "Chưa có kiếp đang sống.",
  life_ended: "Kiếp này đã kết thúc.",
  intent_expired: "Lời xác nhận đã hết hạn, hãy bắt đầu lại.",
  intent_consumed: "Lời xác nhận đã được dùng.",
  intent_stale: "Trạng thái đã thay đổi, hãy thử lại.",
  insufficient_tm: "Không đủ Thiên Mệnh.",
  max_level: "Đã đạt cấp tối đa.",
  limit_reached: "Đã đạt giới hạn mua trong kiếp này.",
  internal: "Máy chủ gặp lỗi, hãy thử lại sau.",
};

export const errorText = (e: unknown): string =>
  e instanceof ApiError ? (TEXT[e.code] ?? "Có lỗi xảy ra, vui lòng thử lại.") : "Có lỗi xảy ra, vui lòng thử lại.";

export interface ApiOptions {
  /** URL gốc của function, ví dụ https://xxx.supabase.co/functions/v1/api */
  baseUrl: string;
  getToken: () => Promise<string | null>;
  anonKey?: string;
  fetchImpl?: typeof fetch;
}

export function createApi(o: ApiOptions) {
  const f = o.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  async function req<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const token = await o.getToken();
    if (!token) throw new ApiError(401, "unauthorized");
    let res: Response;
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
    let data: unknown = null;
    try { data = await res.json(); } catch { /* thân rỗng hoặc không phải JSON */ }
    if (!res.ok) {
      const code = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : "internal";
      throw new ApiError(res.status, code);
    }
    return data as T;
  }
  return {
    state: () => req<GameState>("GET", "/state"),
    startLife: () => req<GameState>("POST", "/life/start", {}),
    prepareBreakthrough: () => req<PrepareResult>("POST", "/breakthrough/prepare", {}),
    confirmBreakthrough: (intentId: string) => req<ConfirmResult>("POST", "/breakthrough/confirm", { intent_id: intentId }),
    upgradeStat: (stat: StatKey) => req<{ stat: StatKey; level: number; cost: number; tm_balance: number }>("POST", "/tm/stat", { stat }),
    buyItem: (itemId: string) => req<{ item_id: string; name: string; cost: number; tm_balance: number }>("POST", "/tm/item", { item_id: itemId }),
  };
}
export type Api = ReturnType<typeof createApi>;
