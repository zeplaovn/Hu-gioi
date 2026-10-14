/* Gameplay Hạ Giới theo địa điểm. Giữ nguyên nhịp balance cũ, chỉ đưa quái/tài nguyên/NPC và hệ số nhỏ về đúng site. */
"use strict";
(function () {
  if (!window.TT?.maps || !TT.Game) return;
  const G = TT.Game.prototype;
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const int = Math.trunc;

  const ctxOf = p => {
    const region = TT.maps.currentRegion(p) || TT.HA_GIOI_REGIONS?.[0];
    const site = TT.maps.currentSite(p) || region?.sites?.[0] || null;
    return {
      region,
      site,
      reward: Number(region?.reward || 1) * Number(site?.reward || 1),
      danger: Math.max(0, Number(region?.danger || 0) + Number(site?.danger || 0) - Number(region?.danger || 0)),
      place: site?.name || region?.name || "Hạ Giới",
    };
  };

  G.fight = function (forcedRegion) {
    const p = this.p, sc = this.scene;
    let x = ctxOf(p);
    if (forcedRegion && forcedRegion.id !== x.region?.id) {
      x = { region: forcedRegion, site: forcedRegion.sites?.[0] || null, reward: forcedRegion.reward || 1, danger: forcedRegion.danger || 0, place: forcedRegion.name };
    }
    const rg = x.region, site = x.site, tier = Math.min(p.realm, TT.MONSTERS.length - 1);
    const pool = site?.monsters?.length ? site.monsters : rg?.monsters?.length ? rg.monsters : TT.MONSTERS[tier];
    const mon = pick(pool), mp = p.level * 3 + rnd(3, 16) + tier * 7 + x.danger * 3;
    let me = p.power() + rnd(0, 10) + p.fbuff; p.fbuff = 0;
    const critical = Math.random() < p.crit(); if (critical) me = Math.round(me * 1.45);
    const win = me >= mp, visualTier = Math.min(4, Math.floor(tier / 2));
    sc?.play("fight", 75, win, visualTier);
    this.log(`Bạn chạm trán ${mon} tại ${x.place} (chiến lực ${mp}) - chiến lực bạn ${me}${critical ? " · CHÍ MẠNG" : ""}.`);
    if (win) {
      const g = int((mp * 1.15 + rnd(2, 8)) * p.exp_mult() * x.reward), s = Math.max(1, int((rnd(2, 10) + p.realm * 3) * x.reward));
      const lost = rnd(0, Math.max(3, 10 + x.danger));
      p.track.kills++; p.hp = Math.max(1, p.hp - lost); p.stone += s;
      setTimeout(() => { if (this.dead) return; p.exp += g; sc?.floatText(`+${g} tu vi`, TT.C.GREEN); sc?.floatText(`+${s} linh thạch`, TT.C.CYAN, 40); this.refresh(); }, 600);
      this.log(`Bạn đánh bại ${mon} tại ${x.place}! Tu vi +${g}, linh thạch +${s}, khí huyết -${lost}.`, "green");
    } else {
      if (Math.random() < p.dodge()) { this.log(`${mon} ra sát chiêu nhưng bạn né được!`, "cyan"); return false; }
      const raw = rnd(18, 38) + Math.max(0, mp - me), mit = p.def() / (p.def() + 110 + tier * 22);
      let d = Math.max(1, int(raw * (1 - mit)));
      if (p.guard > 0) { d = int(d * Math.max(0.15, 1 - 0.30 * p.guard)); p.guard = 0; this.log("Hộ Thân Phù phát sáng, giảm bớt sát thương!", "cyan"); }
      p.hp -= d; this.log(`${mon} mạnh hơn! Bạn bị thương, khí huyết -${d}.`, "red");
      if (p.hp <= 0) { this.dead = true; setTimeout(() => { this.dead = false; this.die(`Bạn bị ${mon} đánh chết tại ${x.place}.`); }, 650); return true; }
    }
    return false;
  };

  G.actExplore = function () {
    const p = this.p, sc = this.scene, x = ctxOf(p), site = x.site;
    const fd = p.stats["Phúc Duyên"], luck = p.stats["Vận Khí"], r = rnd(1, 100) + Math.round(fd * 1.1 + luck * 0.7);
    const resource = pick(site?.resources?.length ? site.resources : ["tài nguyên bản địa"]);
    const npc = pick(site?.npcs?.length ? site.npcs : ["một tu sĩ qua đường"]);
    p.track.explores++; this.cooldown();
    if (r >= 118) {
      const g = int(p.monthGain() * rnd(3, 5) * x.reward);
      this.log(`★ Cơ duyên tại ${x.place}! Bạn phát hiện dấu vết truyền thừa giữa ${resource}.`, "gold");
      sc?.play("explore", 45); setTimeout(() => this.gainFx(g), 500);
    } else if (r >= 86) {
      const s = Math.max(1, int((rnd(5, 20) + p.realm * 10) * x.reward)); p.stone += s;
      sc?.play("explore", 45); sc?.floatText(`+${s} linh thạch`, TT.C.CYAN);
      this.log(`Bạn thu được ${resource} tại ${x.place}: quy đổi +${s} linh thạch.`, "cyan");
    } else if (r >= 54) {
      if (this.fight(x.region)) return;
    } else if (r >= 28) {
      sc?.play("explore", 45);
      if (rnd(1, 20) <= 5 + Math.floor(p.stats["Tướng Mạo"] * 0.8)) {
        const s = Math.max(1, int((rnd(3, 12) + p.realm * 3) * x.reward)); p.stone += s; sc?.floatText(`+${s} linh thạch`, TT.C.CYAN);
        this.log(`${npc} có thiện cảm với bạn tại ${x.place}, tặng ${s} linh thạch.`, "cyan");
      } else this.log(`Bạn gặp ${npc} tại ${x.place}, nhưng đôi bên chỉ lướt qua nhau.`, "dim");
    } else {
      const avoid = Math.min(0.55, 0.08 + luck * 0.018);
      if (Math.random() < avoid) this.log(`Vận khí giúp bạn tránh một hiểm họa ở ${x.place}.`, "cyan");
      else {
        const d = rnd(5, 15) + x.danger * 4; p.hp -= d; sc?.play("explore", 45); sc?.flash("#40ff40", 8); sc?.floatText(`-${d} khí huyết`, TT.C.RED);
        this.log(`Bạn gặp hiểm địa tại ${x.place}, khí huyết -${d}.`, "red");
        if (p.hp <= 0) { this.die(`Bạn bỏ mạng trong hiểm địa ${x.place}.`); return; }
      }
    }
    this.endAction();
  };
})();
