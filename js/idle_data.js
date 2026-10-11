/* Dữ liệu + công thức thuần cho bản idle: nguyên tố / linh căn, tên nhân vật, bí cảnh.
   File này không đụng DOM nên có thể chạy thử bằng node (xem tools/sim_balance.mjs). */
"use strict";
(function () {
  /* ---------- hằng số idle ---------- */
  TT.IDLE = {
    TICK_MS: 1000,        // 1 nhịp idle = 1 giây thật
    MONTH_TICKS: 10,      // 10 nhịp = 1 tháng trong game
    FULL_RATE_S: 120,     // vắng mặt đến mức này vẫn tính đủ 100%
    OFFLINE_RATE: 0.5,    // quá mức đó chỉ tính 50%
    OFFLINE_CAP_S: 7200,  // tối đa 2 giờ (đã quy đổi) cho mỗi lần vắng mặt
    FARM_EVERY: 3,        // linh điền chỉ lớn 1 tháng sau mỗi 3 tháng idle
    REPORT_MIN_S: 60,     // vắng mặt lâu hơn mức này thì hiện bảng báo cáo
  };

  TT.newIdle = () => ({ ts: Date.now(), on: true, carry: 0, mt: 0, cd: 3 });
  TT.newSecret = () => ({ best: {}, cleared: {}, active: null });

  /* ---------- nguyên tố ---------- */
  TT.FIVE = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
  TT.RARE_EL = ["Lôi", "Băng", "Phong"];
  TT.BEATS = { "Kim": "Mộc", "Mộc": "Thổ", "Thổ": "Thủy", "Thủy": "Hỏa", "Hỏa": "Kim" };   // tương khắc: A khắc B
  TT.TEMPER_MAX = 10;
  TT.TEMPER_STEP = 0.08;                                                                 // mỗi cấp tôi luyện +8% hiệu quả nguyên tố

  TT.ELEMENTS = {
    "Kim": { color: "#e8d28a", atk: 0.12, crit: 0.02, story: "Sắc bén, cứng cỏi." },
    "Mộc": { color: "#6edc7a", hp: 0.10, regen: 0.5, story: "Sinh sôi, hồi phục." },
    "Thủy": { color: "#6ab8ff", exp: 0.10, dodge: 0.03, story: "Uyển chuyển, ngộ đạo." },
    "Hỏa": { color: "#ff7a45", atk: 0.06, crit: 0.06, story: "Bạo liệt, hủy diệt." },
    "Thổ": { color: "#c9a26a", def: 0.15, hp: 0.05, story: "Vững chãi, kiên cố." },
    "Lôi": { color: "#c58cff", atk: 0.18, crit: 0.08, story: "Dị căn: thiên lôi giáng thế." },
    "Băng": { color: "#9fe8ff", def: 0.15, exp: 0.10, story: "Dị căn: hàn khí vạn năm." },
    "Phong": { color: "#a8f0c8", dodge: 0.10, exp: 0.10, crit: 0.02, story: "Dị căn: nhẹ như gió." },
  };

  const LABELS = { atk: "Công kích", def: "Phòng ngự", hp: "Khí huyết", exp: "Tốc độ tu luyện", crit: "Chí mạng", dodge: "Né tránh", regen: "Hồi phục" };
  TT.elemDesc = (el, mul = 1) => {
    const e = TT.ELEMENTS[el]; if (!e) return "";
    return Object.keys(LABELS).filter(k => e[k]).map(k => `${LABELS[k]} +${Math.round(e[k] * mul * 100)}%`).join(", ");
  };

  /* ---------- linh căn ---------- */
  // n = số nguyên tố; w = trọng số khi gieo (tổng 97, 3 còn lại là Dị Linh Căn); exp = cộng tốc độ tu luyện; scale = hệ số hiệu quả mỗi nguyên tố
  TT.ROOT_TYPES = [
    { n: 1, name: "Thiên Linh Căn", exp: 0.40, scale: 1.00, w: 6 },
    { n: 2, name: "Song Linh Căn", exp: 0.20, scale: 0.80, w: 18 },
    { n: 3, name: "Tam Linh Căn", exp: 0.00, scale: 0.62, w: 34 },
    { n: 4, name: "Tứ Linh Căn", exp: -0.10, scale: 0.50, w: 27 },
    { n: 5, name: "Ngũ Linh Căn", exp: -0.20, scale: 0.40, w: 12 },
  ];
  const RARE_ROOT = { n: 1, name: "Dị Linh Căn", exp: 0.55, scale: 1.0 };

  TT.rollRoot = () => {
    if (rnd(1, 100) <= 3) return { els: [pick(TT.RARE_EL)] };
    let r = rnd(1, 97), n = 3;
    for (const t of TT.ROOT_TYPES) { if (r <= t.w) { n = t.n; break; } r -= t.w; }
    const pool = [...TT.FIVE], got = [];
    while (got.length < n) got.push(pool.splice(rnd(0, pool.length - 1), 1)[0]);
    return { els: TT.FIVE.filter(e => got.includes(e)) };           // giữ thứ tự Kim-Mộc-Thủy-Hỏa-Thổ
  };

  /** Làm sạch một linh căn đọc từ save: trả về null nếu không hợp lệ. */
  TT.cleanRoot = raw => {
    if (!raw || !Array.isArray(raw.els)) return null;
    const els = [...new Set(raw.els.filter(e => typeof e === "string" && Object.prototype.hasOwnProperty.call(TT.ELEMENTS, e)))];
    const rare = els.filter(e => TT.RARE_EL.includes(e)), five = TT.FIVE.filter(e => els.includes(e));
    if (rare.length) return { els: [rare[0]] };                      // Dị Linh Căn luôn đứng một mình
    return five.length ? { els: five } : null;
  };

  TT.rootInfo = root => {
    const els = root && Array.isArray(root.els) ? root.els : [];
    if (els.some(e => TT.RARE_EL.includes(e))) return { ...RARE_ROOT };
    const t = TT.ROOT_TYPES[Math.min(5, Math.max(1, els.length)) - 1];
    return { n: t.n, name: t.name, exp: t.exp, scale: t.scale };
  };
  TT.rootLabel = root => `${TT.rootInfo(root).name} (${root.els.join(", ")})`;

  /** Tổng hiệu quả của khóa key (atk/def/hp/exp/crit/dodge/regen) từ linh căn, đã tính tôi luyện. */
  TT.rootBonus = (p, key) => {
    const info = TT.rootInfo(p.root);
    let s = 0;
    for (const el of p.root.els) {
      const e = TT.ELEMENTS[el];
      if (e && e[key]) s += e[key] * info.scale * (1 + TT.TEMPER_STEP * (p.temper?.[el] || 0));
    }
    return s;
  };

  /** Tương sinh tương khắc giữa linh căn và nguyên tố của bí cảnh: cộng / trừ vào sát thương. */
  TT.affinity = (root, el) => {
    if (!el || !TT.FIVE.includes(el)) return 0;                      // bí cảnh Vô hệ: không thuận / nghịch
    const info = TT.rootInfo(root);
    let a = 0;
    for (const r of root.els) {
      if (TT.RARE_EL.includes(r)) { a += 0.12; continue; }           // dị căn: luôn có chút ưu thế
      if (r === el) a += 0.20 * info.scale;                           // đồng nguyên
      if (TT.BEATS[r] === el) a += 0.30 * info.scale;                 // mình khắc bí cảnh
      if (TT.BEATS[el] === r) a -= 0.25 * info.scale;                 // bí cảnh khắc mình
    }
    return Math.max(-0.35, Math.min(0.6, a));
  };

  /* ---------- tên nhân vật ---------- */
  const HO = ["Lý", "Trần", "Nguyễn", "Lâm", "Diệp", "Tiêu", "Hàn", "Tống", "Dương", "Mộ Dung", "Âu Dương", "Thượng Quan", "Tạ", "Cố", "Lăng", "Phong"];
  const DEM = { "Nam": ["Thanh", "Vô", "Huyền", "Chấn", "Hạo", "Minh", "Thiên", "Kiếm", "Trường", "Bất"], "Nữ": ["Tuyết", "Linh", "Bích", "Thanh", "Minh", "Ngọc", "Nguyệt", "Tử", "Diệu"] };
  const TEN = { "Nam": ["Vân", "Cực", "Phong", "Thiên", "Nhiên", "Hiên", "Phàm", "Dạ", "Sơn", "Hạo", "Lăng", "Nhai"], "Nữ": ["Nhi", "Lung", "Hà", "Ngọc", "Vi", "Sương", "Yên", "Lan", "Thủy", "Tâm", "Dao", "Anh"] };
  TT.NAME_MAX = 20;
  TT.randName = gender => { const g = gender === "Nữ" ? "Nữ" : "Nam"; return `${pick(HO)} ${pick(DEM[g])} ${pick(TEN[g])}`; };
  /** Làm sạch tên: bỏ ký tự điều khiển / ký tự HTML, gộp khoảng trắng, giới hạn độ dài. Trả về "" nếu rỗng. */
  TT.cleanName = raw => {
    if (typeof raw !== "string") return "";
    return raw.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f<>&"'`]/g, "").replace(/\s+/g, " ").trim().slice(0, TT.NAME_MAX).trim();
  };

  /* ---------- bí cảnh ---------- */
  // el: nguyên tố ("Vô" = vô hệ); realm: cảnh giới tối thiểu; dur: thời gian thám hiểm (giây thật); pw: chiến lực địch tầng 1; xp: hệ số thưởng
  TT.SECRETS = [
    { id: "moc", name: "Thanh Mộc Lâm", el: "Mộc", realm: 0, floors: 5, dur: 60, pw: 38, xp: 1.0, desc: "Rừng cổ linh khí dày đặc, yêu thú còn non yếu." },
    { id: "thuy", name: "Huyền Thủy Đàm", el: "Thủy", realm: 0, floors: 5, dur: 60, pw: 40, xp: 1.0, desc: "Đầm nước sâu thăm thẳm, thủy tộc ẩn mình dưới đáy." },
    { id: "hoa", name: "Xích Viêm Động", el: "Hỏa", realm: 1, floors: 6, dur: 90, pw: 70, xp: 1.3, desc: "Động dung nham nóng rực, hỏa linh hoành hành." },
    { id: "kim", name: "Kim Phong Cốc", el: "Kim", realm: 2, floors: 6, dur: 90, pw: 110, xp: 1.6, desc: "Thung lũng gió sắc như đao, kiếm khí đầy trời." },
    { id: "tho", name: "Hậu Thổ Thiên Cung", el: "Thổ", realm: 2, floors: 7, dur: 120, pw: 98, xp: 1.7, desc: "Cung điện chôn sâu dưới đất, khôi lỗi đá canh giữ." },
    { id: "ma", name: "Cửu U Ma Uyên", el: "Vô", realm: 3, floors: 8, dur: 150, pw: 135, xp: 2.1, desc: "Vực sâu ma khí cuồn cuộn, không thuộc ngũ hành." },
    { id: "loi", name: "Lôi Đình Cổ Điện", el: "Vô", realm: 5, floors: 9, dur: 180, pw: 168, xp: 2.8, desc: "Cổ điện bị thiên lôi tôi luyện qua ngàn năm." },
    { id: "tien", name: "Thái Cổ Tiên Phủ", el: "Vô", realm: 7, floors: 10, dur: 240, pw: 185, xp: 3.6, desc: "Di tích tiên nhân thượng cổ, hung hiểm khôn lường." },
  ];
  TT.secretById = id => TT.SECRETS.find(s => s.id === id) || null;

  /** Chiến lực địch ở tầng f (tầng cuối là Thủ Lĩnh, mạnh hơn 1,5 lần). */
  TT.secretEnemy = (def, f) => Math.round(def.pw * (1 + 0.2 * (f - 1)) * (f === def.floors ? 1.5 : 1));

  /** Mô phỏng một chuyến thám hiểm. Thuần hàm: chỉ đọc chỉ số của p, không sửa p.
      Trả về { cleared, hp, end, aff } với end: "clear" | "retreat" | "down". */
  TT.simSecret = (p, def, hp0, rng = Math.random) => {
    const aff = TT.affinity(p.root, def.el);
    const A = p.power() * (1 + aff), D = p.def(), crit = p.crit(), dodge = p.dodge(), maxhp = p.max_hp();
    let hp = hp0, cleared = 0, end = "clear";
    for (let f = 1; f <= def.floors; f++) {
      if (hp < maxhp * 0.3) { end = "retreat"; break; }
      // Sát thương địch tính theo % khí huyết tối đa và tỉ số chiến lực địch / ta, nên "địch lực"
      // so sánh trực tiếp được với "chiến lực" ở mọi cảnh giới. Phòng ngự làm giảm một phần sát thương.
      const P = TT.secretEnemy(def, f), ed = P * 0.1, ratio = P / A, mit = P / (P + 0.6 * D);
      let eh = P * 5, r = 0;
      while (eh > 0 && hp > 0 && r < 40) {
        r++;
        eh -= Math.max(A * 0.2, A * (0.9 + rng() * 0.2) * (rng() < crit ? 1.6 : 1) - ed);
        if (eh <= 0) break;
        if (rng() >= dodge) hp -= maxhp * 0.05 * ratio * mit * (0.9 + rng() * 0.2);
      }
      if (eh > 0) { end = "down"; break; }
      cleared = f;
    }
    if (end === "down") hp = Math.max(1, Math.round(maxhp * 0.1));
    return { cleared, hp: Math.max(1, Math.round(hp)), end, aff };
  };

  /** Ước lượng số tầng trung bình khi vào bí cảnh với khí huyết đầy (dùng seed cố định nên không nhấp nháy). */
  TT.estimateSecret = (p, def) => {
    let seed = 0; for (const c of def.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rng = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let sum = 0; const N = 10;
    for (let i = 0; i < N; i++) sum += TT.simSecret(p, def, p.max_hp(), rng).cleared;
    return sum / N;
  };
})();
