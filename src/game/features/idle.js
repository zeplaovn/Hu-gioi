/* Bản idle: nhập định tự động (kể cả khi vắng mặt), kỳ ngộ, bí cảnh, và các bảng Chỉ số / Linh căn / Bí cảnh / Kỳ ngộ.
   Dữ liệu + công thức thuần nằm ở idle_data.js; file này gắn chúng vào vòng chơi (Game) và giao diện. */
"use strict";
(function () {
  const { C, IDLE, ELEMENTS, SECRETS, STATS, STAT_DESC } = TT;
  const G = TT.Game.prototype;

  const fmt = n => Math.round(n).toLocaleString("vi-VN");
  const clock = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  const sgn = v => (v >= 0 ? "+" : "") + Math.round(v * 100) + "%";
  const elColor = el => (ELEMENTS[el] ? ELEMENTS[el].color : "#cfd8dc");
  const luckOf = p => p.stats["Phúc Duyên"] + p.stats["Vận Khí"];
  /** Phẩm chất ngẫu nhiên (1..4), Phúc Duyên + Vận Khí càng cao càng dễ ra phẩm tốt. */
  const rq = p => Math.max(1, Math.min(4, TT.qualityOf(Math.random() + luckOf(p) * 0.004)));
  const statUp = p => {
    const pool = STATS.filter(s => p.stats[s] < 40);
    if (!pool.length) return "";
    const s = pick(pool); p.stats[s]++; return s;
  };

  /** Lượng tu vi trung bình một tháng (chưa nhân địa điểm tu luyện) - dùng làm thước đo phần thưởng. */
  G.baseMonthGain = function () { return this.p.monthGain(); };
  /** Cộng tu vi bằng k "tháng tu luyện"; trả về lượng đã cộng. */
  G.encExp = function (k) { const g = Math.max(1, int(this.baseMonthGain() * k)); this.p.exp += g; return g; };

  /* ===================================================================
     KỲ NGỘ: mỗi tháng có cơ hội gặp một sự kiện ngẫu nhiên, tự xử lý (không bắt người chơi chọn)
     =================================================================== */
  const RAR = TT.ENC_RARITY = {
    c: { name: "Thường", tag: "cyan", color: "#7fdcff", w: 62 },
    r: { name: "Hiếm", tag: "green", color: "#3cff3c", w: 26 },
    e: { name: "Cực hiếm", tag: "orange", color: "#ff9f43", w: 10 },
    m: { name: "Thiên cơ", tag: "gold", color: "#ffd24a", w: 2 },
  };

  const ENC = TT.ENC = [
    /* --- Thường --- */
    { id: "suoi", r: "c", name: "Linh Tuyền Bên Suối", run: (g, p) => { const s = rnd(6, 16) + p.realm * 6; p.stone += s; return `Bạn nhặt được túi linh thạch bên dòng suối cổ: +${s} linh thạch.`; } },
    { id: "nong", r: "c", name: "Lão Nông Chỉ Điểm", run: g => `Một lão nông chỉ cho bạn cách điều tức hiệu quả hơn: tu vi +${fmt(g.encExp(rnd(2, 4)))}.` },
    { id: "qua", r: "c", name: "Quả Dại Linh Khí", run: (g, p) => { const hh = Math.round(p.max_hp() * 0.3); p.hp = Math.min(p.max_hp(), p.hp + hh); return `Bạn hái được quả dại đẫm linh khí: khí huyết +${hh}, tu vi +${fmt(g.encExp(1))}.`; } },
    { id: "quynhan", r: "c", name: "Quý Nhân Giúp Đỡ", run: (g, p) => { const s = rnd(10, 25) + p.realm * 8; p.stone += s; return `Một vị tiền bối thấy bạn thuận mắt, tặng ${s} linh thạch.`; } },
    { id: "duoc", r: "c", name: "Hái Dược Thảo", run: (g, p) => { const n = rnd(1, 3); g.invAdd("Linh Thảo", rq(p), n, true); return `Bạn hái được ${n} cây Linh Thảo mọc dại bên vách núi.`; } },
    { id: "thien", r: "c", name: "Nghe Thiền Ngộ Đạo", run: g => `Nghe một vị lão tăng giảng thiền, tâm cảnh thông suốt: tu vi +${fmt(g.encExp(rnd(3, 5)))}.` },
    { id: "hat", r: "c", name: "Hạt Giống Từ Trời Rơi", run: (g, p) => { const n = rnd(1, 2); g.invAdd("Hạt Linh Thảo", 0, n, true); return `Một con linh điểu đánh rơi ${n} Hạt Linh Thảo trước mặt bạn.`; } },
    { id: "lua", r: "c", name: "Kẻ Lừa Đảo", neg: true, run: (g, p) => { const s = Math.min(p.stone, rnd(3, 10) + p.realm * 3); p.stone -= s; return s ? `Bạn bị kẻ lừa đảo dụ dỗ, mất ${s} linh thạch.` : "Kẻ lừa đảo tìm đến, may mà túi bạn đã rỗng không còn gì để lừa."; } },
    { id: "chuong", r: "c", name: "Chướng Khí Núi Hoang", neg: true, run: (g, p) => { const d = Math.max(0, Math.min(p.hp - 1, rnd(8, 20) + p.realm * 4)); p.hp -= d; return d ? `Bạn lạc vào vùng chướng khí, khí huyết -${d}.` : "Bạn lạc vào vùng chướng khí nhưng kịp thoát thân."; } },
    /* --- Hiếm --- */
    { id: "ditich", r: "r", name: "Di Tích Tu Sĩ Cổ", run: g => `Bạn phát hiện di tích của một tu sĩ cổ, nhận được truyền thừa: tu vi +${fmt(g.encExp(rnd(10, 16)))}.` },
    { id: "mach", r: "r", name: "Mạch Linh Thạch Nhỏ", run: (g, p) => { const s = rnd(40, 80) + p.realm * 30; p.stone += s; return `Bạn đào trúng một mạch linh thạch nhỏ: +${s} linh thạch.`; } },
    { id: "dong", r: "r", name: "Động Thiên Phúc Địa", run: (g, p) => { const n = rnd(1, 2); g.invAdd("Tụ Khí Đan", rq(p), n, true); if (p.realm >= 1) g.invAdd("Hồi Huyết Đan", rq(p), 1, true); return `Trong động thiên bỏ hoang, bạn tìm thấy ${n} Tụ Khí Đan${p.realm >= 1 ? " và 1 Hồi Huyết Đan" : ""}.`; } },
    { id: "caonhan", r: "r", name: "Cao Nhân Điểm Hóa", run: (g, p) => { const s = statUp(p); return s ? `Một cao nhân vô danh điểm hóa cho bạn: ${s} +1.` : `Cao nhân điểm hóa, tu vi +${fmt(g.encExp(8))}.`; } },
    { id: "tuyen", r: "r", name: "Linh Tuyền Tẩy Thể", run: (g, p) => { p.hp = p.max_hp(); return `Tắm trong linh tuyền, khí huyết hồi đầy, tu vi +${fmt(g.encExp(4))}.`; } },
    { id: "conghuong", r: "r", name: "Nguyên Tố Cộng Hưởng", run: (g, p) => { const el = pick(p.root.els), n = rnd(1, 2); p.ess[el] = (p.ess[el] || 0) + n; return `Linh căn ${el} của bạn cộng hưởng với thiên địa, ngưng tụ ${n} Tinh Hoa ${el}.`; } },
    { id: "thuongnhan", r: "r", name: "Thương Nhân Bí Ẩn", run: g => { g.invAdd("Quặng Linh Thiết", 0, 2, true); g.invAdd("Giấy Phù", 0, 2, true); return "Một thương nhân bí ẩn tặng bạn 2 Quặng Linh Thiết và 2 Giấy Phù."; } },
    /* --- Cực hiếm --- */
    { id: "thienthu", r: "e", name: "Thiên Thư Truyền Thừa", run: (g, p) => {
      const left = Object.keys(TT.SKILLS).filter(k => !p.skills.includes(k) && TT.SKILLS[k].realm <= p.realm);
      if (!left.length) return `Bạn nhặt được một quyển thiên thư, tham ngộ ba ngày ba đêm: tu vi +${fmt(g.encExp(20))}.`;
      const k = pick(left); p.skills.push(k); return `Bạn nhặt được một quyển thiên thư, lĩnh ngộ công pháp [${k}]!`;
    } },
    { id: "tho", r: "e", name: "Trường Thọ Quả Chín Muồi", run: (g, p) => { const y = TT.lifeBonus(rnd(5, 8), p.realm); p.lifespan += y; return `Bạn tìm thấy một cây Trường Thọ Quả đúng lúc chín: thọ nguyên +${y} năm.`; } },
    { id: "phacanh", r: "e", name: "Linh Đan Trên Vách Đá", run: (g, p) => { g.invAdd("Phá Cảnh Đan", rq(p), 1, true); return "Trên vách đá hiểm trở, bạn hái được một viên Phá Cảnh Đan."; } },
    { id: "trieu", r: "e", name: "Linh Khí Triều Tịch", run: g => `Linh khí thiên địa dâng lên như thủy triều, tu vi +${fmt(g.encExp(rnd(25, 40)))}.` },
    { id: "tinhhoa", r: "e", name: "Tinh Hoa Đất Trời", run: (g, p) => { const parts = p.root.els.map(el => { const n = rnd(2, 4); p.ess[el] = (p.ess[el] || 0) + n; return `${n} Tinh Hoa ${el}`; }); return `Bạn thu được ${parts.join(", ")}.`; } },
    /* --- Thiên cơ --- */
    { id: "tayan", r: "m", name: "Thiên Địa Linh Dịch", run: (g, p) => {
      const info = TT.rootInfo(p.root);
      if (info.n >= 2 && !TT.RARE_EL.includes(p.root.els[0])) {
        const drop = pick(p.root.els), before = TT.rootLabel(p.root);
        p.root = { els: p.root.els.filter(e => e !== drop) };
        return `Linh dịch thiên địa gột rửa tạp chất, linh căn được tinh lọc, ${drop} căn tiêu tán (căn càng thuần càng mạnh): ${before} -> ${TT.rootLabel(p.root)}!`;
      }
      const s = statUp(p);
      return `Linh dịch thiên địa tẩy lễ thân thể: tu vi +${fmt(g.encExp(30))}${s ? `, ${s} +1` : ""}.`;
    } },
    { id: "tiennhan", r: "m", name: "Tiên Nhân Quán Đỉnh", run: (g, p) => { const y = TT.lifeBonus(10, p.realm); p.lifespan += y; const s = statUp(p); return `Một đạo tiên nhân hư ảnh quán đỉnh cho bạn: tu vi +${fmt(g.encExp(rnd(60, 90)))}, thọ nguyên +${y}${s ? `, ${s} +1` : ""}.`; } },
  ];
  TT.ENC_IDS = ENC.map(e => e.id);

  G.rollEncounter = function () {
    const p = this.p, I = p.idle;
    if (!I) return;
    if (I.cd > 0) { I.cd--; return; }
    const luck = luckOf(p);
    if (Math.random() > Math.min(0.25, 0.08 + luck * 0.004)) return;
    const lf = 1 + Math.min(1.5, luck * 0.02), pool = [];        // phúc duyên càng cao, kỳ ngộ hiếm càng dễ ra
    for (const r of Object.keys(RAR)) {
      const list = ENC.filter(e => e.r === r);
      const rw = RAR[r].w * (r === "c" ? 1 : lf);
      for (const e of list) pool.push([e, rw / list.length * (e.neg ? 1 / (1 + luck * 0.03) : 1)]);
    }
    let t = Math.random() * pool.reduce((s, [, w]) => s + w, 0), ev = pool[0][0];
    for (const [e, w] of pool) { if ((t -= w) <= 0) { ev = e; break; } }
    I.cd = rnd(3, 6);
    const txt = ev.run(this, p), R = RAR[ev.r];
    p.enc[ev.id] = (p.enc[ev.id] || 0) + 1; p.track.enc++;
    if (ev.r === "m") p.track.encM++;
    if (this.quiet) { if (this.rep) this.rep.events.push({ r: ev.r, name: ev.name, txt }); return; }
    this.log(`✦ Kỳ ngộ [${R.name}] ${ev.name}: ${txt}`, R.tag);
    const sc = this.scene;
    if (sc) {
      sc.floatText("✦ " + ev.name, R.color); sc.addRing(R.color); sc.flash(R.color, ev.r === "c" ? 4 : 10);
      if (ev.r === "e" || ev.r === "m") sc.burst(sc.cx, sc.gy - 60, R.color, 28);
    }
  };

  /* ===================================================================
     NHẬP ĐỊNH (IDLE): tu vi tự tăng mỗi giây, thời gian trong game tự trôi, có cả khi đóng game
     =================================================================== */
  G.idleStart = function (isLoad) {
    clearInterval(this.idleTimer);
    const br = TT.serverBridge;
    if (isLoad && br && br.enabled && br.ready && !br.loaded) {   // chờ biết các đợt bảo trì để không tính chúng là thời gian vắng mặt
      const t0 = this.token;
      br.ready.then(() => { if (t0 === this.token && this.inGame) this.idleStart(true); });
      return;
    }
    const p = this.p;
    this.idleLast = isLoad ? p.idle.ts : Date.now();
    if (!isLoad) p.idle.ts = this.idleLast;
    this.fullShown = 0;
    const tok = this.token;
    this.idleTimer = setInterval(() => this.idleTick(tok), IDLE.TICK_MS);
    if (isLoad) this.idleTick(tok);                  // tính ngay phần thời gian đã vắng mặt
  };

  /** Cộng tu vi cho 1 nhịp; dừng ở mức viên mãn (hoặc 150% nếu đang áp chế). Trả về lượng đã cộng. */
  G.idleGain = function () {
    const p = this.p, I = p.idle, need = p.need_exp(), cap = Math.floor(p.suppress ? need * 1.5 : need);
    I.carry += this.idleMonthGain() / IDLE.MONTH_TICKS;
    const whole = Math.floor(I.carry);
    I.carry -= whole;
    const g = Math.min(whole, Math.max(0, cap - p.exp));
    if (g > 0) p.exp += g; else I.carry = 0;
    return Math.max(0, g);
  };

  /** Hết một tháng: hồi khí huyết, trôi thời gian (tuổi, lương tông môn, kỳ ngộ). Linh điền chạy riêng theo đồng hồ thật (farm.js). */
  G.idleMonth = function () {
    const p = this.p;
    const mhp = p.max_hp();
    if (p.hp < mhp) p.hp = Math.min(mhp, p.hp + Math.max(1, Math.round(mhp * p.regen())));
    const ok = this.passTime(1);
    if (!ok) return false;
    if (p.months % 12 === 0) {
      const left = p.lifespan - p.age;
      if (left === 10 || left === 3 || left === 1) this.log(`⚠ Thọ nguyên chỉ còn ${left} năm! Hãy đột phá hoặc tìm cách kéo dài tuổi thọ.`, "red");
    }
    if (!this.quiet) { this.autosave(); }
    return true;
  };

  /** Chạy n nhịp. Vắng mặt quá lâu thì thời gian vẫn trôi và nhân vật có thể tọa hóa (đặc trưng của game). */
  G.idleRun = function (n) {
    const p = this.p, I = p.idle;
    let gained = 0;
    for (let i = 0; i < n && !this.dead; i++) {
      gained += this.idleGain();
      if (++I.mt >= IDLE.MONTH_TICKS) {
        I.mt = 0;
        if (!this.idleMonth()) break;
      }
    }
    return gained;
  };

  G.idleTick = function (tok) {
    if (tok !== undefined && tok !== this.token) { clearInterval(this.idleTimer); return; }
    if (!this.inGame || this.dead || !this.p) return;
    this.farmSync();                                             // linh điền chạy theo thời gian thật, kể cả khi tạm dừng nhập định
    const p = this.p, now = Date.now(), dt = (now - this.idleLast) / 1000;
    if (dt < 0) { this.idleLast = now; return; }                 // đồng hồ bị chỉnh lùi
    if (!p.idle.on || this.breaking) {                            // tạm dừng / đang đột phá: không tính thời gian
      this.idleLast = now; this.secretCheck(); this.missionCheck(); this.idleRefresh(); return;
    }
    if (dt < 5) {
      const n = Math.floor(dt);
      if (n < 1) return;
      this.idleLast += n * 1000;
      const g = this.idleRun(n);
      if (g > 0 && this.scene && !document.hidden) {
        if (this.scene.mode === "idle") this.scene.play("train", 34);
        this.scene.floatText(`+${fmt(g)}`, "#7dff7d");
      }
    } else {
      const br = TT.serverBridge, skip = br && br.maintenanceOverlap ? br.maintenanceOverlap(this.idleLast, now) / 1000 : 0;   // bảo trì không tính là vắng mặt
      this.idleLast = now;
      if (dt - skip >= 1) this.idleCatchUp(dt - skip);
    }
    if (this.dead) return;
    this.secretCheck(); this.missionCheck();
    this.idleCheckFull();
    this.refresh();
  };

  /** Bù thời gian đã vắng mặt (đóng game / tab bị treo): 2 phút đầu tính đủ, sau đó 50%, tối đa 2 giờ. */
  G.idleCatchUp = function (dt) {
    const p = this.p;
    let eff = dt <= IDLE.FULL_RATE_S ? dt : IDLE.FULL_RATE_S + (dt - IDLE.FULL_RATE_S) * IDLE.OFFLINE_RATE;
    const capped = eff > IDLE.OFFLINE_CAP_S;
    eff = Math.min(eff, IDLE.OFFLINE_CAP_S);
    const show = dt >= IDLE.REPORT_MIN_S;
    const b = { exp: p.exp, stone: p.stone, months: p.months, age: p.age, realm: p.realm_name(), hp: p.hp, wilt: p.plots.filter(x => x && x.wilt).length };
    this.rep = { events: [], secret: null, stopped: "" };
    this.quiet = show;
    try { this.idleRun(Math.floor(eff)); this.secretCheck(); this.missionCheck(); } finally { this.quiet = false; }
    const rep = this.rep; this.rep = null;
    if (this.dead) return;
    this.refresh(); this.autosave();
    this.renderFarm();                                          // passTime không vẽ khi quiet; vẽ đúng một lần sau khi bù xong
    if (show) this.showReport(dt, eff, capped, b, rep);
  };

  /** Hiện hộp thoại tu vi sắp viên mãn / đã viên mãn (chỉ khi không có hộp thoại nào khác đang mở). */
  G.idleCheckFull = function () {
    const p = this.p, need = p.need_exp();
    if (this.quiet || this.breaking) return;
    const st = p.suppress ? (p.exp >= need * 1.5 ? 2 : 0) : (p.exp >= need ? 1 : 0);
    if (!st || this.fullShown >= st || TT.ui.anyModal()) return;
    this.fullShown = st;
    this.log(st === 1 ? "Tu vi đã viên mãn - hãy đột phá (hoặc tiếp tục áp chế để tăng tỉ lệ thành công)." : "Tu vi đã áp chế đến cực hạn - hãy đột phá!", "gold");
    this.promptBreakthrough(st === 2);
  };

  G.idleToggle = function () {
    const I = this.p.idle;
    I.on = !I.on;
    this.idleLast = Date.now();
    this.log(I.on ? "Bạn tiếp tục nhập định." : "Bạn tạm dừng nhập định (thời gian không tự trôi).", "dim");
    this.autosave(); this.idleRefresh();
  };

  /* ---------- khung trạng thái idle trên màn chính ---------- */
  G.buildIdlePanel = function () {
    const U = this.U;
    U.idleState = h("span", { class: "bold" });
    U.idleRate = h("span", { class: "dim small" });
    U.idleAway = h("div", { class: "red-t small" });
    U.idleBtn = TT.ui.btn("Tạm dừng", () => this.idleToggle(), { cls: "dimbtn sm" });
    U.barMonth = new TT.ui.Bar("#5b7fd6", 14);
    U.secretLine = h("div", { class: "small cyan" });
    U.barSecret = new TT.ui.Bar("#d98a2b", 14);
    U.secretBox = h("div", { class: "idle-secret" }, U.secretLine, U.barSecret.el);
    U.missionLine = h("div", { class: "small cyan" });
    U.barMission = new TT.ui.Bar("#3f9bd6", 14);
    U.missionBox = h("div", { class: "idle-secret" }, U.missionLine, U.barMission.el);
    return h("div", { class: "panel idle-panel" },
      h("div", { class: "idle-row" }, U.idleState, h("span", { class: "spacer" }), U.idleRate, U.idleBtn), U.barMonth.el, U.idleAway, U.secretBox, U.missionBox);
  };

  G.idleRefresh = function () {
    const U = this.U, p = this.p;
    if (!U || !U.idleState || !p || !p.idle) return;
    const I = p.idle, need = p.need_exp(), cap = p.suppress ? need * 1.5 : need;
    let st, col;
    if (this.dead) { st = "✝ Đã tọa hóa"; col = C.RED; }
    else if (!I.on) { st = "⏸ Tạm dừng nhập định"; col = C.DIM; }
    else if (p.exp >= cap) { st = "◆ Tu vi viên mãn - hãy đột phá"; col = C.GOLD; }
    else { st = "● Đang nhập định"; col = C.GREEN; }
    U.idleState.textContent = st; U.idleState.style.color = col;
    U.idleRate.textContent = `+${(this.idleMonthGain() / IDLE.MONTH_TICKS).toFixed(1)} tu vi/giây · 1 tháng = ${IDLE.MONTH_TICKS}s`;
    if (U.idleAway) {
      const left = this.p.lifespan - this.p.age, sec = TT.safeAway(this.p), danger = left <= 40;
      U.idleAway.className = (danger ? "red-t" : "dim") + " small";
      U.idleAway.textContent = !this.p.idle.on ? "" : Number.isFinite(sec) ? `${danger ? "⚠ " : ""}Thọ nguyên còn ${left} năm: vắng mặt quá ${TT.fmtTime(sec)} nhân vật sẽ tọa hóa.` : "Thọ nguyên còn dài: có thể vắng mặt tối đa 2 giờ mỗi lần mà không lo tọa hóa.";
    }
    U.barMonth.set(I.mt, IDLE.MONTH_TICKS, `Tháng kế tiếp sau ${IDLE.MONTH_TICKS - I.mt}s`);
    const btnLabel = U.idleBtn.querySelector("span"), want = I.on ? "Tạm dừng" : "Tiếp tục";
    if (btnLabel.textContent !== want) btnLabel.textContent = want;
    U.idleBtn.disabled = this.dead;
    const a = p.secret.active, def = a && TT.secretById(a.id);
    if (def) {
      const total = a.end - a.start, left = Math.max(0, a.end - Date.now());
      U.secretLine.textContent = `⚔ Đang thám hiểm ${def.name}...  còn ${clock(left / 1000)}`;
      U.barSecret.set(total - left, total, clock(left / 1000));
      U.secretBox.style.display = "";
    } else U.secretBox.style.display = "none";
    const ma = p.sectx && p.sectx.active, mdef = ma && TT.missionById(ma.id);
    if (mdef) {
      const total = ma.end - ma.start, left = Math.max(0, ma.end - Date.now());
      U.missionLine.textContent = `✦ Nhiệm vụ tông môn: ${mdef.name}...  còn ${clock(left / 1000)}`;
      U.barMission.set(total - left, total, clock(left / 1000));
      U.missionBox.style.display = "";
    } else U.missionBox.style.display = "none";
  };

  /* ===================================================================
     BÍ CẢNH: thám hiểm theo thời gian thật (chạy cả khi vắng mặt), nhận thưởng khi kết thúc
     =================================================================== */
  G.secretStart = function (id) {
    const p = this.p, def = TT.secretById(id), S = p.secret;
    if (!def || this.dead || S.active || p.realm < def.realm) return;
    if (p.hp < p.max_hp() * 0.5) { this.log("Khí huyết dưới 50%, hãy hồi phục trước khi vào bí cảnh.", "red"); return; }
    if (p.sectx && p.sectx.active) { this.log("Bạn đang làm nhiệm vụ tông môn, hãy đợi xong rồi mới vào bí cảnh.", "red"); return; }
    const now = Date.now();
    S.active = { id, start: now, end: now + def.dur * 1000 };
    this.log(`Bạn bước vào [${def.name}] (${def.el === "Vô" ? "vô hệ" : "hệ " + def.el}), dự kiến ${TT.fmtTime(def.dur)}.`, "gold");
    this.scene.floatText("Vào " + def.name, elColor(def.el)); this.scene.addRing(elColor(def.el));
    this.autosave(); this.idleRefresh();
  };

  G.secretAbort = function () {
    const S = this.p.secret, def = S.active && TT.secretById(S.active.id);
    if (!def) return;
    S.active = null;
    this.log(`Bạn rút khỏi [${def.name}] giữa chừng, không nhận được phần thưởng.`, "dim");
    this.autosave(); this.idleRefresh();
  };

  G.secretCheck = function () {
    const a = this.p && this.p.secret && this.p.secret.active;
    if (a && Date.now() >= a.end) this.secretResolve();
  };

  G.secretResolve = function () {
    const p = this.p, S = p.secret, a = S.active, def = a && TT.secretById(a.id);
    S.active = null;
    if (!def) return;
    const sim = TT.simSecret(p, def, p.hp), mg = this.baseMonthGain(), luck = luckOf(p);
    p.hp = sim.hp;
    const res = { def, sim, exp: 0, stone: 0, items: {}, ess: null, stat: "", life: 0, first: false };
    const addItem = (name, n) => {
      const q = TT.MATS[name] ? 0 : rq(p);
      this.invAdd(name, q, n, true);
      const key = q ? `${name} [${TT.QN[q]}]` : name;
      res.items[key] = (res.items[key] || 0) + n;
    };
    const pool = ["Hạt Linh Thảo", "Giấy Phù", "Quặng Linh Thiết"];
    if (def.realm >= 1) pool.push("Linh Thảo", "Tụ Khí Đan");
    if (def.realm >= 2) pool.push("Hồi Huyết Đan");
    for (let f = 1; f <= sim.cleared; f++) {
      res.exp += int(mg * (0.8 + 0.3 * f) * def.xp);
      res.stone += int(rnd(4, 9) * (1 + def.realm * 0.7) * (1 + 0.12 * f) * def.xp);
      if (Math.random() < 0.35 + luck * 0.005) addItem(pick(pool), 1);
    }
    const full = sim.cleared === def.floors;
    if (full) {                                                    // hạ được Thủ Lĩnh
      const el = TT.FIVE.includes(def.el) ? def.el : pick(TT.FIVE), n = rnd(1, 2) + (def.floors >= 8 ? 1 : 0);
      p.ess[el] = (p.ess[el] || 0) + n; res.ess = { el, n };
      if (def.realm >= 1 && Math.random() < 0.5) addItem("Phá Cảnh Đan", 1);
      if (def.realm >= 2 && Math.random() < 0.08) { res.life = TT.lifeBonus(3, p.realm); p.lifespan += res.life; }
      p.track.clears++;
      if (!S.cleared[def.id]) { S.cleared[def.id] = true; res.first = true; res.stat = statUp(p); }
    }
    p.exp += res.exp; p.stone += res.stone;
    S.best[def.id] = Math.max(S.best[def.id] || 0, sim.cleared);
    p.track.runs++;
    const head = sim.cleared === 0 ? "bị đánh lui ngay tầng đầu" : `thanh trừ ${sim.cleared}/${def.floors} tầng`;
    this.log(`Bí cảnh [${def.name}]: ${head}. Tu vi +${fmt(res.exp)}, linh thạch +${fmt(res.stone)}.`, sim.cleared ? "gold" : "red");
    if (this.quiet) { if (this.rep) this.rep.secret = res; }
    else {
      this.scene.addRing(elColor(def.el)); this.scene.flash(elColor(def.el), 8);
      this.showSecretResult(res);
    }
    this.autosave();
  };

  const resultLines = res => {
    const { def, sim } = res, L = [];
    const why = { clear: "Hạ được Thủ Lĩnh, thông quan bí cảnh!", retreat: "Khí huyết cạn dần nên bạn rút lui an toàn.", down: "Bị đánh trọng thương và phải rút lui." }[sim.end];
    L.push(h("div", { class: sim.end === "clear" ? "t-gold bold center" : "center" }, `${def.name}: thanh trừ ${sim.cleared}/${def.floors} tầng`));
    L.push(h("div", { class: "dim center small" }, why));
    L.push(h("div", { class: "cyan" }, `Tu vi +${fmt(res.exp)}    Linh thạch +${fmt(res.stone)}`));
    const items = Object.entries(res.items);
    if (items.length) L.push(h("div", { class: "green" }, "Vật phẩm: " + items.map(([k, n]) => `${k} x${n}`).join(", ")));
    if (res.ess) L.push(h("div", { style: { color: elColor(res.ess.el) } }, `Tinh Hoa ${res.ess.el} x${res.ess.n} (dùng để tôi luyện linh căn)`));
    if (res.life) L.push(h("div", { class: "gold" }, `Thọ nguyên +${res.life} năm`));
    if (res.first) L.push(h("div", { class: "gold" }, "Lần đầu thông quan!" + (res.stat ? ` ${res.stat} +1` : "")));
    L.push(h("div", { class: "dim small" }, `Khí huyết còn lại: ${sim.hp}`));
    return L;
  };

  G.showSecretResult = function (res) {
    const m = TT.ui.modal("dlg-box report-box", () => m.close());
    m.box.append(h("h2", { class: "mtitle" }, "Kết quả bí cảnh"), h("div", { class: "rows report-lines" }, resultLines(res)),
      h("div", { class: "row center" }, TT.ui.btn("Đóng", () => m.close(), { cls: "gold" })));
  };

  /** Báo cáo sau khi vắng mặt. */
  G.showReport = function (dt, eff, capped, b, rep) {
    const p = this.p, L = [];
    const months = p.months - b.months;
    L.push(h("div", { class: "center" }, `Bạn đã vắng mặt ${TT.fmtTime(dt)}. Thời gian bế quan được tính: ${TT.fmtTime(eff)}${capped ? " (đã đạt mức tối đa)" : ""}.`));
    L.push(h("div", { class: "dim small center" }, `${Math.round(IDLE.OFFLINE_RATE * 100)}% sau ${IDLE.FULL_RATE_S / 60} phút đầu, tối đa ${IDLE.OFFLINE_CAP_S / 3600} giờ. Linh điền vẫn lớn đến lúc chín.`));
    L.push(h("div", { class: "cyan" }, `Thời gian trong game: +${months} tháng (tuổi ${b.age} -> ${p.age})`));
    L.push(h("div", { class: "green" }, `Tu vi: +${fmt(p.exp - b.exp)}    Linh thạch: ${p.stone - b.stone >= 0 ? "+" : ""}${fmt(p.stone - b.stone)}`));
    if (p.realm_name() !== b.realm) L.push(h("div", { class: "gold" }, `Cảnh giới: ${b.realm} -> ${p.realm_name()}`));
    if (p.exp >= p.need_exp()) L.push(h("div", { class: "gold bold" }, "◆ Tu vi đã viên mãn - hãy đột phá để tiếp tục tiến bước!"));
    const safe = TT.safeAway(p);
    if (p.lifespan - p.age <= 40) L.push(h("div", { class: "red-t small" }, `⚠ Thọ nguyên còn ${p.lifespan - p.age} năm: vắng mặt quá ${TT.fmtTime(safe)} nhân vật sẽ tọa hóa.`));
    const ripe = p.plots.filter(x => x && !x.wilt && x.age >= TT.RIPE).length;
    if (ripe) L.push(h("div", { class: "green" }, `🌿 Linh điền: ${ripe} ô Linh Thảo đã chín, đang chờ bạn thu hoạch.`));
    if (rep.events.length) {
      L.push(h("div", { class: "t-green bold sec" }, `— Kỳ ngộ (${rep.events.length}) —`));
      rep.events.slice(0, 8).forEach(e => L.push(h("div", { class: "small", style: { color: RAR[e.r].color } }, `✦ [${RAR[e.r].name}] ${e.name}: ${e.txt}`)));
      if (rep.events.length > 8) L.push(h("div", { class: "dim small" }, `... và ${rep.events.length - 8} kỳ ngộ khác.`));
    }
    if (rep.secret) { L.push(h("div", { class: "t-green bold sec" }, "— Bí cảnh —")); L.push(...resultLines(rep.secret)); }
    if (rep.missions && rep.missions.length) { L.push(h("div", { class: "t-green bold sec" }, "— Nhiệm vụ tông môn —")); rep.missions.forEach(r => L.push(...TT.missionLines(r))); }
    const tips = TT.advice ? TT.advice(this).slice(0, 3) : [];
    if (tips.length) { L.push(h("div", { class: "t-green bold sec" }, "— Việc nên làm tiếp —")); tips.forEach(t => L.push(h("div", { class: "small" }, "→ " + t.text))); }
    const m = TT.ui.modal("dlg-box report-box", () => m.close());
    m.box.append(h("h2", { class: "mtitle" }, "Bế quan trở về"), h("div", { class: "rows report-lines" }, L),
      h("div", { class: "row center" }, TT.ui.btn("Tiếp tục tu luyện", () => m.close(), { cls: "gold" })));
  };

  /* ===================================================================
     CÁC BẢNG GIAO DIỆN
     =================================================================== */
  /** Hộp thoại tự vẽ lại theo chu kỳ (giữ nguyên vị trí cuộn). build(close, redraw) trả về mảng phần tử. */
  const liveModal = (cls, build, ms = 0) => {
    const m = TT.ui.modal("dlg-box " + cls, () => close());
    let timer = 0;
    const close = () => { clearInterval(timer); m.close(); };
    const redraw = () => {
      if (!m.overlay.isConnected) { clearInterval(timer); return; }
      const old = m.box.querySelector(".rows"), top = old ? old.scrollTop : 0;
      m.box.replaceChildren(...build(close, redraw).filter(x => x != null && x !== false));   // replaceChildren biến null thành chữ "null"
      const now = m.box.querySelector(".rows");
      if (now) now.scrollTop = top;
    };
    redraw();
    if (ms) timer = setInterval(redraw, ms);
    return { m, redraw, close };
  };
  const alive = w => w && w.m.overlay.isConnected;
  const kv = (k, v, hint, color) => h("div", { class: "kv" },
    h("span", { class: "k" }, k), h("span", { class: "v", style: color ? { color } : null }, v), hint ? h("div", { class: "dim small kv-hint" }, hint) : null);
  const sec = (title, ...rows) => h("div", { class: "sheet-sec" }, h("div", { class: "t-green bold sec center" }, `— ${title} —`), ...rows);
  const chip = el => h("span", { class: "chip", style: { color: elColor(el), borderColor: elColor(el) } }, el);

  /* ---------- Chỉ số ---------- */
  G.openSheet = function () {
    if (alive(this.sheetWin)) return;
    this.sheetWin = liveModal("sheet-box", (close, redraw) => {
      const p = this.p, info = TT.rootInfo(p.root), mg = this.idleMonthGain();
      const bonus = [["atk", "Công kích"], ["def", "Phòng ngự"], ["hp", "Khí huyết"], ["exp", "Tốc độ tu luyện"], ["crit", "Chí mạng"], ["dodge", "Né tránh"], ["regen", "Hồi phục"]]
        .map(([k, l]) => [l, TT.rootBonus(p, k) + (k === "exp" ? info.exp : 0)]).filter(([, v]) => v);
      return [
        h("h2", { class: "mtitle" }, "Chỉ số nhân vật"),
        h("div", { class: "rows sheet" },
          sec("Thông tin",
            kv("Đạo hiệu", p.name, `Kiếp thứ ${this.count}`, C.GOLD),
            kv("Giới tính · Chủng tộc", `${p.gender} · ${p.race}`),
            kv("Cảnh giới", p.realm_name(), null, TT.REALM_COLORS[p.realm]),
            kv("Tu vi", `${TT.fmtNum(p.exp)} / ${TT.fmtNum(p.need_exp())}`, `Đủ để ${p.tang === 9 ? "đại đột phá" : "lên tầng"} sau khoảng ${TT.fmtTime(p.monthsToFull() * IDLE.MONTH_TICKS)} nhập định`),
            kv("Tuổi · Thọ nguyên", `${p.age} / ${p.lifespan}`, `Còn ${Math.max(0, p.lifespan - p.age)} năm`),
            kv("Tông môn", p.sect || "chưa gia nhập"),
            kv("Công pháp", p.skills.length ? p.skills.join(", ") : "chưa có"),
            kv("Linh thạch", fmt(p.stone), null, C.CYAN)),
          sec("Linh căn",
            h("div", { class: "kv" }, h("span", { class: "k" }, info.name), h("span", { class: "v" }, p.root.els.map(chip))),
            ...bonus.map(([l, v]) => kv(l, sgn(v), null, v >= 0 ? C.GREEN : C.RED))),
          sec("Chỉ số gốc", ...STATS.map(s => kv(s, p.stats[s], STAT_DESC[s]))),
          sec("Chiến đấu",
            kv("Công kích (chiến lực)", fmt(p.power())),
            kv("Phòng ngự", fmt(p.def())),
            kv("Khí huyết", `${fmt(p.hp)} / ${fmt(p.max_hp())}`),
            kv("Chí mạng", `${(p.crit() * 100).toFixed(1)}%`, "Đòn chí mạng gây thêm 60% sát thương."),
            kv("Né tránh", `${(p.dodge() * 100).toFixed(1)}%`),
            kv("Hồi phục mỗi tháng", `${(p.regen() * 100).toFixed(1)}% khí huyết`)),
          sec("Tu luyện",
            kv("Tốc độ tu luyện", `x${p.exp_mult().toFixed(2)}`, "= 1 " + p.expParts().map(([l, v]) => `${v >= 0 ? "+" : "-"} ${Math.abs(Math.round(v * 100))}% ${l}`).join(" ")),
            kv("Tu vi mỗi tháng (TB)", fmt(mg)),
            kv("Tỉ lệ đột phá", `${Math.round(p.breakChance(p.tang === 9) * 100)}%`, `${p.tang === 9 ? "Đại đột phá lên " + (TT.REALMS[p.realm + 1] || "Phi thăng") : "Lên tầng " + (p.tang + 1)}. Ngộ Tính, Vận Khí, Phá Cảnh Đan và áp chế tu vi đều giúp tăng tỉ lệ; thất bại mất ${Math.round((1 - p.failKeep(p.tang === 9)) * 100)}% tu vi.`, p.breakChance(p.tang === 9) >= 0.6 ? C.GREEN : p.breakChance(p.tang === 9) >= 0.4 ? C.GOLD : C.RED),
            kv("Tu vi mỗi giây (idle)", (mg / IDLE.MONTH_TICKS).toFixed(1)),
            kv("Tinh Hoa", TT.FIVE.concat(TT.RARE_EL).filter(e => p.ess[e]).map(e => `${e} ${p.ess[e]}`).join("  ·  ") || "chưa có"))),
        h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" }),
          TT.hintOff ? TT.ui.btn(TT.hintOff() ? "Bật gợi ý" : "Tắt gợi ý", () => { this.hintToggle(); redraw(); }, { cls: "dimbtn sm", title: "Dòng gợi ý việc nên làm trên màn chính" }) : null),
      ];
    }, 1000);
  };

  /* ---------- Linh căn ---------- */
  G.temperUp = function (el) {
    const p = this.p, lv = p.temper[el] || 0, cost = 2 + 2 * lv;
    if (lv >= TT.TEMPER_MAX || (p.ess[el] || 0) < cost) return;
    p.ess[el] -= cost; if (p.ess[el] <= 0) delete p.ess[el];
    p.temper[el] = lv + 1;
    this.log(`Tôi luyện linh căn ${el}: cấp ${lv + 1}/${TT.TEMPER_MAX}.`, "gold");
    this.scene.addRing(elColor(el)); this.scene.flash(elColor(el), 6);
    this.refresh(); this.autosave();
  };

  G.openRoot = function () {
    if (alive(this.rootWin)) return;
    this.rootWin = liveModal("root-box", (close, redraw) => {
      const p = this.p, info = TT.rootInfo(p.root);
      const rows = p.root.els.map(el => {
        const lv = p.temper[el] || 0, cost = 2 + 2 * lv, have = p.ess[el] || 0, max = lv >= TT.TEMPER_MAX;
        const b = TT.ui.btn(max ? "Tối đa" : `Tôi luyện (${cost})`, () => { this.temperUp(el); redraw(); }, { cls: "gold sm", disabled: max || have < cost });
        return h("div", { class: "row-item panel" }, h("div", { class: "el-badge", style: { background: elColor(el) } }, el),
          h("div", { class: "info" },
            h("div", { class: "bold" }, `${el}  [tôi luyện ${lv}/${TT.TEMPER_MAX}]`),
            h("div", { class: "dim small" }, TT.elemDesc(el, info.scale * (1 + TT.TEMPER_STEP * lv)) + ` - ${ELEMENTS[el].story}`),
            h("div", { class: "cyan small" }, `Tinh Hoa ${el}: ${have}`)),
          h("div", { class: "row-btns" }, b));
      });
      const others = TT.FIVE.concat(TT.RARE_EL).filter(e => !p.root.els.includes(e) && p.ess[e]).map(e => `${e} ${p.ess[e]}`);
      return [
        h("h2", { class: "mtitle" }, "Linh căn"),
        h("div", { class: "center" }, h("span", { class: "gold bold" }, info.name + "  "), p.root.els.map(chip)),
        h("div", { class: "dim small center hub-note" }, `Tốc độ tu luyện ${sgn(info.exp)} · hiệu quả mỗi nguyên tố x${info.scale.toFixed(2)}. Mỗi cấp tôi luyện tăng 8% hiệu quả nguyên tố đó.`),
        h("div", { class: "rows" }, rows,
          others.length ? h("div", { class: "dim small hub-note" }, "Tinh Hoa chưa dùng được (không thuộc linh căn của bạn): " + others.join(" · ")) : null,
          h("div", { class: "dim small hub-note" }, "Ngũ hành tương khắc: Kim > Mộc > Thổ > Thủy > Hỏa > Kim. Vào bí cảnh mà linh căn của bạn khắc nguyên tố của bí cảnh thì sát thương tăng; bị khắc thì giảm. Tinh Hoa rơi ra khi hạ Thủ Lĩnh bí cảnh hoặc từ kỳ ngộ.")),
        h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" })),
      ];
    }, 1000);
  };

  /* ---------- Bí cảnh ---------- */
  G.openSecrets = function () {
    if (alive(this.secretWin)) return;
    this.secretWin = liveModal("secret-box", (close, redraw) => {
      const p = this.p, S = p.secret, a = S.active, hpOk = p.hp >= p.max_hp() * 0.5;
      const rows = SECRETS.map(def => {
        const locked = p.realm < def.realm, running = a && a.id === def.id, c = elColor(def.el);
        const aff = TT.affinity(p.root, def.el);
        const affTxt = def.el === "Vô" ? "Vô hệ: linh căn không thuận / nghịch" : aff > 0.05 ? `Linh căn thuận lợi: sát thương ${sgn(aff)}` : aff < -0.05 ? `Linh căn bất lợi: sát thương ${sgn(aff)}` : "Linh căn trung tính";
        const est = locked ? 0 : TT.estimateSecret(p, def), ratio = est / def.floors;
        let btn;
        if (running) btn = TT.ui.btn("Rút lui", () => {
          TT.ui.confirm({ title: "Rút khỏi bí cảnh?", text: "Rút giữa chừng sẽ không nhận được phần thưởng của lần thám hiểm này.", ok: "Rút lui", cancel: "Ở lại", danger: true })
            .then(yes => { if (yes && this.inGame && this.p === p && p.secret.active) { this.secretAbort(); redraw(); } });
        }, { cls: "red sm" });
        else btn = TT.ui.btn("Tiến vào", () => { this.secretStart(def.id); redraw(); }, { cls: "gold sm", disabled: locked || !!a || !hpOk });
        return h("div", { class: "row-item panel" + (locked ? " locked" : "") },
          h("div", { class: "el-badge", style: { background: c } }, def.el),
          h("div", { class: "info" },
            h("div", { class: "bold" }, def.name),
            h("div", { class: "dim small" }, def.desc),
            h("div", { class: "small" }, locked ? h("span", { class: "red-t" }, `Yêu cầu cảnh giới ${TT.REALMS[def.realm]}`) : `${def.floors} tầng · ${TT.fmtTime(def.dur)} · địch tầng 1: ${TT.secretEnemy(def, 1)}, Thủ Lĩnh: ${TT.secretEnemy(def, def.floors)}`),
            locked ? null : h("div", { class: "small", style: { color: aff > 0.05 ? C.GREEN : aff < -0.05 ? C.RED : C.DIM } }, affTxt),
            locked ? null : h("div", { class: "small", style: { color: ratio >= 0.9 ? C.GREEN : ratio >= 0.5 ? C.GOLD : C.RED } },
              `Dự kiến thanh trừ ~${est.toFixed(1)}/${def.floors} tầng` + (S.best[def.id] ? `  ·  kỷ lục: tầng ${S.best[def.id]}` : "") + (S.cleared[def.id] ? "  ·  ✔ đã thông quan" : ""))),
          h("div", { class: "row-btns" }, btn));
      });
      return [
        h("h2", { class: "mtitle" }, "Bí cảnh"),
        h("div", { class: "cyan center pw" }, `Chiến lực: ${fmt(p.power())}   Phòng ngự: ${fmt(p.def())}   Khí huyết: ${fmt(p.hp)}/${fmt(p.max_hp())}${hpOk ? "" : "  (cần từ 50% để vào)"}`),
        h("div", { class: "dim small center hub-note" }, "Thám hiểm chạy theo thời gian thật, kể cả khi bạn đóng game. Địch mạnh dần theo từng tầng; khí huyết xuống thấp bạn sẽ tự rút lui và giữ phần thưởng đã có. Nhập định vẫn tiếp tục trong lúc thám hiểm."),
        h("div", { class: "rows" }, rows),
        h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" })),
      ];
    }, 1000);
  };

  /* ---------- Kỳ ngộ ---------- */
  G.openEnc = function () {
    if (alive(this.encWin)) return;
    this.encWin = liveModal("enc-box", close => {
      const p = this.p, luck = luckOf(p);
      const found = ENC.filter(e => p.enc[e.id]).length;
      const rows = [];
      for (const r of Object.keys(RAR)) {
        rows.push(h("div", { class: "bold sec", style: { color: RAR[r].color } }, `${RAR[r].name}  (${ENC.filter(e => e.r === r && p.enc[e.id]).length}/${ENC.filter(e => e.r === r).length})`));
        for (const e of ENC.filter(x => x.r === r)) {
          const n = p.enc[e.id] || 0;
          rows.push(h("div", { class: "row-item panel" }, h("div", { class: "info" },
            h("div", { class: n ? "bold" : "dim", style: n ? { color: RAR[r].color } : null }, n ? e.name : "???"),
            h("div", { class: "dim small" }, n ? `Đã gặp ${n} lần${e.neg ? " (tai ương)" : ""}` : "Chưa từng gặp"))));
        }
      }
      return [
        h("h2", { class: "mtitle" }, "Kỳ ngộ"),
        h("div", { class: "cyan center pw" }, `Đã gặp ${found}/${ENC.length} loại · tổng ${p.track.enc} lần trong kiếp này`),
        h("div", { class: "dim small center hub-note" }, `Mỗi tháng có khoảng ${Math.round(Math.min(0.25, 0.08 + luck * 0.004) * 100)}% cơ hội gặp kỳ ngộ (Phúc Duyên + Vận Khí = ${luck}). Phúc Duyên và Vận Khí càng cao càng dễ gặp kỳ ngộ hiếm và ít gặp tai ương.`),
        h("div", { class: "rows" }, rows),
        h("div", { class: "row center" }, TT.ui.btn("Đóng", close, { cls: "dimbtn sm" })),
      ];
    }, 0);
  };

  /* ---------- lưu khi rời trang để lần mở sau tính đúng thời gian vắng mặt ---------- */
  const saveNow = () => { const g = TT.game; if (g && g.inGame && !g.dead && g.p) g.autosave(); };
  document.addEventListener("visibilitychange", () => {
    const g = TT.game;
    if (!g) return;
    if (document.hidden) saveNow(); else g.idleTick(g.token);
  });
  window.addEventListener("pagehide", saveNow);
})();
