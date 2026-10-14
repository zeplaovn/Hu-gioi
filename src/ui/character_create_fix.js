/* Sửa render màn tạo nhân vật: không truyền null vào Element.replaceChildren().
   DOM sẽ stringify null thành chữ "null", nên các node tùy chọn phải được thêm có điều kiện. */
"use strict";
(function () {
  const G = TT.Game?.prototype;
  if (!G) return;

  G.refreshBasic = function () {
    this.lblAge.textContent = `${this.age} tuổi`;
    this.lblRace.textContent = this.race;
    const [life, bonus] = TT.RACES[this.race];
    const b = Object.entries(bonus).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ") || "không có";
    this.raceInfo.textContent = `Chủng tộc ${this.race}: thọ nguyên ~${life} năm. Thiên phú: ${b}.`;

    const root = this.rootRoll;
    const info = TT.rootInfo(root);
    const chip = el => h("span", { class: "chip", style: { color: TT.ELEMENTS[el].color, borderColor: TT.ELEMENTS[el].color } }, el);
    this.lblRoot.replaceChildren(...root.els.map(chip));

    const rows = [
      h("div", { class: "bold" }, `${info.name}  -  tốc độ tu luyện ${info.exp >= 0 ? "+" : ""}${Math.round(info.exp * 100)}%`),
      ...root.els.map(el => h("div", { class: "small" }, h("span", { style: { color: TT.ELEMENTS[el].color }, class: "bold" }, el + ": "), TT.elemDesc(el, info.scale))),
    ];
    if (info.life) rows.push(h("div", { class: "cyan small" }, `Bù đắp: mỗi lần đại đột phá +${info.life} năm thọ nguyên, đột phá thất bại giữ thêm ${Math.round(info.keep * 100)}% tu vi.`));
    rows.push(h("div", { class: "dim small" }, "Gieo lại xúc xắc để đổi linh căn. Linh căn ít nguyên tố thì tu luyện nhanh hơn; mỗi nguyên tố cho thêm sức mạnh riêng và tương khắc với bí cảnh."));
    this.rootBox.replaceChildren(...rows);
  };
})();
