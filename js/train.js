/* Công thức tu vi mỗi tháng của nhập định và hộp thoại đạt điều kiện đột phá. */
"use strict";
(function () {
  const G = TT.Game.prototype;

  /** Tu vi trung bình mỗi tháng khi nhập định. */
  G.idleMonthGain = function () {
    const p = this.p;
    const base = 4 + p.stats["Căn Cốt"] * 1.5 + p.stats["Ngộ Tính"] * 2 + p.level * 1.5;
    return base * p.exp_mult() * 1.05;
  };

  /** Hộp thoại khi tu vi viên mãn: người chơi tự quyết định đột phá hoặc áp chế thêm (nhập định không bao giờ tự đột phá). */
  G.promptBreakthrough = function (final) {
    if (this.btWin) this.btWin.close();
    const p = this.p, m = TT.ui.modal("bt-box", () => m.close());
    this.btWin = m;
    m.box.append(
      h("h2", { class: "mtitle t-gold" }, "Đã đạt điều kiện đột phá"),
      h("p", { class: "center" }, `Tu vi ${p.exp} / ${p.need_exp()}. Tu vi đã dừng tăng ở mức này - đột phá phải do chính bạn kích hoạt.`,
        h("br"), final ? "Tu vi đã áp chế đến cực hạn, không thể áp chế thêm." : "Áp chế thêm sẽ tăng tỉ lệ thành công (tối đa +15%)."),
      h("div", { class: "row center" },
        TT.ui.btn("【Đột phá】", () => { m.close(); this.act(this.actBreakthrough); }, { cls: "gold" }),
        final ? null : TT.ui.btn("【Tiếp tục áp chế】", () => {
          m.close(); p.suppress = true;
          this.log("Bạn áp chế cảnh giới, tiếp tục tích lũy tu vi.", "gold");
        }, { cls: "cyan" })));
  };
})();
