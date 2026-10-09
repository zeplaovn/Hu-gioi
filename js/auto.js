/* Tu luyện tự động (không bao giờ tự đột phá) và hộp thoại đạt điều kiện đột phá. */
"use strict";
(function () {
  const { C, PLACES, TARGETS, AUTO_MS, SKILLS } = TT;
  const G = TT.Game.prototype;

  G.autoMonthGain = function (avg = false) {
    const p = this.p, cfg = p.auto_cfg;
    const base = 4 + p.stats["Căn Cốt"] * 1.5 + p.stats["Ngộ Tính"] * 2 + p.level * 1.5;
    let mult = p.exp_mult();
    if (p.skills.includes(cfg.skill)) mult += SKILLS[cfg.skill].exp;
    const g = base * mult * PLACES[cfg.place][3];
    return avg ? g * 1.05 : int(g * uni(0.8, 1.3));
  };

  G.autoGoalFor = function () {
    const t = TARGETS[this.p.auto_cfg.target][1];
    return t ? t : Math.max(0, this.p.need_exp() - this.p.exp);
  };

  G.autoStart = function () {
    const p = this.p, cfg = p.auto_cfg, pl = PLACES[cfg.place];
    if (this.dead || !this.inGame || this.autoOn) return;
    if (p.realm < pl[1] || (pl[2] && p.stone < pl[2])) { this.log(`Không đủ điều kiện tu luyện tại ${pl[0]}.`, "red"); return; }
    if (p.exp >= p.need_exp() && !p.suppress) { this.promptBreakthrough(false); return; }
    this.autoOn = true; this.autoGained = 0; this.autoGoal = this.autoGoalFor(); this.autoN = 0;
    this.log(`Bắt đầu tu luyện tự động tại ${pl[0]}.`, "green");
    const tok = this.token;
    setTimeout(() => this.autoStep(tok), 250);
  };

  G.autoStop = function (msg = "") {
    if (this.autoOn) { this.autoOn = false; if (msg) this.log(msg, "gold"); }
  };

  G.autoCheckFull = function () {
    const p = this.p, o = p.auto_cfg.opts, need = p.need_exp();
    if (p.exp >= need * 1.5 && p.suppress) {
      this.autoStop("Tu vi đã áp chế đến cực hạn.");
      this.promptBreakthrough(true); return true;
    }
    if (p.exp >= need && !p.suppress && (o.full || (o.pre && p.tang === 9) || p.exp >= need * 1.5)) {
      this.autoStop("Tu vi đã viên mãn.");
      this.promptBreakthrough(false); return true;
    }
    return false;
  };

  G.autoStep = function (tok) {
    if (!this.autoOn || tok !== this.token || this.dead || !this.inGame) return;
    const p = this.p, cfg = p.auto_cfg, pl = PLACES[cfg.place];
    if (pl[2] && p.stone < pl[2]) { this.autoStop("Hết linh thạch, dừng tu luyện tự động."); return; }
    if (this.autoCheckFull()) return;
    p.stone -= pl[2];
    const g = this.autoMonthGain();
    if (cfg.opts.pill) {
      const got = this.invTake("Tụ Khí Đan", 1, true);
      if (got.length) this.log(this.applyItem("Tụ Khí Đan", got[0]), "cyan");
    }
    p.exp += g; this.autoGained += g; this.autoN++;
    this.scene.play("train", 40);
    this.scene.floatText(`+${g}`, "#7dff7d");
    if (!this.passTime(1)) { this.autoOn = false; return; }
    this.refresh();
    if (this.autoN % 6 === 0) { this.log(`Tu luyện tự động: đã +${this.autoGained} tu vi.`, "dim"); this.autosave(); }
    if (this.autoCheckFull()) return;
    if (this.autoGoal && this.autoGained >= this.autoGoal) {
      if (TARGETS[cfg.target][1] === 0) { this.autoStop("Tu vi đã đủ để đột phá."); this.promptBreakthrough(false); return; }
      if (cfg.opts.change) {
        const sks = p.skills.filter(s => SKILLS[s].exp > 0);
        if (sks.length) {
          const cur = sks.indexOf(cfg.skill);
          cfg.skill = sks[(cur + 1) % sks.length];
          this.log(`Hoàn thành mục tiêu, đổi sang công pháp ${cfg.skill}.`, "gold");
        }
        this.autoGained = 0; this.autoGoal = this.autoGoalFor();
      } else {
        this.autoStop(`Hoàn thành mục tiêu tu luyện (+${this.autoGained} tu vi).`);
        this.autosave(); return;
      }
    }
    if (this.autoCheckFull()) return;
    setTimeout(() => this.autoStep(tok), AUTO_MS);
  };

  G.promptBreakthrough = function (final) {
    if (this.btWin) this.btWin.close();
    const p = this.p, m = TT.ui.modal("bt-box", () => m.close());
    this.btWin = m;
    m.box.append(
      h("h2", { class: "mtitle t-gold" }, "Đã đạt điều kiện đột phá"),
      h("p", { class: "center" }, `Tu vi ${p.exp} / ${p.need_exp()}. Tự động tu luyện đã dừng - đột phá phải do chính bạn kích hoạt.`,
        h("br"), final ? "Tu vi đã áp chế đến cực hạn, không thể áp chế thêm." : "Áp chế thêm sẽ tăng tỉ lệ thành công (tối đa +15%)."),
      h("div", { class: "row center" },
        TT.ui.btn("【Đột phá】", () => { m.close(); this.act(this.actBreakthrough); }, { cls: "gold" }),
        final ? null : TT.ui.btn("【Tiếp tục áp chế】", () => {
          m.close(); p.suppress = true;
          this.log("Bạn áp chế cảnh giới, tiếp tục tích lũy tu vi.", "gold");
          this.autoStart();
        }, { cls: "cyan" })));
  };

  G.openAuto = function () {
    if (this.autoWin && this.autoWin.overlay.isConnected) return;
    const p = this.p, cfg = p.auto_cfg;
    const m = TT.ui.modal("auto-box", () => { clearInterval(timer); m.close(); });
    this.autoWin = m;

    const skOpts = ["Không chọn", ...p.skills.filter(s => SKILLS[s].exp > 0)];
    const plOpts = PLACES.map(([n, r, c, mul]) => `${n}  (x${mul.toFixed(1)}, ${c === 0 ? "miễn phí" : c + " linh thạch/tháng"})${r <= p.realm ? "" : "  [khóa]"}`);
    const sel = (opts, idx, onchange) => {
      const s = h("select", { class: "sel", onchange: () => onchange(s.selectedIndex) }, opts.map(o => h("option", {}, o)));
      s.selectedIndex = idx; return s;
    };
    const sSk = sel(skOpts, Math.max(0, skOpts.indexOf(cfg.skill)), i => { cfg.skill = i === 0 ? "" : skOpts[i]; });
    const sPl = sel(plOpts, cfg.place, i => {
      if (PLACES[i][1] > p.realm) { this.log(`Cảnh giới chưa đủ để vào ${PLACES[i][0]}.`, "red"); sPl.selectedIndex = cfg.place; }
      else cfg.place = i;
    });
    const sTg = sel(TARGETS.map(t => t[0]), cfg.target, i => { cfg.target = i; });
    const lbTime = h("div"), lbCost = h("div"), lbState = h("div");
    const bar = new TT.ui.Bar("#3f8f6a", 16);
    const checks = [["change", "Tự động đổi công pháp khi hoàn thành"], ["pill", "Tự động sử dụng Tụ Khí Đan"],
      ["full", "Dừng khi đầy tu vi"], ["pre", "Dừng trước khi đại đột phá (tầng 9)"]].map(([k, t]) =>
      h("label", { class: "chk" }, h("input", { type: "checkbox", checked: cfg.opts[k], onchange: e => { cfg.opts[k] = e.target.checked; } }), " " + t));
    const bGo = TT.ui.btn("Bắt đầu", () => { if (this.autoOn) this.autoStop("Bạn dừng tu luyện tự động."); else this.autoStart(); upd(); }, { cls: "go" });

    m.box.append(
      h("h2", { class: "mtitle" }, "Tu luyện tự động"),
      h("div", { class: "form-auto" }, h("label", {}, "Công pháp:"), sSk, h("label", {}, "Địa điểm:"), sPl, h("label", {}, "Mục tiêu:"), sTg),
      h("div", { class: "panel info-lines" }, lbTime, lbCost, lbState),
      h("div", { class: "center" }, bar.el), h("div", { class: "checks" }, checks),
      h("div", { class: "row center" }, bGo, TT.ui.btn("Đóng", () => { clearInterval(timer); m.close(); }, { cls: "dimbtn" })));

    const upd = () => {
      if (!m.overlay.isConnected) { clearInterval(timer); return; }
      const pl = PLACES[cfg.place];
      let goal, done, left;
      if (this.autoOn) { goal = this.autoGoal; done = this.autoGained; left = Math.max(0, goal - done); }
      else { goal = this.autoGoalFor(); done = 0; left = goal; }
      const gm = Math.max(1.0, this.autoMonthGain(true)), months = left ? Math.ceil(left / gm) : 0;
      lbTime.textContent = `Thời gian dự kiến:  ${TT.fmtTime(months * AUTO_MS / 1000)}  (~${months} tháng trong game)`;
      lbCost.textContent = "Tiêu hao:  " + (pl[2] === 0 ? "không tốn linh thạch" : `${months * pl[2]} linh thạch (${pl[2]}/tháng)`);
      if (this.autoOn) { lbState.textContent = `Trạng thái:  ● Đang tu luyện   (+${done} / ${goal} tu vi)`; lbState.style.color = C.GREEN; }
      else if (p.exp >= p.need_exp()) { lbState.textContent = "Trạng thái:  ◆ Đã đạt điều kiện đột phá"; lbState.style.color = C.GOLD; }
      else { lbState.textContent = "Trạng thái:  ○ Đang nghỉ"; lbState.style.color = C.DIM; }
      bar.set(done, goal || 1, `${done} / ${goal}`);
      bGo.querySelector("span").textContent = this.autoOn ? "Dừng" : "Bắt đầu";
      bGo.className = "btn go " + (this.autoOn ? "red" : "");
      [sSk, sPl, sTg].forEach(s => { s.disabled = this.autoOn; });
    };
    const timer = setInterval(upd, 300);
    upd();
  };
})();
