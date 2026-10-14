/* Màn tạo nhân vật, màn chơi chính và hộp thoại danh sách. */
"use strict";
(function () {
  const { C, STATS, STAT_DESC, RACES, REALM_COLORS } = TT;
  const G = TT.Game.prototype;
  const app = () => document.getElementById("app");

  G.clear = function () {
    this.inGame = false;
    document.getElementById("modal-root").replaceChildren();
    this.dlg = null;
    if (this.scene) { this.scene.destroy(); this.scene = null; }
    if (this.createScene) { this.createScene.destroy(); this.createScene = null; }
    clearInterval(this.pumpTimer);
    clearInterval(this.idleTimer);
    app().replaceChildren();
  };

  /* ===================== MÀN TẠO NHÂN VẬT ===================== */
  G.showCreate = function () {
    this.clear();
    this.p = null; this.dead = false;
    this.gender = "Nam";
    this.age = rnd(14, 30);
    this.race = pick(Object.keys(RACES));
    this.rootRoll = TT.rollRoot();
    this.points = 8;
    this.alloc = Object.fromEntries(STATS.map(s => [s, 0]));

    const sc = new TT.Scene(660, 330, () => "#cfd8dc", 0.5, "title");
    sc.setSeason(rnd(0, 3));
    this.createScene = sc;

    this.raceInfo = h("div", { class: "panel info-box" });
    this.rootBox = h("div", { class: "panel info-box root-box" });
    const left = h("div", { class: "create-left" },
      h("div", { class: "scene-wrap" }, sc.cv),
      h("h2", { class: "center" }, `Đây là lần trùng sinh thứ ${this.count} của bạn`),
      h("p", { class: "story" },
        "Bạn vốn là 1 người đi làm bình thường, nhưng vào 1 lần mưa gió xuyên vào thế giới tu tiên chữ thần kỳ. Trong thế giới này, bạn trải nghiệm 1 ",
        h("span", { class: "t-green" }, "hành trình tu hành phong cách đặc biệt.")),
      h("p", { class: "story dim small" }, "Chọn đạo hiệu và linh căn rồi nhập định: tu vi tự tăng theo thời gian, kể cả khi bạn đóng game. Kỳ ngộ sẽ tìm đến, bí cảnh chờ bạn thám hiểm."),
      this.raceInfo, this.rootBox);

    /* giới tính */
    this.lblNam = h("button", { class: "seg", type: "button", role: "radio", onclick: () => this.setGender("Nam") }, "Nam");
    this.lblNu = h("button", { class: "seg", type: "button", role: "radio", onclick: () => this.setGender("Nữ") }, "Nữ");

    /* đạo hiệu / tuổi / chủng tộc / linh căn + xúc xắc */
    this.nameIn = h("input", { class: "field name-in", type: "text", maxlength: TT.NAME_MAX, value: TT.randName("Nam"),
      placeholder: "Đạo hiệu của bạn", "aria-label": "Đạo hiệu", autocomplete: "off", spellcheck: "false" });
    this.lblAge = h("div", { class: "field" });
    this.lblRace = h("div", { class: "field" });
    this.lblRoot = h("div", { class: "field root-field" });
    this.diceBtn = {};
    const dice = kind => {
      const img = h("img", { src: "assets/ui/dice_6.png", alt: "xúc xắc", width: 32, height: 32 });
      const b = h("button", { class: "icon-btn", type: "button", title: "Gieo xúc xắc", "aria-label": "Gieo xúc xắc: " + ({ name: "đạo hiệu", age: "tuổi", race: "chủng tộc", root: "linh căn" })[kind], onclick: () => this.roll(kind) }, img);
      this.diceBtn[kind] = img; return b;
    };

    /* chỉ số */
    this.statLbls = {}; this.pmBtns = {};
    const statRows = STATS.map(s => {
      const v = h("span", { class: "stat-val" }, "0");
      this.statLbls[s] = v;
      const mk = d => {
        const key = d > 0 ? "plus" : "minus";
        const img = h("img", { src: `assets/ui/${key}.png`, alt: key, width: 26, height: 26 });
        const b = h("button", { class: "icon-btn pm", type: "button", "aria-label": (d > 0 ? "Tăng " : "Giảm ") + s, onclick: () => this.changeStat(s, d) }, img);
        b.addEventListener("pointerenter", () => { if (!b.disabled) img.src = `assets/ui/${key}_h.png`; });
        b.addEventListener("pointerleave", () => { if (!b.disabled) img.src = `assets/ui/${key}.png`; });
        this.pmBtns[s + d] = { b, img, key };
        return b;
      };
      return h("div", { class: "stat-row" },
        h("button", { class: "stat-name", type: "button", onmouseenter: () => { this.hint.textContent = `${s}: ${STAT_DESC[s]}`; }, onfocus: () => { this.hint.textContent = `${s}: ${STAT_DESC[s]}`; }, onclick: () => { this.hint.textContent = `${s}: ${STAT_DESC[s]}`; } }, s + ":"),
        v, mk(-1), mk(+1), h("img", { class: "stat-ico", src: TT.A.icon(TT.ICON_STAT[s], 22), alt: "" }));
    });
    this.hint = h("div", { class: "dim small hint", "aria-live": "polite" }, "Rê chuột / chạm vào tên chỉ số để xem mô tả.");
    this.lblPoints = h("h2", { class: "t-green center" });

    const right = h("div", { class: "create-right" },
      h("h2", { class: "center" }, "Chào mừng đến Thiên Vân Đại Lục"),
      h("div", { class: "seg-row", role: "radiogroup", "aria-label": "Giới tính" }, this.lblNam, this.lblNu),
      h("div", { class: "form-grid" },
        h("label", {}, "Đạo hiệu :"), this.nameIn, dice("name"),
        h("label", {}, "Tuổi :"), this.lblAge, dice("age"),
        h("label", {}, "Chủng Tộc :"), this.lblRace, dice("race"),
        h("label", {}, "Linh căn :"), this.lblRoot, dice("root")),
      this.lblPoints,
      h("div", { class: "stat-grid" }, statRows),
      this.hint,
      h("div", { class: "col center" },
        TT.ui.btn("Bắt đầu tu tiên", () => this.startGame(), { cls: "wide" }),
        this.saved ? TT.ui.btn("Tiếp tục hành trình đã lưu", () => this.loadGame(), { cls: "wide gold" }) : null,
        h("div", { class: "dim small" }, "Điểm còn dư sẽ được phân ngẫu nhiên khi bắt đầu.")));

    app().append(h("div", { class: "create-screen" }, left, right));
    this.setGender("Nam"); this.refreshBasic(); this.refreshPoints();
  };

  G.setGender = function (g) {
    this.gender = g;
    this.lblNam.classList.toggle("on", g === "Nam"); this.lblNam.setAttribute("aria-checked", String(g === "Nam"));
    this.lblNu.classList.toggle("on", g === "Nữ"); this.lblNu.setAttribute("aria-checked", String(g === "Nữ"));
  };

  G.roll = function (kind) {
    const step = i => {
      if (!this.lblAge.isConnected) return;
      if (kind === "age") this.age = rnd(14, 30);
      else if (kind === "race") this.race = pick(Object.keys(RACES));
      else if (kind === "root") this.rootRoll = TT.rollRoot();
      else this.nameIn.value = TT.randName(this.gender);
      this.refreshBasic();
      this.diceBtn[kind].src = `assets/ui/dice_${rnd(1, 6)}.png`;
      if (i < 12) setTimeout(() => step(i + 1), 40 + i * 9);
      else this.createScene.addRing(C.GREEN);
    };
    step(0);
  };

  G.refreshBasic = function () {
    this.lblAge.textContent = `${this.age} tuổi`;
    this.lblRace.textContent = this.race;
    const [life, bonus] = RACES[this.race];
    const b = Object.entries(bonus).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ") || "không có";
    this.raceInfo.textContent = `Chủng tộc ${this.race}: thọ nguyên ~${life} năm. Thiên phú: ${b}.`;

    const root = this.rootRoll, info = TT.rootInfo(root), chip = el => h("span", { class: "chip", style: { color: TT.ELEMENTS[el].color, borderColor: TT.ELEMENTS[el].color } }, el);
    this.lblRoot.replaceChildren(...root.els.map(chip));
    this.rootBox.replaceChildren(
      h("div", { class: "bold" }, `${info.name}  -  tốc độ tu luyện ${info.exp >= 0 ? "+" : ""}${Math.round(info.exp * 100)}%`),
      ...root.els.map(el => h("div", { class: "small" }, h("span", { style: { color: TT.ELEMENTS[el].color }, class: "bold" }, el + ": "), TT.elemDesc(el, info.scale))),
      info.life ? h("div", { class: "cyan small" }, `Bù đắp: mỗi lần đại đột phá +${info.life} năm thọ nguyên, đột phá thất bại giữ thêm ${Math.round(info.keep * 100)}% tu vi.`) : null,
      h("div", { class: "dim small" }, "Gieo lại xúc xắc để đổi linh căn. Linh căn ít nguyên tố thì tu luyện nhanh hơn; mỗi nguyên tố cho thêm sức mạnh riêng và tương khắc với bí cảnh."));
  };

  G.changeStat = function (s, d) {
    if (d > 0 && this.points > 0) { this.alloc[s]++; this.points--; }
    else if (d < 0 && this.alloc[s] > 0) { this.alloc[s]--; this.points++; }
    this.refreshPoints();
  };

  G.refreshPoints = function () {
    this.lblPoints.textContent = `Số điểm còn lại:  ${this.points}`;
    for (const s of STATS) {
      this.statLbls[s].textContent = this.alloc[s];
      for (const d of [-1, 1]) {
        const { b, img, key } = this.pmBtns[s + d];
        const off = d > 0 ? this.points <= 0 : this.alloc[s] <= 0;
        b.disabled = off; img.src = `assets/ui/${key}${off ? "_d" : ""}.png`;
      }
    }
  };

  G.startGame = function () {
    while (this.points > 0) { this.alloc[pick(STATS)]++; this.points--; }
    const typed = this.nameIn.value, name = TT.cleanName(typed) || TT.randName(this.gender);
    if (typed.trim() && TT.isReservedName(typed.normalize("NFC").replace(/[\[\]]/g, ""))) TT.ui.toast("Tên này dành riêng cho quản trị viên, đã chọn tên khác cho bạn.", "warn");
    this.p = new TT.Player(this.gender, this.age, this.race, this.alloc, { name, root: this.rootRoll });
    this.showGame();
    const p = this.p;
    this.log(`Bạn mở mắt ra: ${p.name}, một ${p.gender === "Nam" ? "nam tử" : "nữ tử"} ${p.age} tuổi, chủng tộc ${p.race}, mang ${TT.rootLabel(p.root)} giữa Thiên Vân Đại Lục.`, "gold");
    this.log(`Thọ nguyên dự kiến ${p.lifespan} tuổi. Bạn đã nhập định - tu vi tự tăng theo thời gian. Học công pháp, thám hiểm bí cảnh và đột phá để kéo dài tuổi thọ!`);
    this.idleStart(false);
    this.autosave();
  };

  G.loadGame = function () {
    this.p = TT.Player.fromDict(this.saved);
    this.showGame();
    this.log(`Chào mừng trở lại, ${this.p.name}. Bạn tiếp tục hành trình tu tiên...`, "gold");
    this.idleStart(true);
  };

  /* ===================== MÀN CHƠI CHÍNH ===================== */
  G.showGame = function () {
    this.clear();
    this.inGame = true; this.dead = false; this.locked = false;
    this.q = []; this.cur = null; this.token++; this.breaking = false;
    const U = this.U = {};

    U.time = h("span", { class: "bold" });
    U.stone = h("span", { class: "bold cyan" });
    U.save = h("span", { class: "save-state", role: "status" }, "Tự động lưu");
    const top = h("div", { class: "topbar" },
      h("span", { class: "game-title" }, "THIÊN VÂN ĐẠI LỤC"),
      h("span", { class: "spacer" }),
      U.save, TT.cloud && TT.cloud.enabled ? TT.auth.chip() : null,
      h("span", { class: "stone-wrap" }, h("img", { src: TT.A.icon("crystal", 22), alt: "" }), U.stone),
      U.time);

    /* cột trái */
    U.realm = h("div", { class: "realm" }); U.name = h("div", { class: "pname" }); U.who = h("div", { class: "dim" });
    U.root = h("div", { class: "root-line" });
    const bar = (name, color, text) => { const b = new TT.ui.Bar(color, 20); b.el.setAttribute("aria-label", name); return [h("div", { class: "bar-label", style: { color: text || color } }, name), b.el, b]; };
    const [l1, e1, bExp] = bar("Tu vi", C.GREEN), [l2, e2, bHp] = bar("Khí huyết", "#d63a3a"), [l3, e3, bAge] = bar("Thọ nguyên", "#d9a21b");
    U.barExp = bExp; U.barHp = bHp; U.barAge = bAge;
    U.statBars = {};
    const statRows = STATS.map(s => {
      const b = new TT.ui.Bar("#3f8f6a", 14); U.statBars[s] = b; b.el.setAttribute("aria-label", s);
      return h("div", { class: "mini-stat" }, h("img", { src: TT.A.icon(TT.ICON_STAT[s], 22), alt: "" }), h("span", {}, s), b.el);
    });
    U.power = h("div", { class: "gold pre" }); U.skills = h("div", { class: "cyan small" }); U.sect = h("div", { class: "orange small" });
    const left = h("div", { class: "col-left" }, U.realm, U.name, U.who, U.root, l1, e1, l2, e2, l3, e3,
      h("details", { class: "stat-fold", open: !matchMedia("(max-width: 760px)").matches }, h("summary", {}, "Chỉ số gốc"), statRows), U.power, U.skills, U.sect);

    /* giữa: cảnh + nhật ký */
    this.scene = new TT.Scene(700, 290, () => REALM_COLORS[this.p.realm], 0.33);
    const logEl = this.logEl = h("div", { class: "log", role: "log", "aria-live": "polite", "aria-label": "Nhật ký tu luyện", tabindex: "0",
      onscroll: () => { logEl._follow = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40; if (logEl._follow) jump.hidden = true; } });
    const jump = logEl._jump = h("button", { class: "log-jump", type: "button", hidden: true, onclick: () => { logEl._follow = true; logEl.scrollTop = logEl.scrollHeight; jump.hidden = true; logEl.focus({ preventScroll: true }); } }, "↓ Tin mới");
    const center = h("div", { class: "col-center" }, h("div", { class: "scene-wrap" }, this.scene.cv), this.buildIdlePanel(), h("div", { class: "log-wrap" }, logEl, jump));

    /* phải: hành động */
    this.actionBtns = [];
    const acts = [
      ["Lịch luyện  [L]", this.actExplore, "", "sword"],
      ["Nghỉ ngơi  [N]", this.actRest, "", "peach"], ["Đột phá  [D]", this.actBreakthrough, "gold", "orb_gold"],
      ["Luyện hóa linh thạch", this.actStone, "", "crystal"], ["Cửa hàng đan dược", this.openShop, "cyan", "orb_green"],
      ["Công pháp", this.openSkills, "cyan", "@skills/book_gold_40.png"], ["Tông môn", this.openSect, "orange", "bagua"],
      ["Nghề phụ", this.openCrafts, "cyan", "@plants/ginseng_48.png"],
      ["Túi đồ", this.openBag, "cyan", "charm"]];
    this.cdBtns = [];
    const mkAct = (name, fn, cls, icon, kbd, extra = "") => {
      const b = TT.ui.btn(name, () => this.act(fn), { cls: cls + extra, icon, kbd }); this.actionBtns.push(b);
      if (fn === this.actExplore || fn === this.actRest) { b.dataset.base = name; this.cdBtns.push(b); }
      return b;
    };
    const actEls = acts.map(([label, fn, cls, ic]) => {
      const icon = ic[0] === "@" ? "assets/" + ic.slice(1) : TT.A.icon(ic, 22);
      const m = label.match(/^(.*?)\s*\[(\w)\]$/), name = m ? m[1] : label, kbd = m ? m[2] : null;
      if (fn === this.actBreakthrough) {                                  // ấn chu sa: vừa là nút, vừa là thanh tiến độ tu vi
        const b = U.breakBtn = mkAct(name, fn, "", icon, kbd, " act seal");
        U.breakPct = h("span", { class: "seal-pct" }); b.querySelector(".btn-label").append(" ", U.breakPct);
        return b;
      }
      return mkAct(name, fn, cls, icon, kbd, kbd ? " act dup" : " act");   // 3 việc hay làm đã có trên thanh thao tác nhanh (mobile) nên ẩn bản trùng
    });
    /* thanh thao tác nhanh (chỉ hiện trên điện thoại): các việc hay làm nhất luôn nằm trong tầm ngón cái */
    const dockSpec = [["Lịch luyện", this.actExplore, "sword"], ["Nghỉ ngơi", this.actRest, "peach"], ["Đột phá", this.actBreakthrough, "orb_gold", "seal"]];
    const dock = h("nav", { class: "dock", "aria-label": "Thao tác nhanh" }, dockSpec.map(([name, fn, ic, cls]) => {
      const b = mkAct(name, fn, cls || "", TT.A.icon(ic, 22), null, ""); if (fn === this.actBreakthrough) U.dockBreak = b; return b;
    }), TT.ui.btn("Thêm", () => document.querySelector(".col-right")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), { cls: "dimbtn", icon: TT.A.icon("bagua", 22) }));
    /* các bảng thông tin: mở ngay, không bị khóa thao tác như hành động tu luyện */
    const infos = [
      ["Chỉ số nhân vật", this.openSheet, "cyan", "portrait"], ["Linh căn", this.openRoot, "cyan", "orb_green"],
      ["Bí cảnh", this.openSecrets, "orange", "crystal"], ["Kỳ ngộ", this.openEnc, "gold", "clover"]];
    if (TT.cloud && TT.cloud.enabled && TT.cloud.user() && this.openBoard) infos.push(["Bảng xếp hạng", this.openBoard, "gold", "bagua"]);
    const infoEls = infos.map(([label, fn, cls, ic]) => {
      const b = TT.ui.btn(label, () => { if (this.inGame && this.p) fn.call(this); }, { cls: cls + " act", icon: TT.A.icon(ic, 22) });
      this.actionBtns.push(b); return b;
    });
    const right = h("div", { class: "col-right" }, h("div", { class: "sec" }, "Tu hành"), actEls,
      h("div", { class: "sec" }, "Nhân vật & thế giới"), infoEls,
      TT.ui.btn("Lưu game", () => this.manualSave(), { cls: "dimbtn act gap" }),
      TT.ui.btn("Trùng sinh (làm lại)", async () => {
        if (this.dead || await TT.ui.confirm({ title: "Trùng sinh làm lại?", text: "Nhân vật hiện tại sẽ bị bỏ dở và chỉ nhận một nửa điểm Thiên Mệnh.", ok: "Trùng sinh", cancel: "Chơi tiếp", danger: true })) this.reincarnate();
      }, { cls: "red act" }),
      h("div", { class: "dim small center" }, "Phím tắt: T, L, N, D"));

    app().append(top, h("div", { class: "main" }, left, center, right), dock);
    this.refresh();
    this.startPump();
  };

  /* ===================== HỘP THOẠI DANH SÁCH ===================== */
  G.openDialog = function (title, rowsFn, opts = {}) {
    if (this.dlg) this.dlg.modal.close();
    const modal = TT.ui.modal("dlg-box", () => this.closeDialog());
    this.dlg = { modal, title, rowsFn, opts };
    this.renderDialog();
  };

  G.closeDialog = function () { if (this.dlg) { this.dlg.modal.close(); this.dlg = null; } };

  G.renderDialog = function () {
    const d = this.dlg;
    if (!d || !d.modal.overlay.isConnected) return;
    const p = this.p, box = d.modal.box, scrollTop = box.querySelector(".rows")?.scrollTop || 0;
    const rows = h("div", { class: "rows" });
    for (const r of d.rowsFn()) {
      const info = h("div", { class: "info" }, h("div", { class: "bold" }, r.name), h("div", { class: "dim small" }, r.desc),
        r.price ? h("div", { class: "gold small" }, r.price) : null);
      const btns = h("div", { class: "row-btns" },
        r.extra ? TT.ui.btn(r.extra.text, () => this.dlgDo(r.extra.cb), { cls: "gold sm", disabled: !r.extra.ok }) : null,
        TT.ui.btn(r.btn, () => this.dlgDo(r.cb), { cls: "sm", disabled: !r.ok }));
      rows.append(h("div", { class: "row-item panel" }, r.icon ? h("img", { class: "row-ico", src: r.icon, alt: "" }) : null, info, btns));
    }
    box.replaceChildren(
      h("h2", { class: "mtitle" }, d.title),
      h("div", { class: "cyan center pw" }, `Linh thạch: ${p.stone}      Cảnh giới: ${p.realm_name()}`),
      rows,
      h("div", { class: "row center" },
        d.opts.back ? TT.ui.btn("‹ Quay lại", () => d.opts.back(), { cls: "dimbtn sm" }) : null,
        TT.ui.btn("Đóng", () => this.closeDialog(), { cls: "dimbtn sm" })));
    rows.scrollTop = scrollTop;
  };

  G.dlgDo = function (cb) {
    if (this.dead) return;
    cb();
    this.refresh(); this.autosave(); this.renderDialog();
  };
})();
