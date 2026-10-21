/* Bộ khung ba đại giới: dữ liệu mô tả + bảng tính năng theo giới. THUẦN GIAO DIỆN: chưa nối máy chủ, không quyết định luật game.
   Tên địa danh/thế lực lấy đúng tài liệu 08 (địa lý); tọa độ và bản đồ chính thức chưa chốt nên không tự bịa thêm vùng. */
import { STAGES } from "@hu-gioi/game-core";

export const WORLDS = [
  { id: "ha_gioi", server: "Hạ Giới", name: "Hạ Giới", color: "#7fffa0",
    tagline: "Đất, núi và bếp lửa: nơi Thiên Ngoại Khách đặt chân đầu tiên.",
    places: ["Thanh Vân Tông", "Huyết Sát Môn", "Vạn Dược Cốc", "Dải núi Thanh Vân", "Độc Đàm", "Thiết Sơn", "Huyết Vân Nhai", "Giới bích"] },
  { id: "linh_gioi", server: "Linh Giới", name: "Linh Giới", color: "#7fdcff",
    tagline: "Thành nổi mọc theo mạch linh khí, hồ sơ dưới đá.",
    places: ["Thái Hư Kiếm Cung", "Vô Tướng Ma Điện", "Bách Thảo Thánh Viện", "Thiên Cơ Các"] },
  { id: "tien_gioi", server: "Tiên Giới", name: "Tiên Giới", color: "#ffe27a",
    tagline: "Trời sáng rất lâu; thời gian lệch thước đo của người phàm.",
    places: ["Cửu Tiêu Tiên Đình", "Vạn Pháp Đạo Viện", "U Minh Cổ Điện", "Quy Hương Thủ Điện (Đài Quy Hương)"] },
];
export const worldById = (id) => WORLDS.find((w) => w.id === id) ?? WORLDS[0];
export const worldByServerName = (name) => WORLDS.find((w) => w.server === name) ?? WORLDS[0];
export const stagesOfWorld = (id) => STAGES.filter((s) => s.world === worldById(id).server);

const ALL = ["ha_gioi", "linh_gioi", "tien_gioi"], UPPER = ["linh_gioi", "tien_gioi"];
/**
 * status: "live" = đã chạy thật (có máy chủ); "frame" = mới có khung giao diện, dữ liệu mẫu.
 * worlds: những giới có tính năng này. Lập tông môn, Đấu giá, PvP chỉ có ở Linh Giới và Tiên Giới.
 */
export const FEATURES = [
  { id: "cultivate", label: "Tu luyện", status: "live", worlds: ALL },
  { id: "explore",   label: "Lịch luyện (hội thoại NPC)", status: "live", worlds: ALL },
  { id: "secret",    label: "Bí cảnh (kỳ ngộ)", status: "live", worlds: ALL },
  { id: "crafts",    label: "Nghề phụ", status: "live", worlds: ALL },
  { id: "shop",      label: "Vạn Bảo Các", status: "live", worlds: ALL },
  { id: "sect",      label: "Gia nhập tông môn", status: "live", worlds: ["ha_gioi"], note: "Ba tông môn Hạ Giới" },
  { id: "skills",    label: "Công pháp", status: "frame", worlds: ALL },
  { id: "root",      label: "Linh căn", status: "frame", worlds: ALL },
  { id: "board",     label: "Bảng xếp hạng", status: "frame", worlds: ALL },
  { id: "sectCreate", label: "Lập tông môn", status: "frame", worlds: UPPER },
  { id: "auction",   label: "Đấu giá", status: "frame", worlds: UPPER },
  { id: "pvp",       label: "PvP · Đấu trường", status: "frame", worlds: UPPER },
];
export const featureById = (id) => FEATURES.find((f) => f.id === id);
export const availableIn = (featureId, worldId) => !!featureById(featureId)?.worlds.includes(worldId);
export const featuresOf = (worldId) => FEATURES.filter((f) => f.worlds.includes(worldId));

/* ---- Xem trước khung giao diện của giới khác (chỉ trên trình duyệt, KHÔNG đổi dữ liệu thật) ---- */
const KEY = "hugioi.previewWorld";
let mem = null; // dự phòng khi sessionStorage không dùng được
const valid = (v) => (WORLDS.some((w) => w.id === v) ? v : null);
export const getPreview = () => { try { const v = valid(sessionStorage.getItem(KEY)); if (v) return v; } catch { /* noop */ } return mem; };
export const setPreview = (id) => {
  mem = valid(id);
  try { if (mem) sessionStorage.setItem(KEY, mem); else sessionStorage.removeItem(KEY); } catch { /* noop */ }
};
/** Giới đang hiển thị: bản xem trước nếu có, không thì giới thật của nhân vật. */
export const effectiveWorld = (realServerName) => getPreview() ?? worldByServerName(realServerName).id;
