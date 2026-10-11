/* Dữ liệu thế giới + nghề phụ (port từ game/data/world.py và crafting.py) */
"use strict";
const TT = window.TT = {};

TT.STATS = ["Tướng Mạo", "Phúc Duyên", "Căn Cốt", "Ngộ Tính", "Vận Khí"];

TT.STAT_DESC = {
  "Tướng Mạo": "Ngoại hình, dễ được quý nhân giúp đỡ, vào tông môn thuận lợi.",
  "Phúc Duyên": "Gặp cơ duyên, nhặt bảo vật khi lịch luyện.",
  "Căn Cốt": "Tốc độ tu luyện, khí huyết và sức chiến đấu.",
  "Ngộ Tính": "Đốn ngộ khi tu luyện, tăng tỉ lệ đột phá.",
  "Vận Khí": "May mắn khi lịch luyện, tránh họa, tăng tỉ lệ đột phá.",
};

TT.RACES = {
  "Nhân": [80, {}],
  "Ma": [90, { "Căn Cốt": 2, "Tướng Mạo": -1 }],
  "Yêu": [120, { "Căn Cốt": 1, "Ngộ Tính": -1 }],
  "Linh": [100, { "Ngộ Tính": 2, "Căn Cốt": -1 }],
  "Tiên Duệ": [150, { "Phúc Duyên": 2, "Vận Khí": 1, "Căn Cốt": -2 }],
  "Thú": [70, { "Căn Cốt": 3, "Ngộ Tính": -2 }],
};

TT.REALMS = ["Phàm Nhân", "Luyện Khí", "Trúc Cơ", "Kim Đan", "Nguyên Anh",
  "Hóa Thần", "Luyện Hư", "Đại Thừa", "Độ Kiếp"];

TT.REALM_COLORS = ["#cfd8dc", "#7fdcff", "#7fffa0", "#ffd24a", "#ff9f43",
  "#d980ff", "#ff6b9d", "#ffffff", "#ffe27a"];

TT.SEASONS = ["Xuân", "Hạ", "Thu", "Đông"];

TT.SKILLS = {
  "Dưỡng Khí Quyết": { cost: 30, realm: 0, exp: 0.20, power: 0, hp: 0, desc: "Tốc độ tu luyện +20%." },
  "Thanh Phong Kiếm Pháp": { cost: 60, realm: 1, exp: 0.0, power: 12, hp: 0, desc: "Chiến lực +12." },
  "Kim Cang Thể": { cost: 100, realm: 1, exp: 0.0, power: 0, hp: 80, desc: "Khí huyết tối đa +80." },
  "Huyền Thiên Chân Kinh": { cost: 250, realm: 2, exp: 0.35, power: 8, hp: 0, desc: "Tu luyện +35%, chiến lực +8." },
  "Cửu Thiên Lôi Pháp": { cost: 500, realm: 3, exp: 0.20, power: 30, hp: 40, desc: "Tu luyện +20%, chiến lực +30, khí huyết +40." },
};

TT.SECTS = {
  "Thanh Vân Tông": { realm: 1, exp: 0.10, power: 5, stipend: 8, disc: 1.0,
    desc: "Chính đạo. Tu luyện +10%, chiến lực +5, lương 8 linh thạch/năm." },
  "Huyết Sát Môn": { realm: 1, exp: 0.0, power: 20, stipend: 4, disc: 1.0,
    desc: "Ma đạo. Chiến lực +20, lương 4 linh thạch/năm." },
  "Vạn Dược Cốc": { realm: 1, exp: 0.05, power: 0, stipend: 15, disc: 0.7,
    desc: "Đan đạo. Mua đồ giảm 30%, lương 15 linh thạch/năm." },
};

TT.ITEMS = {
  "Tụ Khí Đan": { cost: 20, desc: "Hồi 15% tu vi cần thiết để lên tầng tiếp theo." },
  "Hồi Huyết Đan": { cost: 15, desc: "Hồi đầy khí huyết." },
  "Phá Cảnh Đan": { cost: 80, desc: "+20% tỉ lệ cho lần đột phá kế tiếp (cộng dồn tối đa 40%)." },
  "Trường Thọ Quả": { cost: 150, desc: "Thọ nguyên +8 năm." },
};

TT.MONSTERS = [
  ["Hắc Lang", "Độc Xà", "Hoang Thử Yêu"],
  ["Thiết Giáp Hùng", "Huyết Điêu", "Kiếm Xỉ Hổ"],
  ["Ma Hầu", "Thanh Giao", "Hỏa Lân Thú"],
  ["Cửu Vĩ Hồ", "Kim Dực Bằng", "Huyền Quy"],
  ["Thôn Thiên Mãng", "Long Tử", "Phượng Hoàng Ảnh"],
];

TT.MON_COLORS = ["#8a2be2", "#c0392b", "#1e8449", "#d68910", "#2874a6"];

/* ---------- nghề phụ ---------- */
TT.QN = ["Phế phẩm", "Hạ phẩm", "Trung phẩm", "Thượng phẩm", "Cực phẩm"];
TT.QMUL = [0.0, 1.0, 1.4, 1.8, 2.5];
TT.Q_CUT = [0.30, 0.50, 0.68, 0.84];

TT.MATS = {
  "Hạt Linh Thảo": { cost: 5, desc: "Gieo ở Linh điền, cây lớn theo thời gian thật, khoảng 6 phút thì thu hoạch Linh Thảo." },
  "Quặng Linh Thiết": { cost: 12, desc: "Nguyên liệu luyện khí." },
  "Giấy Phù": { cost: 4, desc: "Giấy để vẽ phù lục." },
};

TT.ALCH = { "Tụ Khí Đan": [3, 0], "Hồi Huyết Đan": [2, 0], "Phá Cảnh Đan": [5, 1] }; // [số Linh Thảo, cảnh giới]
TT.TALIS = { "Cường Lực Phù": ["loi", 0], "Hộ Thân Phù": ["khien", 0], "Phá Cảnh Phù": ["tinh", 1] };

TT.GEAR = {
  "Phi Kiếm": { mat: 3, realm: 0, power: 8, hp: 0, exp: 0.0, desc: v => `Chiến lực +${v}` },
  "Pháp Bào": { mat: 3, realm: 0, power: 0, hp: 30, exp: 0.0, desc: v => `Khí huyết tối đa +${v}` },
  "Linh Giới": { mat: 2, realm: 1, power: 0, hp: 0, exp: 0.05, desc: v => `Tốc độ tu luyện +${v}%` },
};

TT.USABLE = ["Tụ Khí Đan", "Hồi Huyết Đan", "Phá Cảnh Đan", "Cường Lực Phù", "Hộ Thân Phù", "Phá Cảnh Phù"];

TT.SELL_BASE = { "Linh Thảo": 4, "Tụ Khí Đan": 12, "Hồi Huyết Đan": 9, "Phá Cảnh Đan": 48, "Cường Lực Phù": 14,
  "Hộ Thân Phù": 14, "Phá Cảnh Phù": 40, "Phi Kiếm": 40, "Pháp Bào": 40, "Linh Giới": 60 };

TT.RIPE = 6; // "tháng" chín của Linh Thảo
/* Linh điền chạy theo thời gian thật: 1 "tháng linh điền" = STEP_S giây thật (cây chín sau RIPE x STEP_S giây).
   AWAY_MS: lần đồng bộ cách nhau lâu hơn mức này coi như người chơi vắng mặt - cây chỉ lớn đến lúc chín, không sâu bệnh / khô / héo. */
TT.FARM = { STEP_S: 60, AWAY_MS: 8000, PEST: 0.10 };

TT.SHAPES = {
  loi: [[.08, .18], [.55, .18], [.2, .5], [.85, .5], [.3, .85], [.92, .85]],
  khien: [[.5, .06], [.88, .25], [.82, .7], [.5, .94], [.18, .7], [.12, .25], [.5, .06]],
  tinh: [0, 2, 4, 1, 3, 0].map(k => [.5 + .46 * Math.sin(2 * Math.PI * k / 5), .54 - .46 * Math.cos(2 * Math.PI * k / 5)]),
  tran: [0, 1, 2, 3, 4, 5, 6].map(k => [.5 + .42 * Math.cos(Math.PI / 3 * k - Math.PI / 2), .5 + .42 * Math.sin(Math.PI / 3 * k - Math.PI / 2)]),
};

/* ---------- tiện ích ---------- */
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;       // random.randint
const uni = (a, b) => a + Math.random() * (b - a);                        // random.uniform
const pick = arr => arr[Math.floor(Math.random() * arr.length)];          // random.choice
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const int = Math.trunc;

TT.sellValue = (name, q) => {
  if (TT.MATS[name]) return Math.max(1, Math.floor(TT.MATS[name].cost / 2));
  return Math.max(1, int((TT.SELL_BASE[name] ?? 5) * TT.QMUL[q]));
};

TT.itemDesc = (name, q = 0) => {
  const m = TT.QMUL[q];
  switch (name) {
    case "Tụ Khí Đan": return `Tăng tu vi bằng ${int(15 * m)}% mức cần để lên tầng.`;
    case "Hồi Huyết Đan": return `Hồi ${Math.min(100, int(50 * m))}% khí huyết tối đa.`;
    case "Phá Cảnh Đan": return `+${int(15 * m)}% tỉ lệ đột phá lần tới.`;
    case "Cường Lực Phù": return `Trận đánh kế tiếp: chiến lực +${int(10 * m)}.`;
    case "Hộ Thân Phù": return `Trận đánh kế tiếp: nếu bị thương, giảm ${int(Math.min(85, 35 * m))}% sát thương.`;
    case "Phá Cảnh Phù": return `+${int(8 * m)}% tỉ lệ đột phá lần tới.`;
    case "Linh Thảo": return "Dược liệu dùng để luyện đan.";
  }
  if (TT.GEAR[name]) {
    const g = TT.GEAR[name];
    const v = g.power * m || g.hp * m || g.exp * m * 100;
    return g.desc(int(v));
  }
  if (TT.MATS[name]) return TT.MATS[name].desc;
  return "";
};

TT.fmtTime = sec => {
  sec = int(sec);
  if (sec >= 3600) return `${int(sec / 3600)} giờ ${int(sec % 3600 / 60)} phút`;
  if (sec >= 60) return `${int(sec / 60)} phút ${sec % 60} giây`;
  return `${sec} giây`;
};

TT.qualityOf = s => TT.Q_CUT.reduce((n, c) => n + (s >= c ? 1 : 0), 0);

/* màu */
const rgb = h => { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
TT.mix = (c1, c2, t) => {
  t = clamp(t, 0, 1);
  const a = rgb(c1), b = rgb(c2);
  return "#" + a.map((v, i) => Math.trunc(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

TT.C = { BG: "#10161c", PANEL: "#16202a", FG: "#e8e8e8", GREEN: "#3cff3c", DIM: "#8a9aa8",
  RED: "#ff5c5c", GOLD: "#ffd24a", CYAN: "#7fdcff", SKY: "#101a30" };
TT.FONT = "Consolas, 'Cascadia Mono', 'DejaVu Sans Mono', 'Courier New', monospace";
