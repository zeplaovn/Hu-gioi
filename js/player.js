/* Nhân vật + lưu / đọc save (localStorage). */
"use strict";
(function () {
  const SAVE_KEY = "tu_tien_save_v2";
  /** Bộ đếm hoạt động của kiếp này (phục vụ thành tựu). */
  TT.newTrack = () => ({ kills: 0, explores: 0, brk: 0, fails: 0, trib: 0, missions: 0, crafted: 0, herbs: 0, sold: 0 });

  class Player {
    constructor(gender, age, race, alloc) {
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
    }
    get level() { return this.realm * 9 + this.tang; }
    exp_mult() {
      let m = 1.0 + this.skills.reduce((s, k) => s + TT.SKILLS[k].exp, 0) + this.gv("exp");
      if (this.sect) m += TT.SECTS[this.sect].exp;
      if (TT.meta) m += TT.meta.bonus("exp");     // Đạo Tâm (Thiên Mệnh)
      return m;
    }
    max_hp() {
      return 80 + this.stats["Căn Cốt"] * 8 + this.realm * 40 +
        this.skills.reduce((s, k) => s + TT.SKILLS[k].hp, 0) + int(this.gv("hp"));
    }
    power() {
      let v = this.level * 3 + this.stats["Căn Cốt"] * 2 + 5 +
        this.skills.reduce((s, k) => s + TT.SKILLS[k].power, 0) + int(this.gv("power"));
      if (this.sect) v += TT.SECTS[this.sect].power;
      return v;
    }
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
