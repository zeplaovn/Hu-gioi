/* Linh điền: gieo, tưới, bón, trừ sâu, thu hoạch Linh Thảo. Dùng bộ ô đất / đồ trang trí mới. */
"use strict";
(function () {
  const { C, QN, RIPE } = TT;
  const G = TT.Game.prototype;

  G.farmTick = function () {
    this.p.plots.forEach((pl, i) => {
      if (!pl || pl.wilt) return;
      pl.age++;
      pl.water = Math.max(0.0, pl.water - 0.34);
      pl.soil = Math.max(0.0, pl.soil - 0.08);
      if (!pl.pest && Math.random() < 0.14) { pl.pest = true; this.log(`Linh điền ô ${i + 1} xuất hiện sâu bệnh!`, "red"); }
      pl.dry = pl.water <= 0 ? pl.dry + 1 : 0;
      if (pl.water > 0 && !pl.pest) pl.good += 1.0 + (pl.soil >= 0.4 ? 0.25 : 0.0);
      if (pl.dry >= 3 || pl.age > 14) { pl.wilt = true; this.log(`Linh thảo ô ${i + 1} đã héo úa!`, "red"); }
    });
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
        info = [h("b", { class: ripe ? "t-gold" : "" }, `Ô ${i + 1}: Linh Thảo  tháng ${pl.age}/${RIPE}  (${tag})`),
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
      h("div", { class: "dim small center" }, "Nước cạn sau ~3 tháng, đất cần bón, sâu bệnh xuất hiện ngẫu nhiên. Thu hoạch lúc tháng 6-9 để được phẩm chất cao."),
      body,
      h("div", { class: "row center" }, TT.ui.btn("Chờ 1 tháng", () => this.farmWait(), { cls: "cyan" }), TT.ui.btn("Đóng", () => w.close(), { cls: "dimbtn" })));
    body.scrollTop = scroll;
  };

  G.openFarm = function () {
    if (this.farmWin && this.farmWin.overlay.isConnected) return;
    const m = TT.ui.modal("farm-box", () => m.close());
    const close = m.close; m.close = () => { close(); this.farmWin = null; this.renderDialog(); };
    this.farmWin = m;
    this.renderFarm();
  };

  G.farmWait = function () {
    if (this.dead || !this.inGame) return;
    this.log("Bạn chờ linh thảo lớn thêm một tháng.", "dim");
    if (this.passTime(1)) this.refresh();
    this.renderFarm();
  };

  G.farmAct = function (i, key) {
    const p = this.p, pl = p.plots[i], sc = this.scene;
    const flashTile = tile => {
      this.farmFx[i] = { tile, until: Date.now() + 1300 };
      setTimeout(() => this.renderFarm(), 1350);
    };
    if (key === "seed" && !pl && this.invTake("Hạt Linh Thảo", 1).length) {
      p.plots[i] = { age: 0, water: 1.0, soil: 0.6, pest: false, good: 0.0, dry: 0, wilt: false };
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
