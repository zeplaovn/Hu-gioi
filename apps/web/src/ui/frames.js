/* Khung giao diện (chưa có backend): Lập tông môn, Đấu giá, PvP, Bảng xếp hạng, Công pháp, Linh căn.
   Chỉ dùng dữ liệu mẫu từ frames-data.js; KHÔNG gọi API, mọi nút hành động bị khóa. Dữ liệu thật do server quyết khi backend xong. */
import { createDialog } from "./dialog.js";
import { clear, h } from "./dom.js";
import { availableIn, worldById } from "../world.js";
import * as D from "./frames-data.js";

const note = () => h("p", { class: "frame-note" }, D.SAMPLE_NOTE);
const lockedBtn = (label) => h("button", { type: "button", class: "btn", disabled: true, title: "Chưa nối máy chủ" }, label);
const table = (head, rows) => h("table", { class: "frame-table" },
  h("thead", null, h("tr", null, head.map((c) => h("th", null, c)))),
  h("tbody", null, rows.map((r) => h("tr", null, r.map((c) => h("td", null, String(c)))))));
const kv = (rows) => h("dl", { class: "frame-kv" }, rows.flatMap(([k, v]) => [h("dt", null, k), h("dd", null, String(v))]));
const unavailable = (title, worldId) => [h("p", null, `${title} chỉ có ở Linh Giới và Tiên Giới. Hiện đang ở ${worldById(worldId).name}.`)];

const BUILDERS = {
  sectCreate(w) {
    if (!availableIn("sectCreate", w)) return unavailable("Lập tông môn", w);
    return [note(),
      h("h3", null, "Điều kiện sáng lập"), kv(D.SECT_REQS[w]),
      h("h3", null, "Thông tin tông môn"),
      h("div", { class: "frame-form" },
        h("label", null, "Tên tông môn ", h("input", { type: "text", disabled: true, placeholder: "2–20 ký tự" })),
        h("label", null, "Tôn chỉ ", h("select", { disabled: true }, D.SECT_AIMS.map((a) => h("option", null, `${a.label} — ${a.desc}`)))),
        h("div", { class: "frame-emblems", "aria-label": "Huy hiệu" }, D.SECT_EMBLEMS.map((e) => h("span", { class: "frame-emblem" }, e)))),
      h("h3", null, "Chức vị"), table(["Chức vị", "Số lượng"], D.SECT_ROLES),
      lockedBtn("Lập tông môn")];
  },
  auction(w) {
    if (!availableIn("auction", w)) return unavailable("Đấu giá", w);
    return [note(), h("p", null, `Tiền tệ: ${D.AUCTION_CURRENCY[w]}.`),
      table(["Vật phẩm", "Loại", "Phẩm", "Giá hiện tại", "Mua ngay", "Còn lại", "Người bán"],
        D.AUCTION_ROWS.map((r) => [r.name, r.kind, r.tier, r.bid, r.buyout, r.left, r.seller])),
      h("div", { class: "frame-actions" }, lockedBtn("Ra giá"), lockedBtn("Mua ngay"), lockedBtn("Đăng bán"))];
  },
  pvp(w) {
    if (!availableIn("pvp", w)) return unavailable("PvP · Đấu trường", w);
    return [note(),
      h("div", { class: "frame-cards" }, D.PVP_MODES.map((m) => h("section", { class: "frame-card" },
        h("h3", null, m.name), h("p", null, m.desc), h("p", { class: "dim small" }, `Yêu cầu: ${m.needs}`), lockedBtn("Vào đấu")))),
      h("h3", null, "Lịch sử gần đây"), table(["Đối thủ", "Kết quả", "Điểm"], D.PVP_HISTORY),
      h("h3", null, "Thưởng mùa"), table(["Hạng", "Thưởng"], D.PVP_SEASON_REWARDS)];
  },
  board() {
    let tab = D.BOARD_TABS[0][0];
    const box = h("div");
    const draw = () => clear(box,
      h("div", { class: "frame-tabs", role: "tablist" }, D.BOARD_TABS.map(([id, label]) =>
        h("button", { type: "button", role: "tab", class: ["btn", "sm", id === tab ? "gold" : "dimbtn"], "aria-selected": String(id === tab), onclick: () => { tab = id; draw(); } }, label))),
      table(["Hạng", "Tên", "Giới", "Điểm"], D.BOARD_ROWS.map((r) => [r.rank, r.name, r.sub, r.score])));
    draw();
    return [note(), box];
  },
  skills() {
    return [note(), h("p", null, "Xem chi tiết và nâng cấp công pháp. Quy tắc nâng cấp chờ bạn duyệt."),
      table(["Công pháp", "Hệ", "Bậc", "Hệ số", "Hồi", "Nội lực", "Mở ở", "Hiệu ứng"],
        D.SKILL_SAMPLES.map((s) => [s.name, s.element, s.tier, s.coefficient, s.cooldown, `${s.qi}%`, s.unlock, s.effect])),
      lockedBtn("Nâng cấp")];
  },
  root() {
    return [note(), h("p", null, "Linh căn của kiếp này lấy từ lần gieo ở màn tạo nhân vật. Trang này sẽ hiển thị hệ, độ thuần và gợi ý công pháp hợp hệ."),
      kv([["Linh căn", "(theo nhân vật)"], ["Độ thuần", "—"], ["Hệ chủ đạo", "—"]])];
  },
};
export const FRAME_TITLES = { sectCreate: "Lập tông môn", auction: "Đấu giá", pvp: "PvP · Đấu trường", board: "Bảng xếp hạng", skills: "Công pháp", root: "Linh căn" };

/** @param {{ kind: keyof typeof BUILDERS }} o */
export function createFrameDialog({ kind }) {
  const dlg = createDialog({ title: FRAME_TITLES[kind] });
  dlg.el.classList.add("frame-dialog");
  return {
    el: dlg.el,
    open(worldId) { clear(dlg.body, ...BUILDERS[kind](worldId), h("div", { class: "dialog-actions" }, h("button", { type: "button", class: "btn", onclick: () => dlg.hide() }, "Đóng"))); dlg.show(); },
  };
}
