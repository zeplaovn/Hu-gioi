/* Logic thuần cho vỏ giao diện (thanh trên, khung trạng thái, gợi ý). Không đụng DOM nên test được bằng Node.
   Chỉ ĐỌC dữ liệu server đã trả về; không quyết định gì thay server. */
import { clamp01 } from "./format.js";

const DAY_MS = 86400000;
export const SEASON_NAME = ["Xuân", "Hạ", "Thu", "Đông"];

/** Mùa chạy theo tầng: tầng 1–3 Xuân, 4–5 Hạ, 6–7 Thu, 8–9 Đông (9 tầng = một vòng bốn mùa). */
export const seasonOf = (tang) => Math.min(3, Math.max(0, Math.floor((tang - 1) / 2.25)));

/** Ngày thứ mấy của kiếp (tính theo thời gian thật từ lúc sinh tới `now` của server; ngày đầu là 1). */
export function lifeDay(life, nowIso) {
  const born = Date.parse(life?.born_at), now = Date.parse(nowIso);
  if (!Number.isFinite(born) || !Number.isFinite(now)) return null;
  return Math.max(1, Math.floor(Math.max(0, now - born) / DAY_MS) + 1);
}

/** Tiến độ tầng hiện tại, 0..1. */
export const progressOf = (life) => clamp01(life.need_s > 0 ? life.progress_s / life.need_s : 0);

/** Thọ nguyên còn lại (năm), không âm. */
export const lifespanLeft = (life) => Math.max(0, Math.round(life.lifespan.cap_years - life.lifespan.used_years));

/** Trạng thái nhập định cho khung trạng thái. tone khớp lớp màu t-*. */
export function idleStatus(life) {
  if (life.status === "cleared") return { text: "★ Đã hoàn tất tuyến chính", tone: "gold" };
  if (life.lifespan?.exhausted) return { text: "⚠ Thọ nguyên cạn — chờ xác nhận", tone: "red" };
  if (life.ready_for_major) return { text: "◆ Tu vi viên mãn - hãy đại đột phá", tone: "gold" };
  if (life.tang >= 9) return { text: "● Đang tích tụ tu vi đại đột phá", tone: "green" };
  return { text: "● Đang nhập định", tone: "green" };
}

/** Stat rẻ nhất còn nâng được (next_cost != null). Trả về { key, cost } hoặc null. */
export function cheapestUpgrade(stats) {
  let best = null;
  for (const [key, st] of Object.entries(stats ?? {})) {
    if (st?.next_cost == null) continue;
    if (!best || st.next_cost < best.cost) best = { key, cost: st.next_cost };
  }
  return best;
}

/**
 * Gợi ý việc nên làm tiếp theo (một dòng, theo độ ưu tiên). Trả về { id, text, cta?: { label, href } } hoặc null.
 * `id` ổn định để người chơi tắt gợi ý trong phiên.
 */
export function nextHint(state) {
  const life = state?.life;
  if (!life || life.status !== "alive") return null;
  if (state.pending_intent) {
    return { id: "pending", text: "Có một lời xác nhận đại đột phá đang chờ ngươi.", cta: { label: "Tiếp tục", action: "resume" } };
  }
  if (life.ready_for_major) {
    return { id: "ready", text: "Tu vi đã đầy ở tầng 9. Đại đột phá có thể thất bại dẫn tới tử vong thật; hãy chắc chắn trước khi xác nhận." };
  }
  const up = cheapestUpgrade(state.account?.stats);
  if (up && state.account.tm_balance >= up.cost) {
    return { id: "spend-tm", text: `Ngươi có ${state.account.tm_balance} Thiên Mệnh: khi lập kiếp mới, hãy nâng chỉ số vĩnh viễn ở Quán Đỉnh.` };
  }
  return null;
}
