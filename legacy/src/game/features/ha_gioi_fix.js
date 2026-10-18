/* Hạ Giới rebalance + anti-exploit hardening.
   Loaded after all gameplay/service modules, before bootstrap. Keeps the current architecture stable
   while fixing balance holes and making late Hạ Giới feel distinct. */
"use strict";
(function () {
  if (!window.TT || !TT.Game || !TT.Player) return;
  const G = TT.Game.prototype, P = TT.Player.prototype;
  const nativeNow = Date.now.bind(Date);
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const int = Math.trunc;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ============================ SERVER CLOCK ============================ */
  const clock = TT.serverClock = { anchor: 0, perf: 0, ready: false };
  clock.now = () => clock.ready && typeof performance !== "undefined"
    ? clock.anchor + (performance.now() - clock.perf)
    : nativeNow();
  TT.now = clock.now;

  clock.sync = async () => {
    const cfg = TT.CLOUD || {};
    if (!TT.cloud || !TT.cloud.enabled || !cfg.url || !cfg.anonKey) return false;
    let s = null;
    try { s = JSON.parse(localStorage.getItem("tu_tien_cloud_session")); } catch (e) { /* auth session only */ }
    if (!s || !s.access_token) return false;
    const res = await fetch(String(cfg.url).replace(/\/+$/, "") + "/rest/v1/rpc/game_clock", {
      method: "POST", cache: "no-store",
      headers: { apikey: cfg.anonKey, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return false;
    const v = Number(await res.json());
    if (!Number.isFinite(v) || v < 1e12) return false;
    clock.anchor = v; clock.perf = typeof performance !== "undefined" ? performance.now() : 0; clock.ready = true;
    return true;
  };

  if (TT.cloud && TT.cloud.enabled && TT.cloud.bootstrap) {
    const boot0 = TT.cloud.bootstrap;
    TT.cloud.bootstrap = async function () {
      const r = await boot0.apply(this, arguments);
      if (r && r.state === "ready") { try { await clock.sync(); } catch (e) { /* fallback only */ } }
      return r;
    };
  }

  // Existing modules use Date.now() internally. Run only the time-sensitive synchronous methods
  // against the server-anchored monotonic clock instead of the device wall clock.
  const serverTimed = name => {
    const fn = G[name]; if (typeof fn !== "function") return;
    G[name] = function () {
      const old = Date.now; Date.now = clock.now;
      try { return fn.apply(this, arguments); } finally { Date.now = old; }
    };
  };
  ["idleStart", "idleTick", "idleToggle", "idleRefresh", "secretStart", "secretCheck",
    "missionStart", "missionCheck", "shopBought", "rowsShop", "farmSync", "farmClock", "renderFarm", "farmAct"]
    .forEach(serverTimed);
  if (typeof TT.featuredMission === "function") {
    const featured0 = TT.featuredMission;
    TT.featuredMission = (p, now) => featured0(p, now === undefined ? clock.now() : now);
  }

  /* ============================ RACE BALANCE ============================ */
  Object.assign(TT.RACES, {
    "Nhân": [90, {}],
    "Ma": [90, { "Căn Cốt": 2, "Tướng Mạo": -2 }],
    "Yêu": [115, { "Căn Cốt": 1, "Ngộ Tính": -1 }],
    "Linh": [100, { "Ngộ Tính": 1, "Căn Cốt": -1 }],
    "Tiên Duệ": [135, { "Phúc Duyên": 2, "Vận Khí": 1, "Căn Cốt": -2 }],
    "Thú": [80, { "Căn Cốt": 2, "Ngộ Tính": -2 }],
  });
  TT.RACE_TRAITS = {
    "Nhân": "Thích Nghi: tốc độ tu luyện +8%.",
    "Ma": "Ma Thể: chiến lực +6%.",
    "Yêu": "Yêu Thể: hồi phục khí huyết +25%.",
    "Linh": "Thông Linh: tỉ lệ đột phá +3%.",
    "Tiên Duệ": "Tiên Vận: cơ duyên hiếm dễ xuất hiện hơn.",
    "Thú": "Cường Thể: khí huyết tối đa +12%.",
  };

  const expParts0 = P.expParts;
  P.expParts = function () {
    const x = expParts0.call(this);
    if (this.race === "Nhân") x.push(["Thích Nghi", 0.08]);
    return x;
  };
  const power0 = P.power;
  P.power = function () { return Math.round(power0.call(this) * (this.race === "Ma" ? 1.06 : 1)); };
  const hp0 = P.max_hp;
  P.max_hp = function () { return Math.round(hp0.call(this) * (this.race === "Thú" ? 1.12 : 1)); };
  const regen0 = P.regen;
  P.regen = function () { return regen0.call(this) * (this.race === "Yêu" ? 1.25 : 1); };
  P.dodge = function () { return Math.min(0.42, 0.03 + this.stats["Phúc Duyên"] * 0.005 + TT.rootBonus(this, "dodge")); };

  /* ========================== BREAKTHROUGH FIX ========================== */
  P.breakChance = function (big) {
    const C = TT.PROG.CHANCE, need = this.need_exp();
    let c = C.BASE + this.stats["Ngộ Tính"] * C.NT + this.stats["Vận Khí"] * C.VK - this.realm * C.R
      + Math.min(0.30, Math.max(0, this.pill || 0)) + (big ? C.BIG_PEN : C.MINOR);
    if (this.race === "Linh") c += 0.03;
    // Áp chế vẫn hữu ích nhưng không còn biến 150% tu vi thành +15% miễn phí.
    c += Math.min(0.10, Math.max(0, this.exp / need - 1) * 0.20);
    return clamp(c, C.MIN, Math.min(0.88, C.MAX));
  };
  P.failKeep = function (big) {
    const need = Math.max(1, this.need_exp()), ratio = Math.max(1, this.exp / need);
    const normal = (big ? 0.55 : 0.65) + TT.rootInfo(this.root).keep;
    // Sau một lần thất bại luôn tụt xuống dưới 100% tu vi cần, chặn retry vô hạn từ 150%.
    return Math.min(0.95 / ratio, normal, 0.80);
  };

  const applyItem0 = G.applyItem;
  G.applyItem = function () {
    const out = applyItem0.apply(this, arguments);
    if (this.p) this.p.pill = Math.min(0.30, Math.max(0, this.p.pill || 0));
    return out;
  };

  /* ============================ STAT ROLES ============================== */
  const shopPrice0 = G.shopPrice;
  G.shopPrice = function (name) {
    const raw = shopPrice0.call(this, name), tm = this.p?.stats?.["Tướng Mạo"] || 5;
    const social = Math.min(0.15, Math.max(0, tm - 5) * 0.005);
    return Math.max(1, Math.floor(raw * (1 - social)));
  };

  // Phúc Duyên quyết định chất lượng cơ duyên; Vận Khí thiên về tránh họa/chí mạng/đột phá.
  G.rollEncounter = function () {
    const p = this.p, I = p.idle; if (!I) return;
    if (I.cd > 0) { I.cd--; return; }
    const fd = p.stats["Phúc Duyên"], luck = p.stats["Vận Khí"], tiên = p.race === "Tiên Duệ" ? 3 : 0;
    if (Math.random() > Math.min(0.30, 0.06 + fd * 0.006 + luck * 0.002 + tiên * 0.004)) return;
    const rar = TT.ENC_RARITY, enc = TT.ENC, rareBoost = 1 + Math.min(2.0, (fd + tiên) * 0.035), pool = [];
    for (const key of Object.keys(rar)) {
      const list = enc.filter(e => e.r === key); if (!list.length) continue;
      const rw = rar[key].w * (key === "c" ? 1 : rareBoost);
      for (const e of list) pool.push([e, rw / list.length * (e.neg ? 1 / (1 + luck * 0.06) : 1)]);
    }
    let t = Math.random() * pool.reduce((s, x) => s + x[1], 0), ev = pool[0][0];
    for (const [e, w] of pool) { if ((t -= w) <= 0) { ev = e; break; } }
    I.cd = rnd(3, 6);
    const txt = ev.run(this, p), R = rar[ev.r];
    p.enc[ev.id] = (p.enc[ev.id] || 0) + 1; p.track.enc++; if (ev.r === "m") p.track.encM++;
    if (this.quiet) { if (this.rep) this.rep.events.push({ r: ev.r, name: ev.name, txt }); return; }
    this.log(`✦ Kỳ ngộ [${R.name}] ${ev.name}: ${txt}`, R.tag);
    const sc = this.scene;
    if (sc) { sc.floatText("✦ " + ev.name, R.color); sc.addRing(R.color); sc.flash(R.color, ev.r === "c" ? 4 : 10); if (ev.r === "e" || ev.r === "m") sc.burst(sc.cx, sc.gy - 60, R.color, 28); }
  };

  /* =========================== CREATION REROLL ========================== */
  TT.CREATE_REROLLS = 5;
  const showCreate0 = G.showCreate, roll0 = G.roll;
  G.showCreate = function () {
    this._originRerolls = TT.CREATE_REROLLS;
    const r = showCreate0.apply(this, arguments);
    if (this.hint) this.hint.textContent = `Thiên mệnh ban ${this._originRerolls} lần gieo lại cho Tuổi / Chủng Tộc / Linh căn. Đạo hiệu gieo tự do.`;
    return r;
  };
  G.roll = function (kind) {
    if (kind !== "name") {
      this._originRerolls ??= TT.CREATE_REROLLS;
      if (this._originRerolls <= 0) {
        if (this.hint) this.hint.textContent = "Đã dùng hết lượt gieo thiên mệnh cho kiếp này.";
        return;
      }
      this._originRerolls--;
    }
    const r = roll0.apply(this, arguments);
    if (kind !== "name" && this.hint) this.hint.textContent = `Còn ${this._originRerolls} lượt gieo Tuổi / Chủng Tộc / Linh căn.`;
    return r;
  };
  const refreshBasic0 = G.refreshBasic;
  G.refreshBasic = function () {
    const r = refreshBasic0.apply(this, arguments);
    const trait = TT.RACE_TRAITS[this.race];
    if (trait && this.raceInfo) this.raceInfo.textContent += ` ${trait}`;
    return r;
  };

  /* ========================== LATE HẠ GIỚI ============================= */
  Object.assign(TT.SKILLS, {
    "Nguyên Thần Quyết": { cost: 1200, realm: 4, exp: 0.16, power: 20, hp: 100, desc: "Nguyên Anh: tu luyện +16%, chiến lực +20, khí huyết +100." },
    "Hóa Thần Thiên Chương": { cost: 2600, realm: 5, exp: 0.18, power: 42, hp: 80, desc: "Hóa Thần: tu luyện +18%, chiến lực +42, khí huyết +80." },
    "Hư Không Đạo Điển": { cost: 4600, realm: 6, exp: 0.15, power: 48, hp: 120, desc: "Luyện Hư: tu luyện +15%, chiến lực +48, khí huyết +120." },
    "Đại Thừa Chân Kinh": { cost: 7600, realm: 7, exp: 0.14, power: 65, hp: 160, desc: "Đại Thừa: tu luyện +14%, chiến lực +65, khí huyết +160." },
    "Cửu Kiếp Bất Diệt Kinh": { cost: 12000, realm: 8, exp: 0.10, power: 85, hp: 220, desc: "Độ Kiếp: tu luyện +10%, chiến lực +85, khí huyết +220." },
  });
  Object.assign(TT.GEAR, {
    "Nguyên Anh Pháp Ấn": { mat: 5, realm: 4, power: 18, hp: 70, exp: 0.03, desc: v => `Uy năng tổng hợp +${v}` },
    "Hóa Thần Đạo Bào": { mat: 6, realm: 5, power: 0, hp: 130, exp: 0.04, desc: v => `Khí huyết / tu luyện cường hóa ${v}` },
    "Hư Không Giới": { mat: 7, realm: 6, power: 28, hp: 0, exp: 0.06, desc: v => `Hư không gia trì +${v}` },
    "Đại Thừa Tiên Kiếm": { mat: 9, realm: 7, power: 55, hp: 80, exp: 0.03, desc: v => `Đại Thừa uy năng +${v}` },
    "Độ Kiếp Lôi Giáp": { mat: 12, realm: 8, power: 35, hp: 220, exp: 0.04, desc: v => `Lôi kiếp hộ thể +${v}` },
  });
  Object.assign(TT.SELL_BASE, {
    "Nguyên Anh Pháp Ấn": 240, "Hóa Thần Đạo Bào": 420, "Hư Không Giới": 680,
    "Đại Thừa Tiên Kiếm": 1100, "Độ Kiếp Lôi Giáp": 1800,
  });
  TT.MONSTERS.splice(0, TT.MONSTERS.length,
    ["Hắc Lang", "Độc Xà", "Hoang Thử Yêu"],
    ["Thiết Giáp Hùng", "Huyết Điêu", "Kiếm Xỉ Hổ"],
    ["Ma Hầu", "Thanh Giao", "Hỏa Lân Thú"],
    ["Cửu Vĩ Hồ", "Kim Dực Bằng", "Huyền Quy"],
    ["Thôn Thiên Mãng", "Long Tử", "Phượng Hoàng Ảnh"],
    ["Hư Không Ma Ảnh", "Lôi Giao", "Vạn Niên Cổ Thi"],
    ["Thái Hư Cổ Thú", "Hư Không Liệt Ma", "Kim Sí Thiên Bằng"],
    ["Hoang Cổ Chân Long Ảnh", "Đại Thừa Khôi Lỗi", "Vô Tướng Ma Quân"],
    ["Cửu Tiêu Lôi Linh", "Thiên Môn Thủ Vệ", "Kiếp Hải Ma Thần"]);
  if (TT.SECRETS && !TT.SECRETS.some(x => x.id === "kiephai")) {
    TT.SECRETS.push({ id: "kiephai", name: "Thiên Môn Kiếp Hải", el: "Vô", realm: 8, floors: 10, dur: 300, pw: 235, xp: 4.2,
      desc: "Biển lôi ngoài Thiên Môn, nơi tu sĩ Độ Kiếp mài giũa thân tâm trước khi phi thăng." });
  }

  TT.HA_GIOI_REGIONS = [
    { id: "pham", name: "Phàm Nhân Thành", realm: 0, reward: 1.00, danger: 0, desc: "Thành trấn và núi rừng quanh nơi nhập đạo." },
    { id: "thanhvan", name: "Thanh Vân Sơn", realm: 1, reward: 1.08, danger: 1, desc: "Linh mạch sơ khai, yêu thú Luyện Khí thường lui tới." },
    { id: "vanyeu", name: "Vạn Yêu Lâm", realm: 2, reward: 1.16, danger: 2, desc: "Rừng yêu khí dày đặc, tài nguyên Trúc Cơ phong phú." },
    { id: "hacphong", name: "Hắc Phong Cốc", realm: 3, reward: 1.25, danger: 3, desc: "Kim Đan tu sĩ tranh đoạt di tích trong cốc sâu." },
    { id: "thienha", name: "Thiên Hà Hải", realm: 4, reward: 1.35, danger: 4, desc: "Hải vực Nguyên Anh, linh triều và hải thú cùng tồn tại." },
    { id: "hoangco", name: "Hoang Cổ Chi Địa", realm: 5, reward: 1.46, danger: 5, desc: "Di tích Hóa Thần, cổ thi và dị tượng không ngừng xuất hiện." },
    { id: "hukhong", name: "Hư Không Liệt Cốc", realm: 6, reward: 1.58, danger: 6, desc: "Không gian rạn vỡ, chỉ Luyện Hư mới đủ sức đặt chân." },
    { id: "dangthien", name: "Đăng Thiên Cổ Lộ", realm: 7, reward: 1.72, danger: 7, desc: "Con đường Đại Thừa hướng tới Thiên Môn." },
    { id: "thienmon", name: "Thiên Môn Sơn", realm: 8, reward: 1.88, danger: 8, desc: "Đỉnh Hạ Giới, nơi lôi kiếp và khí tức phi thăng giao nhau." },
  ];
  const regionOf = p => {
    const allowed = TT.HA_GIOI_REGIONS.filter(x => p.realm >= x.realm);
    return allowed.find(x => x.id === p.region) || allowed[allowed.length - 1] || TT.HA_GIOI_REGIONS[0];
  };
  G.openWorldMap = function () {
    this.openDialog("Hạ Giới Địa Đồ", () => TT.HA_GIOI_REGIONS.map(r => ({
      name: (this.p.region === r.id ? "● " : "") + r.name,
      icon: TT.iconFor("Bí cảnh", 40), desc: r.desc,
      price: this.p.realm >= r.realm ? `Lịch luyện: thưởng x${r.reward.toFixed(2)} · nguy hiểm ${r.danger}` : `Mở khi đạt ${TT.REALMS[r.realm]}`,
      btn: this.p.region === r.id ? "Đang ở" : "Đi tới",
      cb: () => { if (this.p.realm >= r.realm) { this.p.region = r.id; this.log(`Bạn tới ${r.name}.`, "cyan"); this.autosave(); this.renderDialog(); } },
      ok: this.p.realm >= r.realm && this.p.region !== r.id,
    })));
  };

  const showGame0 = G.showGame;
  G.showGame = function () {
    const r = showGame0.apply(this, arguments);
    const right = document.querySelector(".col-right");
    if (right && !right.querySelector(".world-map-btn")) {
      const b = TT.ui.btn("Hạ Giới Địa Đồ", () => this.openWorldMap(), { cls: "cyan act", icon: TT.A.icon("scroll", 22) });
      b.classList.add("world-map-btn");
      const save = [...right.querySelectorAll("button")].find(x => x.textContent.includes("Lưu game"));
      right.insertBefore(b, save || right.firstChild);
    }
    return r;
  };

  G.fight = function (region) {
    const p = this.p, sc = this.scene, rg = region || regionOf(p), tier = Math.min(p.realm, TT.MONSTERS.length - 1);
    const mon = pick(TT.MONSTERS[tier]), mp = p.level * 3 + rnd(3, 16) + tier * 7 + rg.danger * 3;
    let me = p.power() + rnd(0, 10) + p.fbuff; p.fbuff = 0;
    const critical = Math.random() < p.crit(); if (critical) me = Math.round(me * 1.45);
    const win = me >= mp, visualTier = Math.min(4, Math.floor(tier / 2));
    sc.play("fight", 75, win, visualTier);
    this.log(`Bạn chạm trán ${mon} tại ${rg.name} (chiến lực ${mp}) - chiến lực bạn ${me}${critical ? " · CHÍ MẠNG" : ""}.`);
    if (win) {
      const g = int((mp * 1.15 + rnd(2, 8)) * p.exp_mult() * rg.reward), s = Math.max(1, int((rnd(2, 10) + p.realm * 3) * rg.reward));
      const lost = rnd(0, Math.max(3, 10 + rg.danger));
      p.track.kills++; p.hp = Math.max(1, p.hp - lost); p.stone += s;
      setTimeout(() => { if (this.dead) return; p.exp += g; sc.floatText(`+${g} tu vi`, TT.C.GREEN); sc.floatText(`+${s} linh thạch`, TT.C.CYAN, 40); this.refresh(); }, 600);
      this.log(`Bạn đánh bại ${mon}! Tu vi +${g}, linh thạch +${s}, khí huyết -${lost}.`, "green");
    } else {
      if (Math.random() < p.dodge()) { this.log(`${mon} ra sát chiêu nhưng bạn né được!`, "cyan"); return false; }
      const raw = rnd(18, 38) + Math.max(0, mp - me), mit = p.def() / (p.def() + 110 + tier * 22);
      let d = Math.max(1, int(raw * (1 - mit)));
      if (p.guard > 0) { d = int(d * Math.max(0.15, 1 - 0.30 * p.guard)); p.guard = 0; this.log("Hộ Thân Phù phát sáng, giảm bớt sát thương!", "cyan"); }
      p.hp -= d; this.log(`${mon} mạnh hơn! Bạn bị thương, khí huyết -${d}.`, "red");
      if (p.hp <= 0) { this.dead = true; setTimeout(() => { if (this.p !== p) return; this.dead = false; this.die(`Bạn bị ${mon} đánh chết tại ${rg.name}.`); }, 650); return true; }   // đã Trùng sinh trong lúc diễn hoạt cảnh thì không gọi die() lên nhân vật không còn tồn tại
    }
    return false;
  };

  G.actExplore = function () {
    const p = this.p, sc = this.scene, rg = regionOf(p);
    const fd = p.stats["Phúc Duyên"], luck = p.stats["Vận Khí"], r = rnd(1, 100) + Math.round(fd * 1.1 + luck * 0.7);
    p.track.explores++; this.cooldown();
    if (r >= 118) {
      const g = int(p.monthGain() * rnd(3, 5) * rg.reward); this.log(`★ Cơ duyên tại ${rg.name}! Bạn phát hiện một dấu vết truyền thừa.`, "gold");
      sc.play("explore", 45); setTimeout(() => this.gainFx(g), 500);
    } else if (r >= 86) {
      const s = Math.max(1, int((rnd(5, 20) + p.realm * 10) * rg.reward)); p.stone += s; sc.play("explore", 45); sc.floatText(`+${s} linh thạch`, TT.C.CYAN);
      this.log(`Bạn tìm được tài nguyên ở ${rg.name}: +${s} linh thạch.`, "cyan");
    } else if (r >= 54) {
      if (this.fight(rg)) return;
    } else if (r >= 28) {
      sc.play("explore", 45);
      if (rnd(1, 20) <= 5 + Math.floor(p.stats["Tướng Mạo"] * 0.8)) {
        const s = Math.max(1, int((rnd(3, 12) + p.realm * 3) * rg.reward)); p.stone += s; sc.floatText(`+${s} linh thạch`, TT.C.CYAN);
        this.log(`Một tu sĩ tại ${rg.name} có thiện cảm với bạn, tặng ${s} linh thạch.`, "cyan");
      } else this.log(`Bạn dò đường ở ${rg.name} nhưng không thu được gì đáng kể.`, "dim");
    } else {
      const avoid = Math.min(0.55, 0.08 + luck * 0.018);
      if (Math.random() < avoid) this.log(`Vận khí giúp bạn tránh một hiểm họa ở ${rg.name}.`, "cyan");
      else {
        const d = rnd(5, 15) + rg.danger * 4; p.hp -= d; sc.play("explore", 45); sc.flash("#40ff40", 8); sc.floatText(`-${d} khí huyết`, TT.C.RED);
        this.log(`Bạn gặp hiểm địa tại ${rg.name}, khí huyết -${d}.`, "red");
        if (p.hp <= 0) { this.die(`Bạn bỏ mạng trong hiểm địa ${rg.name}.`); return; }
      }
    }
    // Lịch luyện là hành động trong cùng khoảng thời gian thật; không cộng thêm tháng game ngoài idle tick.
    this.endAction();
  };
  G.actRest = function () {
    const p = this.p, heal = int(p.max_hp() * 0.5); p.hp = Math.min(p.max_hp(), p.hp + heal);
    this.scene.play("rest", 55); this.scene.floatText(`+${heal} khí huyết`, "#6dff9a"); this.log(`Bạn nghỉ ngơi dưỡng thương. Khí huyết +${heal}`);
    this.cooldown(); this.endAction();
  };

  /* ======================= CRITICAL-SAVE BARRIER ======================== */
  G.syncCritical = function () {
    this.autosave?.();
    if (TT.cloud && TT.cloud.enabled && TT.cloud.syncNow) {
      Promise.resolve(TT.cloud.syncNow()).catch(() => {});
    }
  };
  const criticalAfter = name => {
    const fn = G[name]; if (typeof fn !== "function") return;
    G[name] = function () { const r = fn.apply(this, arguments); this.syncCritical(); return r; };
  };
  ["finishBreak", "die", "winGame", "reincarnate", "buy", "learn", "useItem", "sellItem",
    "farmAct", "secretStart", "secretAbort", "secretResolve", "missionStart", "missionResolve",
    "sectEnter", "sectExit", "startAlchemy", "startTalisman", "startForge"].forEach(criticalAfter);
})();
