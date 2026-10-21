/* DỮ LIỆU MẪU cho các khung giao diện chưa có backend. Không phải dữ liệu thật; không được dùng để tính toán. */
export const SAMPLE_NOTE = "Khung giao diện — dữ liệu mẫu, chưa nối máy chủ.";

export const SECT_AIMS = [
  { id: "chinh", label: "Chính đạo", desc: "Hộ tống, trấn yêu, giữ trật tự." },
  { id: "ma", label: "Ma đạo", desc: "Sức mạnh trước hết, luật riêng." },
  { id: "dan", label: "Đan đạo", desc: "Luyện đan, cứu chữa, dược liệu." },
  { id: "trung", label: "Trung lập", desc: "Mở cửa cho mọi đường tu." },
];
export const SECT_ROLES = [["Tông chủ", 1], ["Trưởng lão", 3], ["Chấp sự", 6], ["Chân truyền", 12], ["Nội môn", 40], ["Ngoại môn", "không giới hạn"]];
export const SECT_EMBLEMS = ["☯", "⚔", "❖", "☁", "✦", "❂"];
export const SECT_REQS = {
  linh_gioi: [["Cảnh giới tối thiểu", "Chưa chốt"], ["Phí sáng lập", "Linh Thạch thượng phẩm (chưa chốt)"], ["Thành viên sáng lập", "Chưa chốt"], ["Địa điểm", "Chọn một khu trong Linh Giới"]],
  tien_gioi: [["Cảnh giới tối thiểu", "Chưa chốt"], ["Phí sáng lập", "Tiên Ngọc hạ phẩm (chưa chốt)"], ["Thành viên sáng lập", "Chưa chốt"], ["Địa điểm", "Chọn một khu trong Tiên Giới"]],
};

export const AUCTION_CURRENCY = { linh_gioi: "Linh Thạch thượng phẩm", tien_gioi: "Tiên Ngọc hạ phẩm" };
export const AUCTION_ROWS = [
  { name: "Tụ Khí Đan", kind: "Đan dược", tier: "Thượng phẩm", bid: 120, buyout: 200, left: "02:14:00", seller: "Đạo hữu mẫu A" },
  { name: "Kiếm Phôi Thanh Vân", kind: "Nguyên liệu", tier: "Thường", bid: 45, buyout: 90, left: "05:40:00", seller: "Đạo hữu mẫu B" },
  { name: "Linh Phù", kind: "Phù", tier: "Cực phẩm", bid: 60, buyout: 110, left: "00:48:00", seller: "Đạo hữu mẫu C" },
  { name: "Ngũ Sắc Linh Chi", kind: "Linh dược", tier: "Thường", bid: 420, buyout: 700, left: "11:05:00", seller: "Đạo hữu mẫu D" },
  { name: "Hàn Tinh", kind: "Nguyên liệu", tier: "Thượng phẩm", bid: 52, buyout: 95, left: "01:30:00", seller: "Đạo hữu mẫu E" },
];

export const PVP_MODES = [
  { id: "duel", name: "Luận võ 1v1", desc: "Đấu đơn xếp hạng theo mùa.", needs: "Cảnh giới tương đương" },
  { id: "team", name: "Đội đấu", desc: "Ghép đội nhỏ, thắng thua tính điểm đội.", needs: "Tổ đội" },
  { id: "sect", name: "Tông môn chiến", desc: "Hai tông môn tranh tài nguyên.", needs: "Là thành viên tông môn" },
];
export const PVP_HISTORY = [["Mẫu #1", "Thắng", "+18"], ["Mẫu #2", "Thua", "−12"], ["Mẫu #3", "Thắng", "+16"]];
export const PVP_SEASON_REWARDS = [["Hạng 1–10", "Danh hiệu mùa + phần thưởng đặc biệt"], ["Hạng 11–100", "Phần thưởng cao"], ["Tham gia", "Phần thưởng cơ bản"]];

export const BOARD_TABS = [
  ["cultivation", "Tu vi"], ["power", "Chiến lực"], ["sect", "Tông môn"], ["pvp", "PvP"],
];
export const BOARD_ROWS = Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, name: `Đạo hữu mẫu ${String.fromCharCode(65 + i)}`, sub: i % 2 ? "Linh Giới" : "Hạ Giới", score: 9000 - i * 420 }));

/* 6 công pháp đầu của data/combat/player_skills.csv (đề xuất combat v1.3, chưa phải canon). */
export const SKILL_SAMPLES = [
  { id: "PSK-01-1", name: "Kiếm Khí Trảm", element: "Kim", tier: 1, coefficient: 1.2, cooldown: 2, qi: 12, unlock: "Hạ Giới / Luyện Khí", effect: "PEN 25%" },
  { id: "PSK-01-2", name: "Xuyên Phong Kiếm", element: "Kim", tier: 2, coefficient: 1.48, cooldown: 3, qi: 18, unlock: "Linh Giới / Luyện Hư", effect: "PEN 32%" },
];
