/* Nhân vật + lưu / đọc save (localStorage). */
"use strict";
(function () {
  const SAVE_KEY = "tu_tien_save_v2";
  /** Bộ đếm hoạt động của kiếp này (phục vụ thành tựu). */
  TT.newTrack = () => ({ kills: 0, explores: 0, brk: 0, fails: 0, trib: 0, missions: 0, crafted: 0, herbs: 0, sold: 0,
    enc: 0, encM: 0, runs: 0, clears: 0 });

  class Player {
    /** opts: { name, root } - đạo hiệu và linh căn đã chọn ở màn tạo nhân vật. */
    constructor(gender, age, race, alloc, opts = {}) {
      this.name = TT.cleanName(opts.name) || TT.randName(gender);
      this.root = TT.cleanRoot(opts.root) || TT.rollRoot();
      this.temper = {}; this.ess = {}; this.enc = {};
      this.idle = TT.newIdle(); this.secret = TT.newSecret();
      this.gender = gender; this.age = age; this.race = race;
      const [baseLife, bonus] = TT.RACES[race];
      this.stats = {};
      TT.STATS.forEach(s => { this.stats[s] = Math.max(1, 5 + alloc[s] + (bonus[s] || 0)); });
      this.lifespan = baseLife + rnd(-5, 10);
      this.realm = 0; this.tang = 1; this.exp = 0; this.stone = 15; this.months = 0;
      this.skills = []; this.sect = null; this.pill = 0.0;
      this.inv = {}; this.plots = [null, null, null, null]; this.gear = {};
      this.guard = 0.0; this.fbuff = 0; this.suppress = false;
      this.auto_cfg = TT.defaultAuto();
      this.track = TT.newTrack();
      const M = TT.meta;                       // Thiên Mệnh: quà khởi đầu từ kiếp trước
      if (M) {
        this.stats["Vận Khí"] += M.up.luck;
        this.lifespan += M.up.life * 5;
        this.stone += M.up.stone * 20;
      }
      this.hp = this.max_hp();
    }
    gv(k) {
      let s = 0;
      for (const [n, q] of Object.entries(this.gear)) if (TT.GEAR[n]) s += TT.GEAR[n][k] * TT.QMUL[q];
      return s;
    }
    ensure() {
      this.inv ??= {}; this.plots ??= [null, null, null, null]; this.gear ??= {};
      this.guard ??= 0.0; this.fbuff ??= 0; this.suppress ??= false; this.auto_cfg ??= TT.defaultAuto();
      this.track = Object.assign(TT.newTrack(), this.track);
      // bản idle: save cũ chưa có các trường này
      this.name = TT.cleanName(this.name) || "Đạo Hữu";
      this.root = TT.cleanRoot(this.root) || TT.rollRoot();
      this.temper ??= {}; this.ess ??= {}; this.enc ??= {};
      this.idle = Object.assign(TT.newIdle(), this.idle);
      this.secret = Object.assign(TT.newSecret(), this.secret);
      this.secret.best ??= {}; this.secret.cleared ??= {};
    }
    get level() { return this.realm * 9 + this.tang; }

    /** Các nguồn cộng tốc độ tu luyện: [nhãn, giá trị]. exp_mult = 1 + tổng. */
    expParts() {
      const parts = [["Linh căn", TT.rootInfo(this.root).exp + TT.rootBonus(this, "exp")]];
      const sk = this.skills.reduce((s, k) => s + TT.SKILLS[k].exp, 0);
      if (sk) parts.push(["Công pháp", sk]);
      const gear = this.gv("exp");
      if (gear) parts.push(["Pháp khí", gear]);
      if (this.sect && TT.SECTS[this.sect].exp) parts.push(["Tông môn", TT.SECTS[this.sect].exp]);
      const dt = TT.meta ? TT.meta.bonus("exp") : 0;              // Đạo Tâm (Thiên Mệnh)
      if (dt) parts.push(["Đạo Tâm", dt]);
      return parts;
    }
    exp_mult() { return 1.0 + this.expParts().reduce((s, [, v]) => s + v, 0); }

    max_hp() {
      const base = 80 + this.stats["Căn Cốt"] * 8 + this.realm * 40 +
        this.skills.reduce((s, k) => s + TT.SKILLS[k].hp, 0) + int(this.gv("hp"));
      return Math.round(base * (1 + TT.rootBonus(this, "hp")));
    }
    power() {
      let v = this.level * 3 + this.stats["Căn Cốt"] * 2 + 5 +
        this.skills.reduce((s, k) => s + TT.SKILLS[k].power, 0) + int(this.gv("power"));
      if (this.sect) v += TT.SECTS[this.sect].power;
      return Math.round(v * (1 + TT.rootBonus(this, "atk")));
    }
    /** Phòng ngự: giảm sát thương nhận trong bí cảnh. */
    def() {
      const base = 6 + this.level * 1.1 + this.stats["Căn Cốt"] * 1.5 + this.realm * 4;
      return Math.round(base * (1 + TT.rootBonus(this, "def")));
    }
    crit() { return Math.min(0.6, 0.05 + this.stats["Vận Khí"] * 0.004 + TT.rootBonus(this, "crit")); }
    dodge() { return Math.min(0.4, 0.03 + this.stats["Phúc Duyên"] * 0.003 + TT.rootBonus(this, "dodge")); }
    /** Tỉ lệ khí huyết tự hồi mỗi tháng khi nhập định. */
    regen() { return 0.04 * (1 + TT.rootBonus(this, "regen")); }
    need_exp() { return int(40 * Math.pow(1.28, this.level - 1)); }
    realm_name() { return `${TT.REALMS[this.realm]} tầng ${this.tang}`; }
    static fromDict(d) { const p = Object.assign(Object.create(Player.prototype), d); p.ensure(); return p; }
  }
  TT.Player = Player;

  TT.readSave = () => {
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d && typeof d === "object") return d; } catch (e) { /* bỏ qua */ }
    return { count: 1, player: null };
  };
  TT.writeSave = (count, player) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ count, player: player || null })); } catch (e) { /* bỏ qua */ }
  };
})();
