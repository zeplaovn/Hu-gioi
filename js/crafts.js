/* Nghề phụ có minigame: luyện đan, vẽ phù lục, luyện khí. */
"use strict";
(function () {
  const { ALCH, GEAR, QN, TALIS, FireStage, TimingStage, PathStage } = TT;
  const G = TT.Game.prototype;

  G.openCrafts = function () { this.openDialog("Nghề phụ", () => this.rowsCrafts()); };

  G.rowsCrafts = function () {
    const back = () => this.openCrafts();
    return [
      { name: "Linh điền", icon: TT.iconFor("Linh điền"), desc: "Gieo hạt, tưới nước, bón thổ, trừ sâu, thu hoạch Linh Thảo đúng lúc.", price: "", btn: "Mở", cb: () => this.openFarm(), ok: true },
      { name: "Luyện đan", icon: TT.iconFor("Luyện đan"), desc: "Điều chỉnh hỏa lực, thả dược liệu đúng thời điểm, ngưng đan.", price: "", btn: "Mở", cb: () => this.openDialog("Luyện đan", () => this.rowsAlch(), { back }), ok: true },
      { name: "Vẽ phù lục", icon: TT.iconFor("Vẽ phù lục"), desc: "Kéo bút theo phù văn, truyền linh lực đúng lúc.", price: "", btn: "Mở", cb: () => this.openDialog("Vẽ phù lục", () => this.rowsTalis(), { back }), ok: true },
      { name: "Luyện khí", icon: TT.iconFor("Luyện khí"), desc: "Nung quặng, tôi luyện bằng búa, khắc trận văn.", price: "", btn: "Mở", cb: () => this.openDialog("Luyện khí", () => this.rowsForge(), { back }), ok: true },
    ];
  };

  G.rowsAlch = function () {
    const have = this.invN("Linh Thảo");
    return Object.entries(ALCH).map(([n, [c, r]]) => ({
      name: n, icon: TT.iconFor(n, 40),
      desc: `${TT.itemDesc(n, 2)}  (Cần ${c} Linh Thảo, đang có ${have}${r === 0 ? "" : `; cần cảnh giới ${r}`})`,
      price: "", btn: "Luyện", cb: () => this.startAlchemy(n), ok: this.p.realm >= r && have >= c,
    }));
  };
  G.rowsTalis = function () {
    const have = this.invN("Giấy Phù");
    return Object.entries(TALIS).map(([n, [, r]]) => ({
      name: n, icon: TT.iconFor(n, 40), desc: `${TT.itemDesc(n, 2)}  (Cần 1 Giấy Phù, đang có ${have})`,
      price: "", btn: "Vẽ", cb: () => this.startTalisman(n), ok: this.p.realm >= r && have >= 1,
    }));
  };
  G.rowsForge = function () {
    const have = this.invN("Quặng Linh Thiết");
    return Object.entries(GEAR).map(([n, g]) => ({
      name: n, icon: TT.iconFor(n, 40),
      desc: `${g.desc(int(g.power * 1.4 || g.hp * 1.4 || g.exp * 140))} (phẩm Trung). Cần ${g.mat} Quặng, đang có ${have}`,
      price: "", btn: "Rèn", cb: () => this.startForge(n), ok: this.p.realm >= g.realm && have >= g.mat,
    }));
  };

  G.craftBusy = function () { return !!(this.craftWin && this.craftWin.alive); };
  G.openCraft = function (title, stages, onDone) { this.craftWin = new TT.CraftWindow(this, title, stages, onDone); };

  G.startAlchemy = function (name) {
    const [n, rr] = ALCH[name];
    if (this.craftBusy() || this.p.realm < rr || this.invN("Linh Thảo") < n) return;
    const qs = this.invTake("Linh Thảo", n);
    const hq = (qs.reduce((a, b) => a + b, 0) / qs.length - 1) / 3.0;
    const stages = [
      new FireStage("Sơ luyện", "Giữ lửa vừa phải để dược liệu mềm ra.", 5, 0.26),
      new FireStage("Tinh luyện", "Giữ lửa ổn định, vùng xanh hẹp hơn.", 5, 0.19),
      new TimingStage("Dung hợp", "Bấm đúng lúc vạch chạy qua vùng xanh để thả từng dược liệu.", Math.min(n, 4)),
      new FireStage("Ngưng đan", "Giữ lửa thật ổn để ngưng đan!", 4, 0.14)];
    const done = sc => {
      if (sc === null) { this.log("Bạn bỏ dở lò đan, dược liệu hỏng hết.", "red"); return "Đã hủy - mất nguyên liệu."; }
      const s = Math.min(1.0, sc.reduce((a, b) => a + b, 0) / sc.length * 0.9 + 0.1 * hq), q = TT.qualityOf(s);
      if (q === 0) { this.log(`Luyện ${name} thất bại, đan hóa tro.`, "red"); return `Luyện đan thất bại!\nDược liệu hóa thành tro (${int(s * 100)}%).`; }
      const cnt = q >= 3 && Math.random() < Math.max(0.0, s - 0.6) ? 2 : 1;
      this.invAdd(name, q, cnt);
      const msg = `${name} - ${QN[q]}  (độ tinh khiết ${int(s * 100)}%)${cnt === 2 ? "\nXuất hiện đan văn! Được 2 viên." : ""}`;
      this.log("Luyện thành " + msg.replace("\n", " "), "gold");
      this.scene.fxOnce("heal", null, this.scene.gy + 6, 0.35, "s");
      this.refresh(); this.autosave();
      return msg;
    };
    this.openCraft("Luyện đan: " + name, stages, done);
  };

  G.startTalisman = function (name) {
    const [shape, rr] = TALIS[name];
    if (this.craftBusy() || this.p.realm < rr || this.invN("Giấy Phù") < 1) return;
    this.invTake("Giấy Phù", 1);
    const stages = [
      new PathStage("Vẽ phù văn", "Giữ chuột trái (hoặc ngón tay), kéo bút theo đường phù văn, bắt đầu từ vòng xanh. Đừng để cạn mực.", shape),
      new TimingStage("Truyền linh lực", "Bấm đúng lúc để rót linh lực vào phù.", 1, 0.03)];
    const done = sc => {
      if (sc === null) { this.log("Bạn bỏ dở, tờ phù rách nát.", "red"); return "Đã hủy - mất giấy phù."; }
      const s = 0.65 * sc[0] + 0.35 * sc[1], q = TT.qualityOf(s);
      if (q === 0) { this.log(`Vẽ ${name} thất bại, phù cháy rụi.`, "red"); return `Phù lục thất bại!\nPhù văn đứt đoạn (${int(s * 100)}%).`; }
      this.invAdd(name, q);
      const msg = `${name} - ${QN[q]}  (độ hoàn mỹ ${int(s * 100)}%)`;
      this.log("Vẽ thành " + msg, "gold");
      this.refresh(); this.autosave();
      return msg;
    };
    this.openCraft("Vẽ phù: " + name, stages, done);
  };

  G.startForge = function (name) {
    const g = GEAR[name];
    if (this.craftBusy() || this.p.realm < g.realm || this.invN("Quặng Linh Thiết") < g.mat) return;
    this.invTake("Quặng Linh Thiết", g.mat);
    const stages = [
      new FireStage("Nung", "Nung quặng đến độ đỏ rực.", 5, 0.24),
      new TimingStage("Tôi luyện", "Bấm đúng nhịp búa!", 5, 0.02),
      new PathStage("Khắc trận văn", "Kéo bút khắc trận văn lên pháp khí.", "tran")];
    const done = sc => {
      if (sc === null) { this.log("Bạn bỏ dở lò rèn, phôi nguội ngắt.", "red"); return "Đã hủy - mất nguyên liệu."; }
      const s = 0.3 * sc[0] + 0.3 * sc[1] + 0.4 * sc[2], q = TT.qualityOf(s);
      if (q === 0) { this.log(`Rèn ${name} thất bại, phôi nứt vỡ.`, "red"); return `Luyện khí thất bại!\nPhôi nứt vỡ (${int(s * 100)}%).`; }
      const old = this.p.gear[name] || 0;
      let msg;
      if (q > old) {
        this.p.gear[name] = q;
        msg = `${name} - ${QN[q]}  (độ hoàn mỹ ${int(s * 100)}%)\nĐã trang bị: ${TT.itemDesc(name, q)}`;
      } else {
        const v = TT.sellValue(name, q); this.p.stone += v;
        msg = `${name} - ${QN[q]}  (${int(s * 100)}%)\nKhông hơn món đang mang, bán được ${v} linh thạch.`;
      }
      this.p.hp = Math.min(this.p.hp, this.p.max_hp());
      this.log("Rèn thành " + msg.replace("\n", " "), "gold");
      this.scene.fxOnce("break", null, this.scene.gy + 8, 0.4, "s");
      this.refresh(); this.autosave();
      return msg;
    };
    this.openCraft("Luyện khí: " + name, stages, done);
  };
})();
