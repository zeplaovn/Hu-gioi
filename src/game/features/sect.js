/* Tông môn nâng cao: bảng nhiệm vụ chạy theo thời gian thật (cả khi đóng game), chức vị, cống hiến, kho tông môn.
   Dữ liệu + công thức thuần ở phần đầu (không đụng DOM); phần sau gắn vào vòng chơi (Game) và giao diện. */
"use strict";
(function () {
  const { C, SECTS } = TT;
  const G = TT.Game.prototype;
  const fmt = n => Math.round(n).toLocaleString("vi-VN");
  const clock = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const luckOf = p => p.stats["Phúc Duyên"] + p.stats["Vận Khí"];
  const rq = p => Math.max(1, Math.min(4, TT.qualityOf(Math.random() + luckOf(p) * 0.004)));

  /* =============================== DỮ LIỆU =============================== */
  TT.SECT = { MIN_HP: 0.4, FEATURED: 1.5, BIG: 2 };

  /** Chức vị: earned = tổng cống hiến đã kiếm được (không giảm khi tiêu); tier = bậc nhiệm vụ mở khóa. */
  TT.SECT_RANKS = [
    { name: "Ngoại Môn Đệ Tử", at: 0, exp: 0, stipend: 1.0, tier: 1 },
    { name: "Nội Môn Đệ Tử", at: 60, exp: 0.01, stipend: 1.3, tier: 2 },
    { name: "Chân Truyền Đệ Tử", at: 220, exp: 0.02, stipend: 1.7, tier: 3 },
    { name: "Chấp Sự", at: 600, exp: 0.03, stipend: 2.2, tier: 4 },
    { name: "Trưởng Lão", at: 1500, exp: 0.04, stipend: 3.0, tier: 5 },
    { name: "Thái Thượng Trưởng Lão", at: 3500, exp: 0.06, stipend: 4.0, tier: 5 },
  ];
  TT.newSectx = name => ({ name, earned: 0, contrib: 0, done: {}, active: null, auto: false, last: "" });

  TT.sectRank = p => {
    const R = TT.SECT_RANKS, earned = p && p.sectx ? p.sectx.earned : 0;
    let i = 0;
    for (let k = 0; k < R.length; k++) if (earned >= R[k].at) i = k;
    return { i, ...R[i], earned, next: R[i + 1] || null };
  };

  /* Mỗi bậc: thời gian cơ bản (giây thật), lượng tu vi (số "tháng tu luyện"), cống hiến cơ bản. */
  const TIER = {
    1: { dur: 30, x: 1.5, c: 6 }, 2: { dur: 60, x: 3, c: 11 }, 3: { dur: 100, x: 5, c: 20 },
    4: { dur: 160, x: 8, c: 34 }, 5: { dur: 270, x: 12, c: 55 },
  };
  TT.MISSIONS = [];
  let seq = 0;
  /** o: s = hệ số linh thạch, x = hệ số tu vi, c = hệ số cống hiến, it = vật phẩm [tên, xác suất, số lượng | [min, max]]. */
  const M = (sect, tier, id, name, desc, stat, o = {}) => {
    const t = TIER[tier], dm = 1 + ((seq++ % 3) - 1) * 0.15;
    TT.MISSIONS.push({ id, sect, tier, name, desc, stat, dur: Math.round(t.dur * dm), s: o.s || 1, x: t.x * (o.x || 1), c: Math.round(t.c * (o.c || 1)), it: o.it || [] });
  };
  /* --- chung cho mọi tông môn --- */
  M(null, 1, "tap1", "Quét dọn Tàng Kinh Các", "Dọn bụi sách cổ, tiện thể ngộ ra vài điều.", "Ngộ Tính", { x: 1.2 });
  M(null, 1, "tap2", "Canh giữ sơn môn", "Đứng gác cổng tông môn cả buổi, đuổi vài kẻ lạ mặt.", "Căn Cốt");
  M(null, 1, "tap3", "Vận chuyển vật tư", "Khiêng linh thạch và dược liệu giữa các phong.", "Căn Cốt", { s: 1.3, it: [["Giấy Phù", 0.4, 1]] });
  M(null, 2, "tap4", "Tuần tra ngoại vi", "Đi quanh ranh giới tông môn, xua đuổi yêu thú lảng vảng.", "Căn Cốt");
  M(null, 2, "tap5", "Khai thác quặng linh", "Xuống mỏ nhỏ của tông môn đào quặng.", "Căn Cốt", { it: [["Quặng Linh Thiết", 0.8, [1, 2]]] });
  M(null, 2, "tap6", "Hộ tống thương đội", "Đi cùng thương đội qua con đường nhiều sơn tặc.", "Tướng Mạo", { s: 1.5 });
  M(null, 3, "tap7", "Trấn áp yêu thú quấy phá", "Một bầy yêu thú làm loạn gần thôn trang của tông môn.", "Căn Cốt", { s: 1.2 });
  M(null, 3, "tap8", "Điều tra dị tượng", "Linh khí lạ xuất hiện ở sườn núi, cần người đi xem xét.", "Phúc Duyên", { x: 1.2, it: [["Linh Thảo", 0.5, 1]] });
  M(null, 3, "tap9", "Truyền công cho sư đệ", "Chỉ điểm các đệ tử mới, bản thân cũng ngộ ra điều mới.", "Ngộ Tính", { x: 1.5 });
  M(null, 4, "tap10", "Đột kích sào huyệt yêu thú", "Dẫn đội tiêu diệt ổ yêu thú đang hoành hành.", "Căn Cốt", { s: 1.4, c: 1.2 });
  M(null, 4, "tap11", "Hộ tống trưởng lão", "Đi cùng một vị trưởng lão tới buổi hội đàm giữa các tông môn.", "Tướng Mạo", { s: 1.6 });
  M(null, 4, "tap12", "Dò xét di tích cổ", "Vào di tích mới lộ ra, tìm bảo vật còn sót lại.", "Phúc Duyên", { x: 1.3, it: [["Phá Cảnh Đan", 0.15, 1]] });
  M(null, 5, "tap13", "Trấn thủ phong ấn", "Canh giữ phong ấn cổ, tâm không được loạn dù bị quấy nhiễu.", "Ngộ Tính", { x: 1.4, c: 1.2 });
  M(null, 5, "tap14", "Truy sát tà tu", "Săn lùng kẻ tu luyện tà thuật đang lẩn trốn.", "Căn Cốt", { s: 1.5, c: 1.3 });
  M(null, 5, "tap15", "Thám hiểm bí cảnh riêng của tông môn", "Đi sâu vào bí cảnh cấm địa, tìm cơ duyên cho tông môn.", "Vận Khí", { x: 1.5, it: [["Trường Thọ Quả", 0.12, 1]] });
  /* --- Thanh Vân Tông (chính đạo) --- */
  const TV = "Thanh Vân Tông";
  M(TV, 1, "tv1", "Giảng đạo cho phàm nhân", "Xuống núi kể chuyện tu tiên cho dân làng, nhận chút lễ tạ.", "Tướng Mạo");
  M(TV, 1, "tv2", "Diệt sói hoang quanh thôn", "Bảo vệ dân làng khỏi bầy sói đói.", "Căn Cốt", { s: 1.2 });
  M(TV, 2, "tv3", "Cứu viện thôn làng gặp yêu họa", "Chạy tới thôn nhỏ đang bị yêu thú tấn công.", "Căn Cốt", { c: 1.2 });
  M(TV, 2, "tv4", "Dẫn đường cho đệ tử mới", "Đưa các tân đệ tử lên núi và giảng quy củ.", "Tướng Mạo", { x: 1.2 });
  M(TV, 3, "tv5", "Phá trận pháp của ma tu", "Tháo dỡ trận pháp ma đạo cài ở vùng biên.", "Ngộ Tính", { s: 1.3 });
  M(TV, 3, "tv6", "Bảo vệ Linh Mạch của tông môn", "Ngăn kẻ lạ phá hoại mạch linh khí của tông môn.", "Căn Cốt", { c: 1.3 });
  M(TV, 4, "tv7", "Chủ trì khảo hạch nội môn", "Chấm điểm đệ tử, thấy cách tu luyện của người khác mà ngộ thêm.", "Ngộ Tính", { x: 1.4 });
  M(TV, 4, "tv8", "Săn yêu vương trong núi", "Một yêu vương đang quấy phá vùng đất của tông môn.", "Căn Cốt", { s: 1.5, c: 1.2, it: [["Phá Cảnh Đan", 0.2, 1]] });
  M(TV, 5, "tv9", "Tọa trấn hộ tông đại trận", "Dùng linh lực duy trì đại trận hộ tông suốt thời gian dài.", "Ngộ Tính", { x: 1.5, c: 1.3 });
  M(TV, 5, "tv10", "Chinh phạt ma đạo biên cương", "Dẫn đội đánh chặn ma đạo xâm lấn.", "Căn Cốt", { s: 1.6, c: 1.4 });
  /* --- Huyết Sát Môn (ma đạo) --- */
  const HS = "Huyết Sát Môn";
  M(HS, 1, "hs1", "Thu thập huyết khí yêu thú", "Săn yêu thú nhỏ lấy huyết khí luyện công.", "Căn Cốt", { it: [["Hồi Huyết Đan", 0.3, 1]] });
  M(HS, 1, "hs2", "Chặn một chuyến hàng nhỏ", "Chặn đường thương đội lẻ loi, lấy lộ phí.", "Vận Khí", { s: 1.6 });
  M(HS, 2, "hs3", "Săn Huyết Điêu lấy tinh huyết", "Tinh huyết Huyết Điêu là vật liệu quý của môn phái.", "Căn Cốt", { s: 1.2 });
  M(HS, 2, "hs4", "Thu phục thôn trại ngoan cố", "Ép một thôn trại nộp cống cho môn phái.", "Tướng Mạo", { s: 1.5 });
  M(HS, 3, "hs5", "Tế luyện huyết đan", "Phụ giúp trưởng lão tế luyện đan dược bằng huyết khí.", "Ngộ Tính", { x: 1.4 });
  M(HS, 3, "hs6", "Phục kích đệ tử chính đạo", "Mai phục nhóm đệ tử chính đạo đi lẻ.", "Căn Cốt", { s: 1.4, c: 1.2 });
  M(HS, 4, "hs7", "Luyện hóa huyết trì", "Ngâm mình trong huyết trì để luyện hóa huyết khí.", "Ngộ Tính", { x: 1.6 });
  M(HS, 4, "hs8", "Chiếm đoạt linh mạch của môn phái nhỏ", "Thôn tính một môn phái yếu để mở rộng địa bàn.", "Căn Cốt", { s: 1.7, c: 1.2 });
  M(HS, 5, "hs9", "Chủ trì huyết tế đại điển", "Dẫn dắt nghi lễ lớn nhất của môn phái.", "Ngộ Tính", { x: 1.6, c: 1.3 });
  M(HS, 5, "hs10", "Trấn áp phản đồ trong môn", "Truy bắt kẻ phản bội cầm đầu cuộc nổi loạn.", "Căn Cốt", { s: 1.6, c: 1.4 });
  /* --- Vạn Dược Cốc (đan đạo) --- */
  const VD = "Vạn Dược Cốc";
  M(VD, 1, "vd1", "Hái thảo dược trong cốc", "Hái dược thảo mọc quanh cốc.", "Phúc Duyên", { it: [["Linh Thảo", 0.7, [1, 2]]] });
  M(VD, 1, "vd2", "Phân loại dược liệu", "Chọn lọc và phân loại dược liệu theo phẩm chất.", "Ngộ Tính", { x: 1.3 });
  M(VD, 2, "vd3", "Chữa bệnh cho phàm nhân", "Xuống núi bốc thuốc cho dân làng, nhận thù lao.", "Tướng Mạo", { s: 1.4 });
  M(VD, 2, "vd4", "Chăm sóc vườn linh dược", "Tưới nước, bón đất cho vườn linh dược của cốc.", "Phúc Duyên", { it: [["Hạt Linh Thảo", 0.7, [1, 2]]] });
  M(VD, 3, "vd5", "Tìm Huyết Tham trong rừng độc", "Vào rừng độc tìm loại dược quý chỉ mọc nơi hiểm địa.", "Vận Khí", { s: 1.1, it: [["Linh Thảo", 0.8, [2, 3]]] });
  M(VD, 3, "vd6", "Phụ luyện đan cho trưởng lão", "Giữ lửa và thả dược liệu theo lệnh trưởng lão.", "Ngộ Tính", { x: 1.4, it: [["Tụ Khí Đan", 0.4, 1]] });
  M(VD, 4, "vd7", "Thu mua dược liệu quý hiếm", "Đi các thành lớn thu mua dược liệu cho cốc.", "Tướng Mạo", { s: 1.7 });
  M(VD, 4, "vd8", "Giải độc cho đồng môn", "Một nhóm đồng môn trúng độc, cần người pha giải dược.", "Ngộ Tính", { x: 1.4, c: 1.3, it: [["Hồi Huyết Đan", 0.6, [1, 2]]] });
  M(VD, 5, "vd9", "Hỗ trợ luyện Cửu Chuyển Hoàn Hồn Đan", "Góp sức vào mẻ đan quý nhất của cốc.", "Ngộ Tính", { x: 1.7, c: 1.3, it: [["Phá Cảnh Đan", 0.3, 1]] });
  M(VD, 5, "vd10", "Tìm linh dược vạn năm", "Truyền thuyết nói có linh dược vạn năm nơi vách núi hiểm.", "Vận Khí", { x: 1.4, c: 1.3, it: [["Trường Thọ Quả", 0.18, 1]] });

  TT.MISSION_IDS = TT.MISSIONS.map(m => m.id);
  TT.missionById = id => TT.MISSIONS.find(m => m.id === id) || null;
  /** Nhiệm vụ mà người chơi (của tông môn p.sect) có thể thấy, đã sắp xếp theo bậc. */
  TT.missionsFor = sect => TT.MISSIONS.filter(m => !m.sect || m.sect === sect);

  /** Tỉ lệ thành công / xuất sắc: so sánh chiến lực với mức yêu cầu của bậc, cộng chỉ số liên quan. */
  TT.missionOdds = (p, def) => {
    const ref = (24 + p.level * 3.4) * (0.5 + 0.17 * def.tier);
    const chance = Math.max(0.1, Math.min(0.95, 0.12 + 0.5 * (p.power() / ref) + 0.012 * p.stats[def.stat]));
    return { chance, big: Math.min(0.3, 0.06 + luckOf(p) * 0.002), ref };
  };
  TT.missionReward = (p, def) => ({ stone: Math.round((6 + p.realm * 8 + def.tier * 8) * def.s), xk: def.x, contrib: def.c });

  /** Nhiệm vụ nổi bật trong ngày (theo ngày thật): thưởng x1.5. Cố định trong cả ngày nên không thể "reroll". */
  TT.featuredMission = (p, now = Date.now()) => {
    if (!p.sect || !p.sectx) return null;
    const rk = TT.sectRank(p), list = TT.missionsFor(p.sect).filter(m => m.tier <= rk.tier);
    if (!list.length) return null;
    let h2 = Math.floor(now / 86400000) * 2654435761 % 4294967296;
    for (const ch of p.sect) h2 = (h2 * 31 + ch.charCodeAt(0)) >>> 0;
    return list[h2 % list.length];
  };

  /** Kho tông môn: đổi cống hiến lấy vật phẩm. rank = chức vị tối thiểu (chỉ số trong SECT_RANKS). */
  TT.SECT_SHOP = [
    { name: "Tụ Khí Đan", n: 2, q: 2, cost: 12, rank: 0 },
    { name: "Hồi Huyết Đan", n: 2, q: 2, cost: 10, rank: 0 },
    { name: "Quặng Linh Thiết", n: 3, q: 0, cost: 18, rank: 0 },
    { name: "Giấy Phù", n: 5, q: 0, cost: 12, rank: 0 },
    { name: "Hạt Linh Thảo", n: 3, q: 0, cost: 14, rank: 1 },
    { name: "Phá Cảnh Đan", n: 1, q: 2, cost: 70, rank: 2 },
    { name: "Tinh Hoa (nguyên tố linh căn của bạn)", n: 3, ess: true, cost: 60, rank: 2 },
    { name: "Trường Thọ Quả", n: 1, q: 0, cost: 110, rank: 3 },
    { sect: "Vạn Dược Cốc", name: "Linh Thảo", n: 4, q: 2, cost: 20, rank: 0 },
    { sect: "Huyết Sát Môn", name: "Cường Lực Phù", n: 2, q: 2, cost: 25, rank: 1 },
    { sect: "Thanh Vân Tông", name: "Hộ Thân Phù", n: 2, q: 2, cost: 25, rank: 1 },
  ];

  /* =============================== VÒNG CHƠI =============================== */
  G.missionHpOk = function () { return this.p.hp >= this.p.max_hp() * TT.SECT.MIN_HP; };

  G.missionStart = function (id, silent) {
    const p = this.p, X = p.sectx, def = TT.missionById(id);
    if (!def || !X || !p.sect || this.dead || X.active) return false;
    if (def.sect && def.sect !== p.sect) return false;
    if (def.tier > TT.sectRank(p).tier) return false;
    if (p.secret && p.secret.active) { if (!silent) this.log("Bạn đang thám hiểm bí cảnh, hãy đợi xong rồi mới nhận nhiệm vụ.", "red"); return false; }
    if (!this.missionHpOk()) { if (!silent) this.log("Khí huyết dưới 40%, hãy hồi phục trước khi nhận nhiệm vụ.", "red"); return false; }
    const now = Date.now(), f = TT.featuredMission(p, now);
    X.active = { id, start: now, end: now + def.dur * 1000, bonus: !!(f && f.id === id) };
    X.last = id;
    if (!silent) {
      this.log(`Bạn nhận nhiệm vụ [${def.name}], dự kiến ${TT.fmtTime(def.dur)}.`, "cyan");
      this.scene.floatText("Nhận nhiệm vụ", C.CYAN); this.scene.addRing(C.CYAN);
    }
    this.autosave(); this.idleRefresh();
    return true;
  };

  G.missionAbort = function () {
    const X = this.p.sectx, def = X && X.active && TT.missionById(X.active.id);
    if (!def) return;
    X.active = null; X.auto = false;
    this.log(`Bạn bỏ dở nhiệm vụ [${def.name}], không nhận được phần thưởng.`, "dim");
    this.autosave(); this.idleRefresh();
  };

  G.missionCheck = function () {
    const a = this.p && this.p.sectx && this.p.sectx.active;
    if (a && Date.now() >= a.end) this.missionResolve();
  };

  G.missionResolve = function () {
    const p = this.p, X = p.sectx, a = X && X.active, def = a && TT.missionById(a.id);
    if (!X) return;
    X.active = null;
    if (!def) return;
    const odds = TT.missionOdds(p, def), rk0 = TT.sectRank(p).i;
    const res = { def, ok: Math.random() < odds.chance, big: false, featured: !!a.bonus, stone: 0, exp: 0, contrib: 0, items: {}, hpLoss: 0, promoted: "" };
    if (res.ok) {
      res.big = Math.random() < odds.big;
      const mul = (res.big ? TT.SECT.BIG : 1) * (a.bonus ? TT.SECT.FEATURED : 1), rw = TT.missionReward(p, def);
      res.stone = Math.round(rw.stone * mul); p.stone += res.stone;
      res.exp = this.encExp(rw.xk * mul);
      res.contrib = Math.round(rw.contrib * mul); X.earned += res.contrib; X.contrib += res.contrib;
      for (const [name, chance, n] of def.it) {
        if (Math.random() >= Math.min(1, chance * (res.big ? 1.5 : 1))) continue;
        const k = Array.isArray(n) ? rnd(n[0], n[1]) : n, q = TT.MATS[name] ? 0 : rq(p);
        this.invAdd(name, q, k, true);
        const key = q ? `${name} [${TT.QN[q]}]` : name;
        res.items[key] = (res.items[key] || 0) + k;
      }
      X.done[def.id] = (X.done[def.id] || 0) + 1;
      p.track.missions++; if (res.big) p.track.mbig++; if (def.tier >= 4) p.track.mhard++; if (a.bonus) p.track.mfeat++;
      const rk1 = TT.sectRank(p);
      if (rk1.i > rk0) res.promoted = rk1.name;
    } else {
      p.track.mfail++;
      res.hpLoss = Math.max(0, Math.min(p.hp - 1, Math.round(p.max_hp() * (0.15 + 0.05 * def.tier))));
      p.hp -= res.hpLoss;
    }
    const head = res.ok ? `${res.big ? "xuất sắc " : ""}hoàn thành` : "thất bại";
    this.log(`Nhiệm vụ tông môn [${def.name}] ${head}.` + (res.ok ? ` Linh thạch +${fmt(res.stone)}, tu vi +${fmt(res.exp)}, cống hiến +${fmt(res.contrib)}.` : ` Khí huyết -${fmt(res.hpLoss)}.`), res.ok ? "cyan" : "red");
    if (res.promoted) this.log(`★ Bạn được thăng chức: ${res.promoted}!`, "gold");
    if (this.quiet) { if (this.rep) (this.rep.missions ||= []).push(res); }
    else {
      const sc = this.scene;
      if (sc) {
        sc.floatText(res.ok ? (res.big ? "Nhiệm vụ xuất sắc!" : "Nhiệm vụ hoàn thành") : "Nhiệm vụ thất bại", res.ok ? (res.big ? C.GOLD : C.CYAN) : C.RED);
        if (res.ok) sc.addRing(res.big ? C.GOLD : C.CYAN);
        if (res.promoted) { sc.flash("#ffd24a", 14); sc.burst(sc.cx, sc.gy - 60, "#ffd24a", 48); sc.addRing("#ffffff"); }
      }
      // tự động nhận lại đúng nhiệm vụ vừa làm (chỉ khi bạn đang có mặt)
      if (X.auto && res.ok && !res.promoted && this.missionStart(def.id, true)) this.log(`Tự động nhận lại nhiệm vụ [${def.name}].`, "dim");
      else { X.auto = X.auto && res.ok; this.showMissionResult(res); }
    }
    this.autosave(); this.idleRefresh(); this.refresh();
  };

  /** Rời tông môn / gia nhập: dọn trạng thái nhiệm vụ. */
  G.sectEnter = function (name) { this.p.sect = name; this.p.sectx = TT.newSectx(name); };
  G.sectExit = function () { this.p.sect = null; this.p.sectx = null; };

  G.sectBuy = function (it) {
    const p = this.p, X = p.sectx;
    if (!X || X.contrib < it.cost || TT.sectRank(p).i < it.rank) return false;
    if (it.ess) {
      const el = pick(p.root.els); p.ess[el] = (p.ess[el] || 0) + it.n;
      this.log(`Đổi ${it.cost} cống hiến lấy ${it.n} Tinh Hoa ${el}.`, "gold");
    } else {
      this.invAdd(it.name, it.q, it.n, true);
      this.log(`Đổi ${it.cost} cống hiến lấy ${it.n} ${it.name}${it.q ? ` [${TT.QN[it.q]}]` : ""}.`, "gold");
    }
    X.contrib -= it.cost; p.track.sshop++;
    this.scene.floatText("Đổi vật phẩm", C.GOLD);
    this.refresh(); this.autosave();
    return true;
  };

  /* =============================== GIAO DIỆN =============================== */
  const kidsOf = (...a) => a.flat().filter(Boolean);
  const alive = w => w && w.m.overlay.isConnected;
  const sgn = v => Math.round(v * 100) + "%";

  /** Hộp thoại tự vẽ lại: redraw() gọi tay khi thao tác; mỗi giây tự vẽ lại nếu đang có (hoặc vừa có) nhiệm vụ chạy. */
  const liveBox = (cls, build) => {
    const m = TT.ui.modal("dlg-box " + cls, () => close());
    let timer = 0, was = false;
    const close = () => { clearInterval(timer); m.close(); };
    const redraw = () => {
      if (!m.overlay.isConnected) { clearInterval(timer); return; }
      const old = m.box.querySelector(".rows"), top = old ? old.scrollTop : 0;
      m.box.replaceChildren(...build(close, redraw).filter(x => x != null && x !== false));   // replaceChildren biến null thành chữ "null"
      const now = m.box.querySelector(".rows");
      if (now) now.scrollTop = top;
    };
    redraw();
    timer = setInterval(() => {
      const g = TT.game, run = !!(g && g.p && g.p.sectx && g.p.sectx.active);
      if (run || was) redraw();
      was = run;
    }, 1000);
    return { m, redraw, close };
  };

  const section = t => h("div", { class: "t-green bold sec center" }, `— ${t} —`);
  const TIER_COLOR = ["", "#9fb4c4", "#7fdcff", "#7fffa0", "#ffd24a", "#ff9f43"];

  const rewardText = (p, def, mul = 1) => {
    const rw = TT.missionReward(p, def);
    const items = def.it.map(([n, c]) => `${n} (${Math.round(c * 100)}%)`).join(", ");
    return `Linh thạch ~${fmt(rw.stone * mul)} · tu vi ~${fmt(rw.xk * mul)} tháng tu luyện · cống hiến ${fmt(rw.contrib * mul)}${items ? " · có thể rơi: " + items : ""}`;
  };

  G.openMissions = function () {
    if (alive(this.missionWin)) return;
    this.missionWin = liveBox("mission-box", (close, redraw) => {
      const p = this.p, X = p.sectx;
      if (!X || !p.sect) return [h("h2", { class: "mtitle" }, "Bảng nhiệm vụ"), h("div", { class: "dim center" }, "Bạn chưa gia nhập tông môn."), h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" }))];
      const rk = TT.sectRank(p), feat = TT.featuredMission(p), a = X.active, adef = a && TT.missionById(a.id);
      const hpOk = this.missionHpOk(), secretBusy = !!(p.secret && p.secret.active);
      const head = [
        h("h2", { class: "mtitle" }, `Bảng nhiệm vụ - ${p.sect}`),
        h("div", { class: "center" }, h("span", { class: "gold bold" }, rk.name), h("span", { class: "dim small" }, `   cống hiến còn ${fmt(X.contrib)} · tổng ${fmt(rk.earned)}${rk.next ? " / " + fmt(rk.next.at) + " để lên " + rk.next.name : " (chức vị cao nhất)"}`)),
        rk.next ? h("div", { class: "rank-bar" }, h("i", { style: { width: Math.round(Math.max(0, Math.min(1, (rk.earned - rk.at) / (rk.next.at - rk.at))) * 100) + "%" } })) : null,
        h("div", { class: "dim small center hub-note" }, `Chức vị tăng tốc độ tu luyện ${sgn(rk.exp)} và lương năm x${rk.stipend.toFixed(1)}. Nhiệm vụ chạy theo thời gian thật, kể cả khi bạn đóng game; thất bại sẽ mất khí huyết (cần từ 40% để nhận).`),
      ];
      if (adef) {
        const total = a.end - a.start, left = Math.max(0, a.end - Date.now());
        const bar = new TT.ui.Bar("#3f9bd6", 16); bar.set(total - left, total, clock(left / 1000));
        head.push(h("div", { class: "panel mission-run" }, h("div", { class: "bold cyan" }, `⚔ Đang làm: ${adef.name}${a.bonus ? "  ★ nổi bật" : ""}`), bar.el,
          h("div", { class: "row center" }, TT.ui.btn("Bỏ dở", () => {
            TT.ui.confirm({ title: "Bỏ dở nhiệm vụ?", text: "Bỏ dở nhiệm vụ sẽ không nhận được phần thưởng.", ok: "Bỏ dở", cancel: "Làm tiếp", danger: true })
              .then(yes => { if (yes && this.inGame && this.p === p && p.sectx && p.sectx.active) { this.missionAbort(); redraw(); } });
          }, { cls: "red sm" }))));
      }
      head.push(h("div", { class: "row center" },
        TT.ui.btn(`Tự động nhận lại: ${X.auto ? "BẬT" : "TẮT"}`, () => { X.auto = !X.auto; this.autosave(); redraw(); }, { cls: (X.auto ? "gold" : "dimbtn") + " sm", title: "Khi bạn đang có mặt và nhiệm vụ thành công, tự nhận lại đúng nhiệm vụ đó." }),
        TT.ui.btn("Kho tông môn", () => this.openSectShop(), { cls: "cyan sm" })));

      const list = TT.missionsFor(p.sect), open = list.filter(m => m.tier <= rk.tier), nextTier = rk.tier < 5 ? rk.tier + 1 : 0;
      const rows = [];
      for (let t = rk.tier; t >= 1; t--) {
        rows.push(h("div", { class: "bold sec", style: { color: TIER_COLOR[t] } }, `Bậc ${t}`));
        for (const def of open.filter(m => m.tier === t)) {
          const o = TT.missionOdds(p, def), isF = feat && feat.id === def.id, runningThis = adef && adef.id === def.id;
          const btn = TT.ui.btn(runningThis ? "Đang làm" : "Nhận", () => { if (this.missionStart(def.id)) redraw(); },
            { cls: "gold sm", disabled: !!a || !hpOk || secretBusy || this.dead });
          rows.push(h("div", { class: "row-item panel mission-row" + (isF ? " featured" : "") },
            h("div", { class: "tier-chip", style: { color: TIER_COLOR[def.tier], borderColor: TIER_COLOR[def.tier] } }, "B" + def.tier),
            h("div", { class: "info" },
              h("div", { class: "bold" }, def.name, isF ? h("span", { class: "gold small" }, "   ★ Nổi bật hôm nay: thưởng x" + TT.SECT.FEATURED) : null),
              h("div", { class: "dim small" }, def.desc),
              h("div", { class: "small" }, `${TT.fmtTime(def.dur)} · `, h("span", { style: { color: o.chance >= 0.8 ? C.GREEN : o.chance >= 0.55 ? C.GOLD : C.RED } }, `thành công ~${Math.round(o.chance * 100)}%`), ` · cần ${def.stat}`),
              h("div", { class: "cyan small" }, rewardText(p, def, isF ? TT.SECT.FEATURED : 1)),
              X.done[def.id] ? h("div", { class: "dim small" }, `Đã hoàn thành ${X.done[def.id]} lần`) : null),
            h("div", { class: "row-btns" }, btn)));
        }
      }
      if (nextTier) {
        const nr = TT.SECT_RANKS.find(r => r.tier === nextTier), lockedN = list.filter(m => m.tier === nextTier).length;
        rows.push(h("div", { class: "row-item panel locked" }, h("div", { class: "info" },
          h("div", { class: "bold" }, `🔒 Bậc ${nextTier}: ${lockedN} nhiệm vụ`), h("div", { class: "red-t small" }, `Cần chức vị ${nr.name} (${fmt(nr.at)} cống hiến tổng cộng)`))));
      }
      if (!hpOk) head.push(h("div", { class: "red-t center small" }, "Khí huyết dưới 40%: hãy nhập định hồi phục trước khi nhận nhiệm vụ."));
      return [...head, h("div", { class: "rows" }, rows), h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" }))];
    });
  };

  G.openSectShop = function () {
    if (alive(this.shopWin)) return;
    this.shopWin = liveBox("shop-box", (close, redraw) => {
      const p = this.p, X = p.sectx;
      if (!X || !p.sect) return [h("h2", { class: "mtitle" }, "Kho tông môn"), h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" }))];
      const rk = TT.sectRank(p);
      const rows = TT.SECT_SHOP.filter(it => !it.sect || it.sect === p.sect).map(it => {
        const locked = rk.i < it.rank, afford = X.contrib >= it.cost;
        const b = TT.ui.btn(`Đổi (${it.cost})`, () => { if (this.sectBuy(it)) redraw(); }, { cls: "gold sm", disabled: locked || !afford });
        const q = it.q ? ` [${TT.QN[it.q]}]` : "";
        return h("div", { class: "row-item panel" + (locked ? " locked" : "") }, h("div", { class: "info" },
          h("div", { class: "bold" }, `${it.name}${q}  x${it.n}`),
          locked ? h("div", { class: "red-t small" }, `Cần chức vị ${TT.SECT_RANKS[it.rank].name}`) : h("div", { class: "dim small" }, afford ? "Đủ cống hiến để đổi." : "Chưa đủ cống hiến.")),
          h("div", { class: "row-btns" }, b));
      });
      return [h("h2", { class: "mtitle" }, "Kho tông môn"),
        h("div", { class: "cyan center pw" }, `Cống hiến hiện có: ${fmt(X.contrib)}   ·   Chức vị: ${rk.name}`),
        h("div", { class: "dim small center hub-note" }, "Cống hiến kiếm từ nhiệm vụ tông môn. Tiêu cống hiến không làm giảm chức vị."),
        h("div", { class: "rows" }, rows), h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" }))];
    });
  };

  /** Các dòng mô tả kết quả một nhiệm vụ (dùng cho hộp thoại kết quả và bảng báo cáo vắng mặt). */
  TT.missionLines = res => {
    const { def } = res, L = [];
    L.push(h("div", { class: res.ok ? (res.big ? "t-gold bold center" : "bold center") : "red-t bold center" }, `${def.name}: ${res.ok ? (res.big ? "hoàn thành xuất sắc!" : "hoàn thành") : "thất bại"}`));
    if (res.ok) {
      L.push(h("div", { class: "cyan" }, `Linh thạch +${fmt(res.stone)}    Tu vi +${fmt(res.exp)}    Cống hiến +${fmt(res.contrib)}`));
      const items = Object.entries(res.items);
      if (items.length) L.push(h("div", { class: "green" }, "Vật phẩm: " + items.map(([k, n]) => `${k} x${n}`).join(", ")));
      if (res.featured) L.push(h("div", { class: "gold small" }, `★ Nhiệm vụ nổi bật: thưởng x${TT.SECT.FEATURED}`));
      if (res.big) L.push(h("div", { class: "gold small" }, `Thành công xuất sắc: thưởng x${TT.SECT.BIG}`));
      if (res.promoted) L.push(h("div", { class: "gold bold" }, `★ Thăng chức: ${res.promoted}!`));
    } else L.push(h("div", { class: "dim small" }, `Nhiệm vụ không như ý, khí huyết -${fmt(res.hpLoss)}.`));
    return L;
  };

  G.showMissionResult = function (res) {
    const m = TT.ui.modal("dlg-box report-box", () => m.close());
    m.box.append(h("h2", { class: "mtitle" }, "Kết quả nhiệm vụ"), h("div", { class: "rows report-lines" }, TT.missionLines(res)),
      h("div", { class: "row center" }, TT.ui.btn("Đóng", () => m.close(), { cls: "gold" })));
  };
})();
