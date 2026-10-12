/* Tiến trình xuyên kiếp: Thiên Mệnh (nâng cấp vĩnh viễn), Thành tựu, Bia Thiên Đạo (lịch sử các kiếp),
   và quản lý dữ liệu (xuất / nhập / xóa save). Lưu riêng ở khóa tu_tien_meta_v1 nên không đụng tới save cũ. */
"use strict";
(function () {
  const KEY = "tu_tien_meta_v1", SAVE_KEY = "tu_tien_save_v2", FLAG = "tu_tien_sec_v1", MAX_HISTORY = 20;

  /* ---------- Thiên Mệnh: nâng cấp vĩnh viễn, mua bằng điểm nhận được khi chết / phi thăng ---------- */
  const UP = {
    pts: { name: "Thiên Tư", icon: "clover", cost: [3, 5, 8, 12, 18], desc: "+1 điểm phân bổ chỉ số khi tạo nhân vật mỗi cấp." },
    stone: { name: "Túi Càn Khôn", icon: "crystal", cost: [2, 3, 4, 6, 8], desc: "+20 linh thạch khởi đầu mỗi cấp." },
    life: { name: "Trường Sinh", icon: "peach", cost: [3, 4, 6, 8, 12], desc: "+5 năm thọ nguyên khởi đầu mỗi cấp." },
    exp: { name: "Đạo Tâm", icon: "orb_blue", cost: [4, 6, 9, 13, 18], desc: "+3% tốc độ tu luyện vĩnh viễn mỗi cấp." },
    luck: { name: "Thiên Vận", icon: "orb_gold", cost: [5, 9, 14], desc: "+1 Vận Khí khởi đầu mỗi cấp." },
  };

  /* ---------- Thành tựu ---------- */
  const RN = ["", "Luyện Khí", "Trúc Cơ", "Kim Đan", "Nguyên Anh", "Hóa Thần", "Luyện Hư", "Đại Thừa", "Độ Kiếp"];
  const ACH = [];
  /** Nhóm hiển thị trong Thiên Đạo Các (theo thứ tự). */
  const CATS = ["Cảnh giới", "Đột phá & Kiếp", "Chiến đấu", "Kỳ ngộ", "Bí cảnh", "Linh căn & Chỉ số", "Tông môn", "Nghề phụ & Của cải", "Tu hành & Luân hồi"];
  /** prog (tuỳ chọn): (p, M) => [hiện có, mục tiêu] để hiện thanh tiến độ khi chưa đạt. */
  const add = (cat, id, name, desc, pts, icon, ok, prog) => ACH.push({ id, cat, name, desc, pts, icon, ok, prog });
  /** Thành tựu dạng đếm: get(p, M) >= n. */
  const cnt = (cat, id, name, desc, pts, icon, get, n) => add(cat, id, name, desc, pts, icon, (p, M) => get(p, M) >= n, (p, M) => [Math.min(n, get(p, M)), n]);
  const nSecret = p => Object.keys(p.secret?.cleared || {}).length;
  const maxStat = p => Math.max(...TT.STATS.map(s => p.stats[s]));
  const maxTemper = p => Math.max(0, ...Object.values(p.temper || {}));
  const rankOf = p => (TT.sectRank ? TT.sectRank(p).i : 0);

  /* -- Cảnh giới -- */
  for (let r = 1; r <= 8; r++) add("Cảnh giới", "realm" + r, `Đạt cảnh giới ${RN[r]}`, `Đột phá lên cảnh giới ${RN[r]}.`, r + 1, "orb_gold", p => p.realm >= r);
  add("Cảnh giới", "ascend", "Phi thăng Tiên Giới", "Vượt qua thiên kiếp cuối cùng, đại đạo viên mãn.", 25, "orb_gold", () => false);
  /* -- Đột phá & Kiếp -- */
  cnt("Đột phá & Kiếp", "brk10", "Bước vào đại đạo", "Đột phá thành công 10 lần trong một kiếp.", 2, "orb_gold", p => p.track.brk, 10);
  cnt("Đột phá & Kiếp", "brk30", "Nghịch thiên cải mệnh", "Đột phá thành công 30 lần trong một kiếp.", 4, "orb_gold", p => p.track.brk, 30);
  cnt("Đột phá & Kiếp", "fail3", "Thất bại là mẹ thành công", "Đột phá thất bại 3 lần trong một kiếp.", 1, "brain", p => p.track.fails, 3);
  cnt("Đột phá & Kiếp", "fail10", "Kiên trì bất khuất", "Đột phá thất bại 10 lần trong một kiếp mà vẫn không bỏ cuộc.", 3, "brain", p => p.track.fails, 10);
  cnt("Đột phá & Kiếp", "trib1", "Vượt Thiên Kiếp", "Sống sót qua một lần Thiên Kiếp.", 3, "orb_blue", p => p.track.trib, 1);
  cnt("Đột phá & Kiếp", "trib4", "Lôi Kiếp Bất Tử", "Sống sót qua 4 lần Thiên Kiếp trong một kiếp.", 8, "orb_blue", p => p.track.trib, 4);
  /* -- Chiến đấu -- */
  cnt("Chiến đấu", "kill10", "Thợ săn yêu thú", "Đánh bại 10 yêu thú trong một kiếp.", 1, "sword", p => p.track.kills, 10);
  cnt("Chiến đấu", "kill50", "Sát tinh", "Đánh bại 50 yêu thú trong một kiếp.", 3, "sword", p => p.track.kills, 50);
  cnt("Chiến đấu", "kill200", "Huyết Ma", "Đánh bại 200 yêu thú trong một kiếp.", 6, "sword", p => p.track.kills, 200);
  cnt("Chiến đấu", "kill500", "Tu La Tái Thế", "Đánh bại 500 yêu thú trong một kiếp.", 9, "sword", p => p.track.kills, 500);
  cnt("Chiến đấu", "explore30", "Người lữ hành", "Lịch luyện 30 lần trong một kiếp.", 1, "clover", p => p.track.explores, 30);
  cnt("Chiến đấu", "explore150", "Du hành giả", "Lịch luyện 150 lần trong một kiếp.", 3, "clover", p => p.track.explores, 150);
  cnt("Chiến đấu", "explore500", "Lữ khách vạn dặm", "Lịch luyện 500 lần trong một kiếp.", 6, "clover", p => p.track.explores, 500);
  /* -- Kỳ ngộ -- */
  cnt("Kỳ ngộ", "enc10", "Duyên khởi", "Gặp 10 kỳ ngộ trong một kiếp.", 1, "clover", p => p.track.enc, 10);
  cnt("Kỳ ngộ", "enc50", "Phúc duyên thâm hậu", "Gặp 50 kỳ ngộ trong một kiếp.", 3, "clover", p => p.track.enc, 50);
  cnt("Kỳ ngộ", "enc200", "Thiên địa sủng nhi", "Gặp 200 kỳ ngộ trong một kiếp.", 6, "clover", p => p.track.enc, 200);
  cnt("Kỳ ngộ", "encM1", "Thiên cơ giáng thế", "Gặp một kỳ ngộ Thiên cơ.", 3, "orb_gold", p => p.track.encM, 1);
  cnt("Kỳ ngộ", "encM5", "Người được trời chọn", "Gặp 5 kỳ ngộ Thiên cơ trong một kiếp.", 7, "orb_gold", p => p.track.encM, 5);
  add("Kỳ ngộ", "encAll", "Bách khoa kỳ ngộ", "Gặp đủ mọi loại kỳ ngộ trong một kiếp.", 6, "scroll",
    p => Object.keys(p.enc || {}).length >= TT.ENC_IDS.length, p => [Object.keys(p.enc || {}).length, TT.ENC_IDS.length]);
  /* -- Bí cảnh -- */
  cnt("Bí cảnh", "runs5", "Khách quen bí cảnh", "Thám hiểm bí cảnh 5 lần trong một kiếp.", 1, "crystal", p => p.track.runs, 5);
  cnt("Bí cảnh", "runs25", "Thám hiểm gia", "Thám hiểm bí cảnh 25 lần trong một kiếp.", 3, "crystal", p => p.track.runs, 25);
  cnt("Bí cảnh", "runs100", "Chủ nhân bí cảnh", "Thám hiểm bí cảnh 100 lần trong một kiếp.", 6, "crystal", p => p.track.runs, 100);
  cnt("Bí cảnh", "clears1", "Phá bí cảnh", "Hạ Thủ Lĩnh và thông quan một bí cảnh.", 2, "crystal", p => p.track.clears, 1);
  cnt("Bí cảnh", "clears10", "Sát Thủ Lĩnh", "Hạ Thủ Lĩnh bí cảnh 10 lần trong một kiếp.", 4, "crystal", p => p.track.clears, 10);
  cnt("Bí cảnh", "clearAll", "Chinh phục mọi bí cảnh", "Thông quan tất cả bí cảnh trong một kiếp.", 10, "crystal", nSecret, TT.SECRETS ? TT.SECRETS.length : 8);
  add("Bí cảnh", "clearTien", "Tiên Phủ chi chủ", "Thông quan Thái Cổ Tiên Phủ.", 5, "orb_gold", p => !!p.secret?.cleared?.tien);
  /* -- Linh căn & Chỉ số -- */
  add("Linh căn & Chỉ số", "rootThien", "Thiên chi kiêu tử", "Sở hữu Thiên Linh Căn (một nguyên tố thuần khiết).", 4, "orb_green", p => p.root?.els?.length === 1 && TT.FIVE.includes(p.root.els[0]));
  add("Linh căn & Chỉ số", "rootRare", "Dị căn giáng thế", "Sở hữu Dị Linh Căn (Lôi, Băng hoặc Phong).", 5, "orb_blue", p => !!p.root?.els?.some(e => TT.RARE_EL.includes(e)));
  add("Linh căn & Chỉ số", "rootNgu", "Phế căn nghịch tập", "Mang Ngũ Linh Căn mà đột phá tới Kim Đan.", 4, "orb_green", p => p.root?.els?.length === 5 && p.realm >= 3);
  cnt("Linh căn & Chỉ số", "temper1", "Tôi luyện sơ thành", "Tôi luyện linh căn lên cấp 1.", 1, "orb_green", maxTemper, 1);
  cnt("Linh căn & Chỉ số", "temper5", "Linh căn cường hóa", "Tôi luyện một nguyên tố lên cấp 5.", 3, "orb_green", maxTemper, 5);
  cnt("Linh căn & Chỉ số", "temper10", "Linh căn đại thành", "Tôi luyện một nguyên tố lên cấp tối đa.", 6, "orb_green", maxTemper, 10);
  cnt("Linh căn & Chỉ số", "stat15", "Thiên phú dị bẩm", "Một chỉ số gốc đạt 15.", 2, "brain", maxStat, 15);
  cnt("Linh căn & Chỉ số", "stat25", "Tư chất tuyệt đỉnh", "Một chỉ số gốc đạt 25.", 4, "brain", maxStat, 25);
  cnt("Linh căn & Chỉ số", "stat40", "Đỉnh phong cực hạn", "Một chỉ số gốc đạt mức tối đa 40.", 8, "brain", maxStat, 40);
  /* -- Tông môn -- */
  add("Tông môn", "sect", "Có chốn nương thân", "Gia nhập một tông môn.", 1, "bagua", p => !!p.sect);
  cnt("Tông môn", "mission10", "Đệ tử chăm chỉ", "Hoàn thành 10 nhiệm vụ tông môn.", 2, "bagua", p => p.track.missions, 10);
  cnt("Tông môn", "mission30", "Trụ cột tông môn", "Hoàn thành 30 nhiệm vụ tông môn.", 3, "bagua", p => p.track.missions, 30);
  cnt("Tông môn", "mission100", "Công thần tông môn", "Hoàn thành 100 nhiệm vụ tông môn.", 6, "bagua", p => p.track.missions, 100);
  cnt("Tông môn", "mbig1", "Đại thành công", "Hoàn thành xuất sắc một nhiệm vụ tông môn (thưởng gấp đôi).", 2, "bagua", p => p.track.mbig, 1);
  cnt("Tông môn", "mbig10", "Phúc tinh của tông môn", "Hoàn thành xuất sắc 10 nhiệm vụ tông môn.", 4, "bagua", p => p.track.mbig, 10);
  cnt("Tông môn", "mhard10", "Việc khó chẳng sờn", "Hoàn thành 10 nhiệm vụ độ khó cao (từ bậc 4).", 4, "bagua", p => p.track.mhard, 10);
  add("Tông môn", "rank1", "Nhập nội môn", "Thăng chức Nội Môn Đệ Tử.", 2, "bagua", p => rankOf(p) >= 1);
  add("Tông môn", "rank2", "Chân truyền đệ tử", "Thăng chức Chân Truyền Đệ Tử.", 3, "bagua", p => rankOf(p) >= 2);
  add("Tông môn", "rank3", "Chấp sự tông môn", "Thăng chức Chấp Sự.", 5, "bagua", p => rankOf(p) >= 3);
  add("Tông môn", "rank4", "Trưởng lão", "Thăng chức Trưởng Lão.", 8, "bagua", p => rankOf(p) >= 4);
  add("Tông môn", "rank5", "Thái Thượng Trưởng Lão", "Đạt chức vị cao nhất tông môn.", 12, "bagua", p => rankOf(p) >= 5);
  cnt("Tông môn", "mfeat1", "Nắm bắt thời cơ", "Hoàn thành một nhiệm vụ nổi bật trong ngày (thưởng x1,5).", 2, "bagua", p => p.track.mfeat, 1);
  cnt("Tông môn", "mfeat10", "Tai thính mắt tinh", "Hoàn thành 10 nhiệm vụ nổi bật trong một kiếp.", 4, "bagua", p => p.track.mfeat, 10);
  cnt("Tông môn", "mfail5", "Thất bại là bài học", "Thất bại 5 nhiệm vụ tông môn mà vẫn tiếp tục.", 1, "brain", p => p.track.mfail, 5);
  cnt("Tông môn", "earn500", "Tích tiểu thành đại", "Tích lũy tổng 500 cống hiến cho tông môn.", 2, "crystal", p => (p.sectx ? p.sectx.earned : 0), 500);
  cnt("Tông môn", "earn3500", "Cống hiến vô song", "Tích lũy tổng 3.500 cống hiến cho tông môn.", 6, "crystal", p => (p.sectx ? p.sectx.earned : 0), 3500);
  cnt("Tông môn", "sshop1", "Khách quen kho tông môn", "Đổi vật phẩm ở kho tông môn.", 1, "crystal", p => p.track.sshop, 1);
  cnt("Tông môn", "sshop20", "Tay buôn cống hiến", "Đổi vật phẩm ở kho tông môn 20 lần trong một kiếp.", 3, "crystal", p => p.track.sshop, 20);
  add("Tông môn", "allm", "Việc gì cũng thạo", "Hoàn thành ít nhất một lần mọi nhiệm vụ của tông môn hiện tại.", 6, "bagua",
    p => !!(p.sect && p.sectx && TT.missionsFor && TT.missionsFor(p.sect).every(m => p.sectx.done[m.id])),
    p => { const L = p.sect && TT.missionsFor ? TT.missionsFor(p.sect) : []; return [p.sectx ? L.filter(m => p.sectx.done[m.id]).length : 0, L.length || 1]; });
  /* -- Nghề phụ & Của cải -- */
  cnt("Nghề phụ & Của cải", "herb10", "Nông phu tu tiên", "Thu hoạch 10 Linh Thảo.", 1, "ginseng", p => p.track.herbs, 10);
  cnt("Nghề phụ & Của cải", "herb50", "Điền chủ", "Thu hoạch 50 Linh Thảo trong một kiếp.", 3, "ginseng", p => p.track.herbs, 50);
  cnt("Nghề phụ & Của cải", "herb200", "Dược vương", "Thu hoạch 200 Linh Thảo trong một kiếp.", 5, "ginseng", p => p.track.herbs, 200);
  cnt("Nghề phụ & Của cải", "craft1", "Luyện đan sư tập sự", "Chế tạo thành công 1 đan dược hoặc phù lục.", 1, "orb_green", p => p.track.crafted, 1);
  cnt("Nghề phụ & Của cải", "craft20", "Đại sư chế tác", "Chế tạo thành công 20 đan dược / phù lục.", 3, "orb_green", p => p.track.crafted, 20);
  cnt("Nghề phụ & Của cải", "craft100", "Tông sư chế tác", "Chế tạo thành công 100 đan dược / phù lục.", 6, "orb_green", p => p.track.crafted, 100);
  add("Nghề phụ & Của cải", "gear1", "Thợ rèn pháp khí", "Rèn được một món pháp khí.", 1, "sword", p => Object.keys(p.gear).length >= 1);
  add("Nghề phụ & Của cải", "gear3", "Võ trang đầy đủ", "Trang bị đủ cả 3 loại pháp khí.", 3, "charm", p => Object.keys(p.gear).length >= 3, p => [Object.keys(p.gear).length, 3]);
  cnt("Nghề phụ & Của cải", "rich", "Phú ông", "Sở hữu 1.000 linh thạch cùng lúc.", 2, "crystal", p => p.stone, 1000);
  cnt("Nghề phụ & Của cải", "rich5000", "Phú khả địch quốc", "Sở hữu 5.000 linh thạch cùng lúc.", 4, "crystal", p => p.stone, 5000);
  cnt("Nghề phụ & Của cải", "trader", "Thương nhân", "Bán vật phẩm thu về tổng 300 linh thạch.", 2, "crystal", p => p.track.sold, 300);
  cnt("Nghề phụ & Của cải", "trader2000", "Đại thương gia", "Bán vật phẩm thu về tổng 2.000 linh thạch.", 4, "crystal", p => p.track.sold, 2000);
  /* -- Tu hành & Luân hồi -- */
  add("Tu hành & Luân hồi", "skills", "Học giả Tàng Kinh Các", "Học đủ cả 5 công pháp.", 3, "scroll", p => p.skills.length >= Object.keys(TT.SKILLS).length, p => [p.skills.length, Object.keys(TT.SKILLS).length]);
  cnt("Tu hành & Luân hồi", "months120", "Thập niên khổ tu", "Tu hành tròn 10 năm trong một kiếp.", 2, "peach", p => p.months, 120);
  cnt("Tu hành & Luân hồi", "months600", "Ngũ thập niên đạo hạnh", "Tu hành tròn 50 năm trong một kiếp.", 5, "peach", p => p.months, 600);
  cnt("Tu hành & Luân hồi", "age100", "Lão tiên", "Sống tới 100 tuổi.", 3, "peach", p => p.age, 100);
  cnt("Tu hành & Luân hồi", "age200", "Trường sinh bất lão", "Sống tới 200 tuổi.", 6, "peach", p => p.age, 200);
  cnt("Tu hành & Luân hồi", "life200", "Nghịch thiên kéo dài thọ nguyên", "Thọ nguyên tối đa đạt 200 năm.", 4, "peach", p => p.lifespan, 200);
  cnt("Tu hành & Luân hồi", "lives5", "Luân hồi chuyển thế", "Trải qua 5 kiếp.", 3, "bagua", (p, M) => M.totals.lives, 5);
  cnt("Tu hành & Luân hồi", "lives10", "Vạn kiếp luân hồi", "Trải qua 10 kiếp.", 5, "bagua", (p, M) => M.totals.lives, 10);
  cnt("Tu hành & Luân hồi", "wins3", "Tam độ phi thăng", "Phi thăng Tiên Giới 3 lần.", 8, "orb_gold", (p, M) => M.totals.wins, 3);

  /* ---------- trạng thái ---------- */
  const fresh = () => ({
    v: 1, legacy: 0, earned: 0, up: { pts: 0, stone: 0, life: 0, exp: 0, luck: 0 },
    history: [], ach: {}, totals: { lives: 0, wins: 0, kills: 0 }, best: 0,
  });
  const num = (v, d = 0) => (Number.isFinite(+v) ? Math.max(0, Math.trunc(+v)) : d);

  /** Làm sạch dữ liệu đọc từ localStorage / file nhập vào. */
  const sanitize = raw => {
    const m = fresh();
    if (!raw || typeof raw !== "object") return m;
    m.legacy = num(raw.legacy); m.earned = num(raw.earned); m.best = num(raw.best);
    for (const k of Object.keys(UP)) m.up[k] = Math.min(UP[k].cost.length, num(raw.up?.[k]));
    for (const k of Object.keys(m.totals)) m.totals[k] = num(raw.totals?.[k]);
    if (raw.ach && typeof raw.ach === "object") for (const a of ACH) if (raw.ach[a.id]) m.ach[a.id] = num(raw.ach[a.id], 1);
    if (Array.isArray(raw.history)) {
      m.history = raw.history.slice(0, MAX_HISTORY).filter(x => x && typeof x === "object").map(x => ({
        n: num(x.n), race: String(x.race ?? "").slice(0, 20), gender: String(x.gender ?? "").slice(0, 8),
        realm: String(x.realm ?? "").slice(0, 40), age: num(x.age), end: ["win", "death", "abandon"].includes(x.end) ? x.end : "death",
        cause: String(x.cause ?? "").slice(0, 120), pts: num(x.pts), ts: num(x.ts),
      }));
    }
    return m;
  };

  /** Kiểm tra tính nhất quán: điểm đã tiêu phải khớp đúng giá các nâng cấp, tổng điểm không vượt mức có thể kiếm được. */
  const consistent = m => {
    let spent = 0;
    for (const k of Object.keys(UP)) for (let i = 0; i < m.up[k]; i++) spent += UP[k].cost[i];
    const achPts = ACH.reduce((n, a) => n + (m.ach[a.id] ? a.pts : 0), 0);
    const allAch = ACH.reduce((n, a) => n + a.pts, 0);
    return m.earned - m.legacy === spent && m.earned >= achPts && m.earned <= allAch + m.totals.lives * 80;
  };
  const plain = m => ({ v: 1, legacy: m.legacy, earned: m.earned, up: m.up, history: m.history, ach: m.ach, totals: m.totals, best: m.best });

  let M = fresh();
  {
    const r = TT.sec.read(KEY, "meta");
    if (r?.bad) TT.sec.error = "Dữ liệu Thiên Mệnh bị chỉnh sửa nên đã được đặt lại.";
    else if (r?.obj) {
      const m = sanitize(r.obj);
      if (consistent(m)) M = m; else TT.sec.error = "Dữ liệu Thiên Mệnh không hợp lệ nên đã được đặt lại.";
    }
  }
  TT.meta = M;
  const save = () => TT.sec.write(KEY, "meta", plain(M));

  M.save = save;
  M.UP = UP; M.ACH = ACH;
  M.bonus = k => (k === "exp" ? M.up.exp * 0.03 : M.up[k] || 0);
  M.upCost = k => UP[k].cost[M.up[k]];            // undefined nếu đã tối đa
  M.buy = k => {
    const c = M.upCost(k);
    if (c === undefined || M.legacy < c) return false;
    M.legacy -= c; M.up[k]++; save(); return true;
  };

  /* ---------- hiệu ứng mở khóa thành tựu: thông báo trượt vào + vòng sáng / pháo hạt trong cảnh, mạnh dần theo bậc ---------- */
  const TIERS = {
    common: { label: "Thành tựu mới", color: "#7fdcff", burst: 14, flash: 5, rings: 1, ms: 4600 },
    rare: { label: "Thành tựu hiếm", color: "#ffd24a", burst: 30, flash: 9, rings: 2, ms: 5600 },
    legend: { label: "Thành tựu huyền thoại", color: "#ff9f43", burst: 64, flash: 16, rings: 3, ms: 7200 },
  };
  const tierOf = a => (a.pts >= 8 ? "legend" : a.pts >= 3 ? "rare" : "common");
  M.tierOf = tierOf; M.TIERS = TIERS;
  const MAX_TOASTS = 3, toasts = { root: null, active: 0, queue: [], extra: 0 };
  const toastRoot = () => {
    if (!toasts.root || !toasts.root.isConnected) { toasts.root = h("div", { id: "ach-toasts", role: "status", "aria-live": "polite" }); document.body.append(toasts.root); }
    return toasts.root;
  };
  const toastNow = item => {
    const tr = TIERS[item.tier];
    const dismiss = () => {
      if (!t.isConnected || t.classList.contains("out")) return;
      t.classList.add("out"); toasts.active--;
      setTimeout(() => { t.remove(); pump(); }, 420);
    };
    const open = () => { dismiss(); if (TT.game && TT.game.inGame) TT.game.openHub("ach"); };
    const t = h("div", { class: `ach-toast tier-${item.tier}`, role: "button", tabindex: "0", title: "Bấm để xem danh sách thành tựu",
      onclick: open, onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } } },
      h("div", { class: "ach-ico" }, h("img", { src: TT.A.icon(item.icon, 40), alt: "", width: 40, height: 40 })),
      h("div", { class: "ach-txt" },
        h("div", { class: "ach-kicker" }, "★ " + tr.label),
        h("div", { class: "ach-name" }, item.name),
        h("div", { class: "ach-desc" }, item.desc),
        h("div", { class: "ach-pts" }, item.pts ? `+${item.pts} điểm Thiên Mệnh` : "Bấm để xem")),
      h("i", { class: "ach-shine" }));
    t.style.setProperty("--ach", tr.color);
    toastRoot().append(t); toasts.active++;
    setTimeout(dismiss, tr.ms);
  };
  const pump = () => {
    while (toasts.active < MAX_TOASTS && toasts.queue.length) toastNow(toasts.queue.shift());
    if (!toasts.queue.length && toasts.extra && toasts.active < MAX_TOASTS) {
      const n = toasts.extra; toasts.extra = 0;
      toastNow({ tier: "common", icon: "bagua", name: `+${n} thành tựu khác`, desc: "Mở Thiên Đạo Các để xem tất cả.", pts: 0 });
    }
  };
  const announce = a => {
    if (toasts.queue.length >= 4) toasts.extra++;
    else toasts.queue.push({ tier: tierOf(a), icon: a.icon, name: a.name, desc: a.desc, pts: a.pts });
    pump();
  };
  const sceneFx = (g, a) => {
    const sc = g && g.scene, tr = TIERS[tierOf(a)];
    if (!sc) return;
    sc.addRing(tr.color); sc.flash(tr.color, tr.flash);
    sc.burst(sc.cx, sc.gy - 60, tr.color, tr.burst);
    for (let i = 1; i < tr.rings; i++) setTimeout(() => { if (g.scene === sc) { sc.addRing(i % 2 ? "#ffffff" : tr.color); sc.burst(sc.cx, sc.gy - 60, tr.color, Math.round(tr.burst / 2)); } }, 260 * i);
    sc.floatText("★ " + a.name, tr.color, 0);
  };

  const unlock = (g, a) => {
    if (M.ach[a.id]) return;
    M.ach[a.id] = Date.now() || 1; M.legacy += a.pts; M.earned += a.pts; save();
    g?.log(`★ Thành tựu mở khóa: ${a.name}  (+${a.pts} điểm Thiên Mệnh)`, "gold");
    sceneFx(g, a); announce(a);
  };

  /** Kiểm tra thành tựu (gọi mỗi lần giao diện làm mới). */
  M.check = g => {
    const p = g.p;
    if (!p || !p.track) return;
    for (const a of ACH) if (!M.ach[a.id] && a.ok(p, M)) unlock(g, a);
  };

  /** Kết thúc một kiếp: kind = "win" | "death" | "abandon". Trả về số điểm Thiên Mệnh nhận được. */
  M.endLife = (g, kind, cause = "") => {
    const p = g.p;
    if (!p || p._ended) return 0;
    p._ended = true;
    let pts = Math.floor(p.level / 6) + p.realm;
    if (kind === "death") pts = Math.max(1, pts);
    else if (kind === "abandon") pts = Math.floor(pts / 2);   // bỏ dở giữa chừng chỉ được nửa điểm
    else pts += 20;
    M.legacy += pts; M.earned += pts;
    M.totals.lives++; M.totals.kills += p.track?.kills || 0;
    if (kind === "win") M.totals.wins++;
    M.best = Math.max(M.best, p.level);
    M.history.unshift({
      n: g.count, race: p.race, gender: p.gender, realm: p.realm_name(), age: p.age, end: kind,
      cause: kind === "win" ? "Phi thăng Tiên Giới" : kind === "abandon" ? "Trùng sinh giữa chừng" : cause, pts, ts: Date.now(),
    });
    M.history.length = Math.min(M.history.length, MAX_HISTORY);
    save();
    if (kind === "win") unlock(g, ACH.find(a => a.id === "ascend"));
    if (pts > 0 && kind !== "abandon") g.log(`Thiên Mệnh: +${pts} điểm (hiện có ${M.legacy}). Mở "Thiên Đạo Các" để nâng cấp cho kiếp sau.`, "cyan");
    return pts;
  };

  /* ---------- xuất / nhập / xóa dữ liệu (có chữ ký, nhập vào được kiểm tra lại toàn bộ) ---------- */
  M.exportText = () => {
    const cur = TT.readSave();
    const data = JSON.stringify({ save: cur.player ? { count: cur.count, player: cur.player } : null, meta: plain(M) });
    return JSON.stringify({ game: "thien-van-dai-luc", v: 2, data, sig: TT.sec.sign("export", data) });
  };
  /** Nhập dữ liệu. dry = true chỉ kiểm tra và ghi tóm tắt vào M.importInfo, chưa ghi gì. Trả về chuỗi lỗi, hoặc "" nếu ổn. */
  M.importText = (text, dry = false) => {
    let env, d;
    if (typeof text !== "string" || !text) return "Chưa có dữ liệu để nhập.";
    if (text.length > 1e6) return "Dữ liệu quá lớn (tối đa 1 MB).";
    try { env = JSON.parse(text); } catch (e) { return "Nội dung không phải JSON hợp lệ."; }
    if (!env || env.game !== "thien-van-dai-luc" || typeof env.data !== "string" || typeof env.sig !== "string") return "Đây không phải dữ liệu xuất từ game này.";
    if (!TT.sec.verify("export", env.data, env.sig)) return "Chữ ký không khớp: dữ liệu đã bị chỉnh sửa hoặc hỏng, hoặc được xuất từ một bản game khác.";
    try { d = JSON.parse(env.data); } catch (e) { return "Dữ liệu bên trong bị hỏng."; }
    const meta = sanitize(d?.meta);
    if (!consistent(meta)) return "Dữ liệu Thiên Mệnh không hợp lệ.";
    let save = null;
    if (d.save != null) {
      const p = TT.sec.cleanPlayer(d.save.player);
      if (!p) return "Save nhân vật bị từ chối: " + TT.sec.error;
      save = { count: Math.max(1, Math.trunc(+d.save.count) || 1), player: p };
    }
    if (dry) {
      M.importInfo = (save ? `${save.player.name} · ${save.player.realm_name()} · ${save.player.age} tuổi` : "Không có nhân vật") + `\nThiên Mệnh: ${meta.legacy} điểm, ${Object.keys(meta.ach).length} thành tựu`;
      return "";
    }
    if (save) TT.sec.write(SAVE_KEY, "save", save);
    TT.sec.write(KEY, "meta", plain(meta));
    return "";
  };
  M.wipe = () => { try { [SAVE_KEY, KEY, FLAG, ...[SAVE_KEY, KEY].flatMap(k => [k + "_bak", k + "_rejected"])].forEach(k => localStorage.removeItem(k)); } catch (e) { /* bỏ qua */ } };

  /* ================= GIAO DIỆN: THIÊN ĐẠO CÁC ================= */
  const G = TT.Game.prototype;
  const ico = name => { const i = h("img", { class: "row-ico", src: TT.A.icon(name, 40), alt: "" }); i.addEventListener("error", () => { i.style.visibility = "hidden"; }); return i; };
  const fmtDate = ts => { try { return new Date(ts).toLocaleDateString("vi-VN"); } catch (e) { return ""; } };
  const row = (icon, name, desc, extra, btn) => h("div", { class: "row-item panel" }, icon ? ico(icon) : null,
    h("div", { class: "info" }, h("div", { class: "bold" }, name), h("div", { class: "dim small" }, desc), extra || null),
    btn ? h("div", { class: "row-btns" }, btn) : null);

  const download = (name, text) => {
    const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
    document.body.append(a); a.click(); a.remove();
  };
  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = h("textarea", { style: { position: "fixed", opacity: 0 } }); t.value = text;
      document.body.append(t); t.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { /* bỏ qua */ }
      t.remove(); return ok;
    }
  };

  G.openHub = function (tab = "up") {
    if (this.hub) this.hub.close();
    const m = TT.ui.modal("dlg-box hub-box", () => { m.close(); this.hub = null; }, { label: "Thiên Đạo Các" });
    this.hub = m;
    const tabs = [["up", "Thiên Mệnh"], ["ach", "Thành tựu"], ["hist", "Kiếp trước"], ["data", "Dữ liệu"]];
    const render = (t, note = "") => {
      const body = h("div", { class: "rows" });
      let head = "";
      if (t === "up") {
        head = `Điểm Thiên Mệnh: ${M.legacy}   (đã kiếm tổng cộng ${M.earned})`;
        body.append(h("div", { class: "dim small hub-note" }, "Nhận điểm khi nhân vật chết hoặc phi thăng (cảnh giới càng cao càng nhiều), cùng phần thưởng thành tựu. Nâng cấp có hiệu lực vĩnh viễn cho mọi kiếp sau."));
        for (const [k, u] of Object.entries(UP)) {
          const lv = M.up[k], c = M.upCost(k);
          const b = TT.ui.btn(c === undefined ? "Tối đa" : "Nâng", () => {
            if (!M.buy(k)) return;
            if (k === "pts" && this.lblPoints?.isConnected) { this.points++; this.refreshPoints(); }   // đang ở màn tạo nhân vật
            render("up");
          }, { cls: "gold sm", disabled: c === undefined || M.legacy < c });
          body.append(row(u.icon, `${u.name}  [${lv}/${u.cost.length}]`, u.desc, h("div", { class: "gold small" }, c === undefined ? "Đã đạt cấp tối đa" : `Giá: ${c} điểm`), b));
        }
      } else if (t === "ach") {
        const n = ACH.filter(a => M.ach[a.id]).length, pts = ACH.reduce((x, a) => x + (M.ach[a.id] ? a.pts : 0), 0);
        head = `Thành tựu: ${n} / ${ACH.length}   ·   đã nhận ${pts} điểm Thiên Mệnh từ thành tựu`;
        body.append(h("div", { class: "dim small hub-note" }, "Thành tựu theo kiếp (đếm lại khi trùng sinh) sẽ có thanh tiến độ. Thành tựu càng khó thì thưởng càng nhiều và hiệu ứng mở khóa càng rực rỡ."));
        const p = this.p, now = Date.now();
        for (const cat of CATS) {
          const list = ACH.filter(a => a.cat === cat);
          if (!list.length) continue;
          const got = list.filter(a => M.ach[a.id]).length;
          body.append(h("div", { class: "ach-cat t-green bold sec" }, `${cat}  (${got}/${list.length})`));
          for (const a of [...list].sort((x, y) => (M.ach[y.id] ? 1 : 0) - (M.ach[x.id] ? 1 : 0))) {
            const have = !!M.ach[a.id], tier = tierOf(a), tr = TIERS[tier];
            let extra;
            if (have) extra = h("div", { class: "green small" }, `Đã đạt ${fmtDate(M.ach[a.id])}`, now - M.ach[a.id] < 600000 ? h("span", { class: "ach-new" }, " MỚI") : null);
            else {
              let pr = null;
              try { pr = a.prog && p ? a.prog(p, M) : null; } catch (e) { pr = null; }
              extra = h("div", { class: "small" },
                pr ? h("span", { class: "meter ach-meter" }, h("i", { style: { width: Math.round(Math.max(0, Math.min(1, pr[0] / pr[1])) * 100) + "%" } })) : null,
                pr ? ` ${pr[0].toLocaleString("vi-VN")}/${pr[1].toLocaleString("vi-VN")}  ·  ` : "", h("span", { class: "gold" }, `Thưởng +${a.pts} điểm`));
            }
            const r = row(a.icon, (have ? "✔ " : "") + a.name, a.desc, extra);
            r.classList.add("ach-row", "tier-" + tier, have ? "got" : "todo"); r.style.setProperty("--ach", tr.color);
            body.append(r);
          }
        }
      } else if (t === "hist") {
        head = `Đã trải qua ${M.totals.lives} kiếp · Phi thăng ${M.totals.wins} lần · Cảnh giới cao nhất: ${bestRealm()}`;
        if (!M.history.length) body.append(h("div", { class: "dim center hub-note" }, "Chưa có kiếp nào kết thúc. Bia Thiên Đạo sẽ ghi lại tại đây."));
        for (const x of M.history) {
          body.append(row(x.end === "win" ? "orb_gold" : "bagua",
            `Kiếp ${x.n}: ${x.gender} ${x.race} - ${x.realm}`, `Thọ ${x.age} tuổi. ${x.cause}`,
            h("div", { class: "cyan small" }, `${fmtDate(x.ts)}  ·  +${x.pts} Thiên Mệnh`)));
        }
      } else {
        head = "Quản lý dữ liệu";
        const ta = h("textarea", { class: "data-ta", rows: 4, placeholder: "Dán dữ liệu đã xuất vào đây rồi bấm Nhập…" });
        const msg = h("div", { class: "small center hub-note" }, note);
        body.append(
          h("div", { class: "dim small hub-note" }, "Save lưu trong trình duyệt này. Hãy xuất ra file để sao lưu hoặc chuyển sang thiết bị khác."),
          h("div", { class: "row center" },
            TT.ui.btn("Sao chép dữ liệu", async () => { msg.textContent = (await copyText(M.exportText())) ? "Đã sao chép vào clipboard." : "Không sao chép được, hãy dùng nút Tải file."; msg.className = "small center hub-note green"; }, { cls: "cyan sm" }),
            TT.ui.btn("Tải file .json", () => { download("thien-van-dai-luc-save.json", M.exportText()); }, { cls: "cyan sm" })),
          ta,
          h("div", { class: "row center" },
            TT.ui.btn("Nhập dữ liệu", async () => {
              const text = ta.value.trim(), err = M.importText(text, true);
              if (err) { msg.textContent = err; msg.className = "small center hub-note red-t"; return; }
              const yes = await TT.ui.confirm({ title: "Nhập dữ liệu này?", text: M.importInfo + "\n\nSave và Thiên Mệnh hiện tại sẽ bị thay thế, trang sẽ tải lại để áp dụng.", ok: "Nhập", cancel: "Hủy", danger: true });
              if (!yes) return;
              const err2 = M.importText(text);
              if (err2) { msg.textContent = err2; msg.className = "small center hub-note red-t"; return; }
              location.reload();
            }, { cls: "gold sm" }),
            TT.ui.btn("Xóa toàn bộ dữ liệu", async () => {
              const yes = await TT.ui.confirm({ title: "Xóa toàn bộ dữ liệu?", text: "Save nhân vật, Thiên Mệnh, thành tựu và bản sao lưu trên trình duyệt này sẽ bị xóa vĩnh viễn. Hãy xuất dữ liệu trước nếu muốn giữ.", ok: "Xóa tất cả", cancel: "Giữ lại", danger: true });
              if (yes) { M.wipe(); location.reload(); }
            }, { cls: "red sm" })),
          msg);
      }
      m.box.replaceChildren(
        h("h2", { class: "mtitle" }, "Thiên Đạo Các"),
        h("div", { class: "hub-tabs", role: "tablist", "aria-label": "Thiên Đạo Các" }, tabs.map(([k, label]) => h("button", { class: "hub-tab" + (k === t ? " on" : ""), type: "button", role: "tab", "aria-selected": String(k === t), onclick: () => render(k) }, label))),
        h("div", { class: "cyan center pw" }, head), body,
        h("div", { class: "row center" }, TT.ui.btn("Đóng", () => { m.close(); this.hub = null; }, { cls: "dimbtn sm" })));
    };
    render(tab);
  };

  const bestRealm = () => {
    if (!M.best) return "chưa có";
    const r = Math.floor((M.best - 1) / 9), t = (M.best - 1) % 9 + 1;
    return `${TT.REALMS[r]} tầng ${t}`;
  };

  /* ---- gắn vào màn tạo nhân vật / màn chơi chính (bọc hàm gốc, không sửa screens.js) ---- */
  const showCreate = G.showCreate;
  G.showCreate = function () {
    showCreate.call(this);
    const extra = M.bonus("pts");
    if (extra) { this.points += extra; this.refreshPoints(); }
    const box = document.querySelector(".create-right .col.center");
    if (box) box.insertBefore(TT.ui.btn(`Thiên Đạo Các  (Thiên Mệnh: ${M.legacy})`, () => this.openHub(), { cls: "wide cyan", icon: TT.A.icon("bagua", 22) }), box.lastElementChild);
  };

  const showGame = G.showGame;
  G.showGame = function () {
    showGame.call(this);
    const right = document.querySelector(".col-right");
    const saveBtn = right && [...right.querySelectorAll("button")].find(b => b.textContent.includes("Lưu game"));
    if (right && saveBtn) right.insertBefore(TT.ui.btn("Thiên Đạo Các", () => this.openHub(), { cls: "cyan act", icon: TT.A.icon("bagua", 22) }), saveBtn);
  };
})();
