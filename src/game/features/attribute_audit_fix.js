/* Attribute hardening: render Linh căn safely and keep stat descriptions aligned with gameplay. */
"use strict";
(function () {
  if (!window.TT || !TT.Game) return;
  const G = TT.Game.prototype;

  /** Native replaceChildren() converts null/undefined to literal text. Always filter optional UI nodes first. */
  TT.replaceChildrenSafe = (target, ...children) => {
    if (!target || typeof target.replaceChildren !== "function") return;
    const safe = children.flat(Infinity).filter(x => x != null && x !== false);
    target.replaceChildren(...safe);
  };

  /* Descriptions are kept as a gameplay contract: every sentence below maps to a real formula/use site. */
  Object.assign(TT.STAT_DESC, {
    "Tướng Mạo": "Ngoại hình và xã giao: giảm giá cửa hàng, tăng cơ hội gặp NPC/quý nhân và hỗ trợ nhiệm vụ xã giao.",
    "Phúc Duyên": "Tăng tần suất/chất lượng cơ duyên, né tránh và cơ hội thu được tài nguyên hoặc chiến lợi phẩm.",
    "Căn Cốt": "Tăng tốc độ tu luyện, khí huyết, chiến lực và phòng ngự.",
    "Ngộ Tính": "Tăng tu vi nhận mỗi tháng và tăng tỉ lệ đột phá.",
    "Vận Khí": "Tăng chí mạng, tăng tỉ lệ đột phá và giảm nguy cơ gặp kỳ ngộ bất lợi.",
  });

  const refreshBasic0 = G.refreshBasic;
  G.refreshBasic = function () {
    const out = typeof refreshBasic0 === "function" ? refreshBasic0.apply(this, arguments) : undefined;
    if (!this.rootRoll) return out;

    /* rollRoot/cleanRoot only produce valid elements. Re-clean defensively so imported/legacy state can never leak bad UI. */
    const root = TT.cleanRoot(this.rootRoll) || TT.rollRoot();
    this.rootRoll = root;
    const info = TT.rootInfo(root);
    const chip = el => h("span", {
      class: "chip",
      style: { color: TT.ELEMENTS[el].color, borderColor: TT.ELEMENTS[el].color },
    }, el);

    if (this.lblRoot) TT.replaceChildrenSafe(this.lblRoot, root.els.map(chip));
    if (this.rootBox) {
      const rows = [
        h("div", { class: "bold" }, `${info.name}  -  tốc độ tu luyện ${info.exp >= 0 ? "+" : ""}${Math.round(info.exp * 100)}%`),
        ...root.els.map(el => h("div", { class: "small" },
          h("span", { style: { color: TT.ELEMENTS[el].color }, class: "bold" }, el + ": "),
          TT.elemDesc(el, info.scale))),
      ];
      if (info.life > 0) rows.push(h("div", { class: "cyan small" },
        `Bù đắp: mỗi lần đại đột phá +${info.life} năm thọ nguyên, đột phá thất bại giữ thêm ${Math.round(info.keep * 100)}% tu vi.`));
      rows.push(h("div", { class: "dim small" },
        "Gieo lại xúc xắc để đổi linh căn. Linh căn ít nguyên tố thì tu luyện nhanh hơn; mỗi nguyên tố cho thêm sức mạnh riêng và tương khắc với bí cảnh."));
      TT.replaceChildrenSafe(this.rootBox, rows);
    }
    return out;
  };

  /** Pure audit used by tests and diagnostics. Returns human-readable errors, never mutates player state. */
  TT.auditAttributes = () => {
    const errors = [], finite = (v, where) => { if (!Number.isFinite(v)) errors.push(`${where}: non-finite`); };
    const statSet = new Set(TT.STATS);
    if (statSet.size !== TT.STATS.length) errors.push("STATS: duplicate key");
    for (const s of TT.STATS) if (typeof TT.STAT_DESC[s] !== "string" || !TT.STAT_DESC[s].trim()) errors.push(`STAT_DESC:${s}`);

    for (const [race, [, bonus]] of Object.entries(TT.RACES)) {
      for (const [k, v] of Object.entries(bonus || {})) {
        if (!statSet.has(k)) errors.push(`RACES:${race}:unknown stat ${k}`);
        finite(v, `RACES:${race}:${k}`);
      }
    }

    const allowedElem = new Set(["color", "story", "atk", "def", "hp", "exp", "crit", "dodge", "regen"]);
    for (const [el, def] of Object.entries(TT.ELEMENTS)) {
      if (typeof def.color !== "string" || typeof def.story !== "string") errors.push(`ELEMENTS:${el}:metadata`);
      for (const [k, v] of Object.entries(def)) {
        if (!allowedElem.has(k)) errors.push(`ELEMENTS:${el}:unknown ${k}`);
        if (!["color", "story"].includes(k)) finite(v, `ELEMENTS:${el}:${k}`);
      }
    }

    const ns = TT.ROOT_TYPES.map(x => x.n), weight = TT.ROOT_TYPES.reduce((s, x) => s + x.w, 0);
    if (ns.join(",") !== "1,2,3,4,5") errors.push("ROOT_TYPES: expected n=1..5");
    if (weight !== 97) errors.push(`ROOT_TYPES: weight=${weight}, expected 97`);
    for (const t of TT.ROOT_TYPES) {
      for (const k of ["n", "exp", "scale", "w", "life", "keep"]) finite(t[k], `ROOT_TYPES:${t.name}:${k}`);
      if (!(t.scale > 0) || t.keep < 0 || t.keep > 1 || t.life < 0) errors.push(`ROOT_TYPES:${t.name}:range`);
    }

    for (const [name, def] of Object.entries(TT.SKILLS)) for (const k of ["cost", "realm", "exp", "power", "hp"]) finite(def[k], `SKILLS:${name}:${k}`);
    for (const [name, def] of Object.entries(TT.SECTS)) for (const k of ["realm", "exp", "power", "stipend", "disc"]) finite(def[k], `SECTS:${name}:${k}`);
    for (const [name, def] of Object.entries(TT.GEAR)) for (const k of ["mat", "realm", "power", "hp", "exp"]) finite(def[k], `GEAR:${name}:${k}`);
    return errors;
  };
})();
