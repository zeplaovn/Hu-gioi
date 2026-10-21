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
  npc_unavailable: "NPC hiện không có mặt tại Hạ Giới hoặc đã bị khóa theo cốt truyện.",
  npc_not_found: "Không tìm thấy nhân vật.",
  daily_limit: "Hôm nay đã tương tác loại này. Lượt mới mở lúc 00:00 UTC (07:00 Việt Nam).",
  gift_cooldown: "Cùng món quà chỉ được tặng lại sau 3 ngày reset.",
  insufficient_gift: "Trong túi không có món quà này.",
  relationship_required: "Chưa đủ thiện cảm để mở cảnh tiếp theo. Hãy trò chuyện hằng ngày.",
  story_complete: "Bạn đã xem hết các cảnh của nhân vật trong kiếp này.",
  story_locked: "Chưa hoàn thành cảnh trước.",
  offer_expired: "Cuộc gặp đã qua ngày reset. Hãy mở lại cuộc gặp.",
  offer_not_found: "Cuộc gặp không còn tồn tại. Hãy tải lại.",
  invalid_choice: "Lựa chọn không thuộc cuộc gặp này.",
  already_completed: "Tương tác này đã hoàn tất.",

  invalid_dao_hieu: "Đạo hiệu cần 2–20 ký tự, không chứa ký tự đặc biệt (< > & \" ' ` [ ]).",
  invalid_gender: "Hãy chọn giới tính.",
  invalid_roll_fields: "Yêu cầu gieo không hợp lệ.",
  life_already_started: "Kiếp này đã bắt đầu, không thể gieo lại.",

  invalid_craft_action: "Thao tác nghề phụ không hợp lệ.",
  invalid_craft_input: "Dữ liệu thao tác không hợp lệ.",
  plot_locked: "Ô đất này còn bị khóa.", plot_busy: "Ô đất đang có cây.", plot_unlocked: "Ô đất đã mở rồi.",
  plot_order: "Hãy mở các ô theo thứ tự từ trái sang phải, từ trên xuống.", realm_too_low: "Cảnh giới chưa đủ để mở ô này.",
  craft_level_too_low: "Cấp Linh điền chưa đủ để gieo loại hạt này.",
  insufficient_ls: "Không đủ Linh Thạch.", insufficient_tn: "Không đủ Tiên Ngọc.", insufficient_goods: "Trong kho không đủ vật phẩm này.",
  not_ready: "Cây chưa chín.", water_max: "Ô này đã tưới đủ số lần.", water_cooldown: "Vừa tưới xong, hãy chờ một lát.",
  nothing_to_water: "Không có cây đang lớn để tưới.", nothing_to_fertilize: "Không có cây đang lớn để bón phân.",
  already_fertilized: "Ô này đã bón phân.", no_pest: "Không có sâu để bắt.",
  daily_limit: "Hôm nay đã vẽ hết số lần. Lượt mới mở lúc 00:00 UTC (07:00 Việt Nam).", no_paper: "Hết Giấy Phù, hãy mua thêm ở Vạn Bảo Các.",
  not_sellable: "Vật phẩm này không bán được.", not_for_sale: "Cửa hàng không bán vật phẩm này.", invalid_qty: "Số lượng không hợp lệ.",
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
    crafts: () => req("GET", "/crafts"),
    craftsAction: (body) => req("POST", "/crafts/action", body),
    social: () => req("GET", "/social"),
    socialAction: (body) => req("POST", "/social/action", body),
    state: () => req("GET", "/state"),
    /** profile = { dao_hieu, gender }; chủng tộc và linh căn do server gieo (rollCharacter). Bỏ trống = kiếp không hồ sơ. */
    startLife: (profile) => req("POST", "/life/start", profile ?? {}),
    rollCharacter: (fields) => req("POST", "/life/roll", fields ? { fields } : {}),
    prepareBreakthrough: () => req("POST", "/breakthrough/prepare", {}),
    confirmBreakthrough: (intentId) => req("POST", "/breakthrough/confirm", { intent_id: intentId }),
    prepareLifespan: () => req("POST", "/lifespan/prepare", {}),
    confirmLifespan: (intentId) => req("POST", "/lifespan/confirm", { intent_id: intentId }),
    upgradeStat: (stat) => req("POST", "/tm/stat", { stat }),
    buyItem: (itemId) => req("POST", "/tm/item", { item_id: itemId }),
  };
}
