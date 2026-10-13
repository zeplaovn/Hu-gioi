/* Linh điền: gieo, tưới, bón, trừ sâu, thu hoạch Linh Thảo. Dùng bộ ô đất / đồ trang trí mới. */
"use strict";
(function () {
  const { C, QN, RIPE, FARM } = TT;
  const STEP = FARM.STEP_S * 1000;
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const G = TT.Game.prototype;

  /** Một "tháng linh điền" (FARM.STEP_S giây thật) trôi qua khi người chơi có mặt: nước cạn dần, đất kém đi, có thể sâu bệnh / héo. */
  G.farmStep = function (pl, i) {
    pl.age++;
    pl.water = Math.max(0.0, pl.water - 0.34);
    pl.soil = Math.max(0.0, pl.soil - 0.08);
    if (!pl.pest && Math.random() < FARM.PEST) { pl.pest = true; this.log(`Linh điền ô ${i + 1} xuất hiện sâu bệnh!`, "red"); }
    pl.dry = pl.water <= 0 ? pl.dry + 1 : 0;
    if (pl.water > 0 && !pl.pest) pl.good += 1.0 + (pl.soil >= 0.4 ? 0.25 : 0.0);
    if (pl.dry >= 3 || pl.age > 14) { pl.wilt = true; this.log(`Linh thảo ô ${i + 1} đã héo úa!`, "red"); }
  };

  /** Vắng mặt: cây vẫn lớn đến lúc chín (coi như được chăm đủ), rồi dừng chờ bạn - không sâu bệnh, khô hạn hay héo. */
  const farmStepAway = pl => { if (pl.age < RIPE) { pl.age++; pl.good += 1.0; } };

  /** Đồng bộ linh điền với đồng hồ thật. Gọi mỗi giây (idleTick) và khi mở lại game. Trả về true nếu có ô đổi trạng thái. */
  G.farmSync = function () {
    const p = this.p;
    if (!p || !Array.isArray(p.plots)) return false;
    const now = Date.now(), away = !this.farmLast || now - this.farmLast > FARM.AWAY_MS;
    let changed = false;
    p.plots.forEach((pl, i) => {
      if (!pl || pl.wilt) return;
      if (!(pl.ts <= now)) pl.ts = now;                           // thiếu mốc (save cũ) hoặc đồng hồ bị chỉnh lùi
      const steps = Math.floor((now - pl.ts) / STEP);
      if (steps >= 1) {
        for (let s = 0; s < steps && !pl.wilt; s++) (away ? farmStepAway(pl) : this.farmStep(pl, i));
        pl.ts += steps * STEP; changed = true;
      }
      if (away && pl.age >= RIPE && now - pl.ts > 0) pl.ts = now;  // cây chín lúc vắng mặt: bắt đầu tính quá chín từ lúc bạn quay lại
    });
    this.farmLast = now;
    if (this.farmWin && this.farmWin.overlay.isConnected) (changed ? this.renderFarm() : this.farmClock());
    return changed;
  };

  /** Thời gian còn lại đến khi chín (ms), 0 nếu đã chín. */
  const toRipe = pl => Math.max(0, (RIPE - pl.age) * STEP - (Date.now() - pl.ts));
  G.farmClock = function () {
    const w = this.farmWin;
    if (!w || !w.overlay.isConnected) return;
    w.box.querySelectorAll(".farm-clock").forEach(el => { const pl = this.p.plots[+el.dataset.i]; if (pl && !pl.wilt) el.textContent = pl.age >= RIPE ? "" : `Chín sau ${clock(toRipe(pl))}`; });
  };

  const tileFor = (pl, fx) => {
    if (fx) return fx.tile;
    if (!pl) return "empty";
    if (pl.wilt) return "wilt";
    if (pl.age === 0) return "seed";
    if (pl.age < 3) return "sprout";
    if (pl.age < RIPE) return "grow";
    return "ripe";
  };
  const harvestQ = pl => {
    const ratio = pl.good / Math.max(1, pl.age);
    let q = ratio >= 1.1 ? 4 : ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
    if (pl.age > 9) q = Math.max(1, q - 1);
    return q;
  };
  const meter = v => h("span", { class: "meter" }, h("i", { style: { width: Math.round(clamp(v, 0, 1) * 100) + "%" } }));

  G.renderFarm = function () {
    const w = this.farmWin;
    if (!w || !w.overlay.isConnected) return;
    const p = this.p, box = w.box;
    const plots = [0, 1, 2, 3].map(i => {
      const pl = p.plots[i], fx = this.farmFx[i] && this.farmFx[i].until > Date.now() ? this.farmFx[i] : null;
      const ripe = pl && !pl.wilt && pl.age >= RIPE;
      let info, cls = "";
      if (!pl) info = [h("b", {}, `Ô ${i + 1}: đất trống`), h("div", { class: "dim small" }, "Gieo Hạt Linh Thảo (mua ở Cửa hàng).")];
      else if (pl.wilt) { cls = "wilt"; info = [h("b", { class: "t-red" }, `Ô ${i + 1}: Linh Thảo đã héo úa`), h("div", { class: "dim small" }, "Nhổ bỏ để gieo lại.")]; }
      else {
        const tag = ripe ? (pl.age <= 9 ? "CHÍN - thu hoạch được!" : "QUÁ CHÍN, đang héo dần") : "đang lớn";
        info = [h("b", { class: ripe ? "t-gold" : "" }, `Ô ${i + 1}: Linh Thảo  ${pl.age}/${RIPE} phút  (${tag})`),
          h("div", { class: "farm-clock cyan small", "data-i": String(i) }, ripe ? "" : `Chín sau ${clock(toRipe(pl))}`),
          h("div", { class: "meters small" }, "Nước ", meter(pl.water), " Đất ", meter(pl.soil)),
          h("div", { class: "small " + (pl.pest ? "t-red" : "dim") }, "Sâu bệnh: " + (pl.pest ? "CÓ" : "không"))];
      }
      const badge = ripe ? h("img", { class: "herb-badge", src: TT.herbIcon(harvestQ(pl)), alt: "", title: "Phẩm chất dự kiến: " + QN[harvestQ(pl)] }) : null;
      const b = (key, label, ok) => TT.ui.btn(label, () => this.farmAct(i, key), { cls: "sm", disabled: !ok });
      const seedOk = !pl && this.invN("Hạt Linh Thảo") > 0;
      return h("div", { class: "plot panel " + cls },
        h("div", { class: "tile-wrap" }, h("img", { class: "tile", src: `assets/farm/${tileFor(pl, fx)}.png`, alt: "" }), badge,
          pl && pl.pest && !pl.wilt ? h("span", { class: "pest-badge" }, "🐛") : null),
        h("div", { class: "plot-info" }, info),
        h("div", { class: "plot-btns" },
          b("seed", "Gieo hạt", seedOk), b("water", "Tưới nước", !!pl && !pl.wilt), b("soil", "Bón thổ (1)", !!pl && !pl.wilt && p.stone >= 1),
          b("pest", "Trừ sâu", !!pl && !pl.wilt && pl.pest), b("pick", pl && pl.wilt ? "Nhổ bỏ" : "Thu hoạch", !!pl && (pl.wilt || ripe))));
    });
    const deco = (n, cls) => h("img", { class: "deco " + cls, src: `assets/farm/${n}.png`, alt: "" });
    const scroll = box.querySelector(".farm-body")?.scrollTop || 0;
    const body = h("div", { class: "farm-body" },
      h("div", { class: "farm-grid" }, deco("scarecrow", "d-scare"), h("div", { class: "plots" }, plots), deco("rune", "d-rune")),
      h("div", { class: "farm-deco-row" }, deco("fence", "d-fence"), deco("trough", "d-trough")));
    box.replaceChildren(
      h("h2", { class: "mtitle" }, "Linh điền"),
      h("div", { class: "cyan center pw" }, `Linh thạch: ${p.stone}      Hạt Linh Thảo: ${this.invN("Hạt Linh Thảo")}      Linh Thảo: ${this.invN("Linh Thảo")}`),
      h("div", { class: "dim small center pre hub-note" }, `Cây lớn theo thời gian thật (${FARM.STEP_S >= 60 ? FARM.STEP_S / 60 + " phút" : FARM.STEP_S + " giây"} = 1 tháng, chín sau ${RIPE} tháng), kể cả khi bạn đóng game.\nBạn có mặt thì cần tưới nước, bón thổ, trừ sâu; thu hoạch lúc tháng 6-9 để được phẩm chất cao.`),
      body,
      h("div", { class: "row center" }, TT.ui.btn("Đóng", () => w.close(), { cls: "dimbtn" })));
    body.scrollTop = scroll;
  };

  G.openFarm = function () {
    if (this.farmWin && this.farmWin.overlay.isConnected) return;
    const m = TT.ui.modal("farm-box", () => m.close());
    const close = m.close; m.close = () => { close(); this.farmWin = null; this.renderDialog(); };
    this.farmWin = m;
    this.renderFarm();
  };

  G.farmAct = function (i, key) {
    const p = this.p, pl = p.plots[i], sc = this.scene;
    const flashTile = tile => {
      this.farmFx[i] = { tile, until: Date.now() + 1300 };
      setTimeout(() => this.renderFarm(), 1350);
    };
    if (key === "seed" && !pl && this.invTake("Hạt Linh Thảo", 1).length) {
      p.plots[i] = { age: 0, water: 1.0, soil: 0.6, pest: false, good: 0.0, dry: 0, wilt: false, ts: Date.now() };
      this.log(`Gieo hạt ở ô ${i + 1}.`, "dim");
    } else if (key === "water" && pl) {
      pl.water = 1.0; sc.fxOnce("heal", null, sc.gy + 6, 0.5, "s"); flashTile("water");
    } else if (key === "soil" && pl && p.stone >= 1) {
      p.stone -= 1; pl.soil = 1.0; flashTile("gold");
    } else if (key === "pest" && pl) {
      pl.pest = false;
    } else if (key === "pick" && pl) {
      if (pl.wilt) this.log(`Nhổ bỏ cây héo ở ô ${i + 1}.`, "dim");
      else {
        const q = harvestQ(pl), n = 2 + (q >= 3 ? 1 : 0) + (q === 4 ? 1 : 0);
        this.invAdd("Linh Thảo", q, n);
        this.log(`Thu hoạch ${n} Linh Thảo [${QN[q]}] ở ô ${i + 1}.`, "gold");
        sc.floatText(`+${n} Linh Thảo`, C.GOLD);
      }
      p.plots[i] = null;
    }
    this.refresh(); this.autosave(); this.renderFarm();
  };
})();
