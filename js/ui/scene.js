/* Cảnh hoạt họa (canvas): nền parallax, nhân vật, yêu thú, hiệu ứng. */
"use strict";
(function () {
  const { A, mix, C, FONT } = TT;
  const SKY = C.SKY;
  const STEP = 1000 / 30;

  /* ---- Hạt theo mùa (sprite assets/seasons/{mùa}_{biến thể}.png) ----
     rate: xác suất sinh hạt mỗi tick · wind: hệ số gió · vy: tốc độ rơi · vr: tốc độ xoay [min,max]
     sa: biên độ lắc ngang · flip: lật khi rơi (lá/cánh hoa) · sm: hệ số kích thước · spr: [biến thể, trọng số]
     Hạ: biến thể 0,1 là đom đóm (phát sáng, bay lơ lửng); biến thể 2 là lá xanh rơi. */
  const SEASON = [
    { rate: 0.10, wind: 0.8, vy: 0.75, vr: [0.015, 0.05], sa: [0.4, 1.2], flip: true, sm: 1.0, spr: [[0, 0.40], [1, 0.35], [2, 0.25]] },
    { rate: 0.06, wind: 0.3, vy: 0.8, vr: [0.015, 0.04], sa: [0.4, 1.0], flip: true, sm: 1.0, spr: [[0, 0.40], [1, 0.40], [2, 0.20]] },
    { rate: 0.10, wind: 1.2, vy: 0.95, vr: [0.02, 0.07], sa: [0.4, 1.2], flip: true, sm: 0.9, spr: [[0, 0.34], [1, 0.33], [2, 0.33]] },
    { rate: 0.20, wind: 1.5, vy: 1.0, vr: [0.006, 0.02], sa: [0.2, 0.6], flip: false, sm: 0.75, spr: [[0, 0.15], [1, 0.30], [2, 0.55]] },
  ];
  const LAYERS = [                       // xa → gần: nhỏ, mờ, chậm → lớn, rõ, nhanh
    { d: 0.45, sc: 0.30, a: 0.55, w: 0.35 },
    { d: 0.75, sc: 0.42, a: 0.80, w: 0.40 },
    { d: 1.00, sc: 0.60, a: 1.00, w: 0.25 },
  ];
  /* ---- Nền parallax 4 mùa: assets/bg/{far|mid|fore}_{0..3}.png (xa: núi + trời, giữa: đảo nổi, gần: vườn đá)
     k: hệ số cuộn theo tốc độ đi · dr: trôi nhẹ mỗi tick (mây, đảo) khi đứng yên · sc: tỉ lệ ảnh · by: cách đáy khung (px) · bob: biên độ nhấp nhô */
  const BG_LAYERS = [
    { n: "far",  k: 0.06, dr: 0.035, sc: 1.18, by: 44, bob: 1.2 },
    { n: "mid",  k: 0.22, dr: 0.090, sc: 1.10, by: 24, bob: 2.0 },
    { n: "fore", k: 1.00, dr: 0,     sc: 1.00, by: 0,  bob: 0 },
  ];
  const BG_SKY = [                       // [đỉnh, chân] gradient trời theo mùa (Xuân, Hạ, Thu, Đông)
    ["#a9d4f5", "#f6e6f0"], ["#1b8fda", "#8fd0ee"], ["#99737f", "#f2a65a"], ["#032f70", "#1d518e"],
  ];
  const FALLBACK_COL = ["#ffb3d1", "#e6ff6a", "#e0782a", "#ffffff"];   // dùng khi chưa có file ảnh
  const pickW = arr => { let x = Math.random(), t = 0; for (const [v, w] of arr) { t += w; if (x < t) return v; } return arr[arr.length - 1][0]; };
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  class Scene {
    constructor(w, h, colorFn, cxRatio = 0.5, kind = "game") {
      this.kind = kind;                     // "game" = cảnh chơi, "title" = bìa màn tạo nhân vật
      this.w = w; this.h = h;
      this.cv = document.createElement("canvas");
      this.cv.width = w; this.cv.height = h;
      this.cv.className = "scene-cv";
      this.ctx = this.cv.getContext("2d");
      this.colorFn = colorFn;
      this.cx = Math.floor(w * cxRatio);
      this.gy = Math.floor(h * (kind === "title" ? 0.82 : 0.87));   // cảnh chơi: chân đứng trên mặt đất của lớp gần
      this.t = 0; this.mode = "idle"; this.mt = 0; this.mdur = 0; this.win = true;
      this.parts = []; this.floats = []; this.rings = []; this.fx = [];
      this.shake = 0;
      this.flashC = null; this.flashT = 0; this.flashMax = 1;
      this.scroll = 0; this.speed = 0.2; this.season = 0; this.prevSeason = 0; this.sb = 1; this.mon = null;
      this.wind = 0; this.spN = 0;
      this.us = Math.max(0.7, Math.min(1.3, h / 340));                       // co kích thước hạt theo cỡ cảnh
      this.reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.maxSp = (w < 520 ? 22 : 38) * (this.reduced ? 0.4 : 1);           // giới hạn số hạt (nhẹ máy / điện thoại)
      this.R = Math.min(w, h * 1.7) * 0.16;
      this.alive = true; this.acc = 0; this.last = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    destroy() { this.alive = false; }

    // ---- API
    play(mode, frames = 60, win = true, tier = 0) {
      this.mode = mode; this.mt = 0; this.mdur = frames; this.win = win;
      if (mode === "fight") this.mon = { x: this.w + 70, col: pick(TT.MON_COLORS), k: Math.min(tier, 4) };
      if (mode === "break") this.addRing("#ffe27a");
    }
    setDead() { this.mode = "dead"; this.mon = null; }
    setSeason(s) {
      s = ((s % 4) + 4) % 4;
      if (s === this.season) return;
      this.prevSeason = this.season; this.season = s;
      this.sb = this.t > 5 ? 0 : 1;                                   // chuyển mùa: hoà dần nền cũ → nền mới (~1.5 giây)
    }
    floatText(text, col = C.GREEN, dx = 0) {
      this.floats.push({ x: this.cx + dx + rnd(-20, 20), y: this.gy - 130, text, col, life: 55, max: 55 });
    }
    flash(col, frames = 10) { this.flashC = col; this.flashT = frames; this.flashMax = frames; }
    addRing(col) { this.rings.push({ r: 10, col, life: 28, max: 28 }); }
    burst(x, y, col, n = 18) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, s = uni(2, 7);
        this.parts.push({ k: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
          life: rnd(18, 32), max: 32, col, size: pick([2, 3, 4]), ph: 0 });
      }
    }
    fxOnce(name, x = null, y = null, spd = 0.5, anchor = "center") {
      this.fx.push({ n: name, x: x ?? this.cx, y: y ?? (this.gy - 45), t: 0.0, spd, a: anchor });
    }

    // ---- vẽ ảnh
    img(im, x, y, anchor = "center") {
      if (!A.ok(im)) return;
      const w = im.naturalWidth, h = im.naturalHeight, c = this.ctx;
      if (anchor === "s") c.drawImage(im, Math.round(x - w / 2), Math.round(y - h));
      else if (anchor === "nw") c.drawImage(im, Math.round(x), Math.round(y));
      else c.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2));
    }
    ellipse(cx, cy, rx, ry, stroke, lw) {
      const c = this.ctx;
      c.beginPath(); c.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
      c.strokeStyle = stroke; c.lineWidth = lw; c.stroke();
    }

    // ---- hạt
    spawn(mode) {
      const t = this.t, w = this.w, r = Math.random;
      this.spawnSeason();                     // hoa rơi / đom đóm / lá rơi / tuyết theo mùa
      const orbit = (d, size) => {
        const a = r() * 6.28;
        this.parts.push({ k: "qi", x: this.cx + Math.cos(a) * d, y: this.gy - 45 + Math.sin(a) * d * 0.7, vx: 0, vy: 0, life: 80, max: 80, col: this.colorFn(), size, ph: 0 });
      };
      if (mode === "train" && r() < 0.75) orbit(this.R * 2.2, 3);
      else if (mode === "idle" && r() < 0.06) orbit(this.R * 1.6, 2);
      else if (mode === "explore" && t % 5 === 0)
        this.parts.push({ k: "dust", x: this.cx - 10, y: this.gy - 2, vx: -2, vy: -0.5, life: 18, max: 18, col: "#7d8a7a", size: 3, ph: 0 });
      else if (mode === "rest" && t % 4 === 0)
        this.parts.push({ k: "heal", x: this.cx + rnd(-40, 40), y: this.gy - 30, vx: 0, vy: -1.1, life: 40, max: 40, col: "#6dff9a", size: 0, ph: 0 });
      if (mode === "rest" && t % 26 === 0)
        this.floats.push({ x: this.cx + 30, y: this.gy - 110, text: "Zz", col: C.CYAN, life: 50, max: 50 });
    }

    spawnSeason() {
      if (this.spN >= this.maxSp) return;
      const S = SEASON[this.season], r = Math.random;
      if (r() > S.rate * (this.reduced ? 0.5 : 1)) return;
      const v = pickW(S.spr);
      let x = r() * LAYERS[0].w, L = LAYERS[2];
      for (const l of LAYERS) { x -= l.w; if (x <= 0) { L = l; break; } }
      const glow = this.season === 1 && v < 2;
      const p = { k: "sp", s: this.season, v, im: A.season(this.season, v), d: L.d, a: L.a, sc: L.sc * S.sm,
        ph: r() * 6.28, age: 0, glow, life: 1500, gnd: this.gy + 6 - (1 - L.d) * 50, rot: 0, vr: 0, vy: 0, sf: 0, sa: 0, ff: 0, flip: false,
        x: 0, y: 0 };
      if (glow) {                                                       // đom đóm: lơ lửng rồi tắt dần
        p.x = r() * this.w; p.y = this.gy - 20 - r() * this.h * 0.45;
        p.life = rnd(200, 340); p.gnd = this.h + 50;
      } else {                                                          // rơi từ ngoài khung hình
        p.x = r() * (this.w + 80) - 40; p.y = -30;
        p.vy = S.vy * (0.6 + 0.6 * L.d) * (0.8 + 0.4 * r());
        p.rot = r() * 6.28; p.vr = (r() < 0.5 ? -1 : 1) * uni(S.vr[0], S.vr[1]);
        p.sf = uni(0.03, 0.07); p.sa = uni(S.sa[0], S.sa[1]);
        p.flip = S.flip; p.ff = uni(0.04, 0.09);
      }
      this.parts.push(p);
    }

    /** Vẽ hạt mùa bằng sprite. behind = true: lớp xa/giữa (sau nhân vật); false: lớp gần (trước nhân vật). */
    drawSeason(behind) {
      const c = this.ctx, t = this.t;
      c.imageSmoothingEnabled = true;                                   // làm mịn khi xoay / thu nhỏ
      for (const p of this.parts) {
        if (p.k !== "sp" || (p.d < 0.9) !== behind) continue;
        let env = Math.min(1, p.age / 30);                              // hiện dần
        if (p.glow) env = Math.min(env, p.life / 40) * (0.55 + 0.45 * Math.sin(t * 0.08 + p.ph));   // nhấp nháy + tắt dần
        else env *= clamp01((p.gnd - p.y) / 28);                        // mờ dần khi chạm đất
        const al = p.a * env;
        if (al < 0.02) continue;
        const im = p.im, sc = p.sc * this.us;
        if (A.ok(im)) {
          c.save();
          c.globalAlpha = al;
          c.translate(Math.round(p.x), Math.round(p.y));
          if (p.rot) c.rotate(p.rot);
          c.scale(sc * (p.flip ? Math.max(0.28, Math.abs(Math.cos(t * p.ff + p.ph))) : 1), sc);
          if (p.glow) c.globalCompositeOperation = "lighter";
          c.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
          c.restore();
        } else {                                                        // chưa có ảnh → chấm tròn như bản cũ
          c.globalAlpha = al; c.fillStyle = FALLBACK_COL[p.s];
          c.beginPath(); c.arc(p.x, p.y, 2 + p.d, 0, 6.2832); c.fill(); c.globalAlpha = 1;
        }
      }
      c.imageSmoothingEnabled = false;
    }

    /** Vẽ nền parallax của một mùa với độ mờ alpha. */
    drawSeasonBg(season, alpha) {
      const c = this.ctx, t = this.t, h = this.h;
      c.save();
      c.globalAlpha = alpha;
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
      const g = c.createLinearGradient(0, 0, 0, h * 0.8);
      g.addColorStop(0, BG_SKY[season][0]); g.addColorStop(0.22, BG_SKY[season][0]); g.addColorStop(1, BG_SKY[season][1]);
      c.fillStyle = g; c.fillRect(0, 0, this.w, h);
      for (const L of BG_LAYERS) {
        const im = A.img(`bg/${L.n}_${season}.png`);
        if (!A.ok(im)) continue;
        const W = im.naturalWidth * L.sc, H = im.naturalHeight * L.sc;
        const off = (((this.scroll * L.k + t * L.dr) % W) + W) % W;      // cuộn theo nhân vật + trôi nhẹ theo thời gian
        const y = Math.round(h - L.by - H + (L.bob ? Math.sin(t * 0.012 + L.k * 9) * L.bob : 0));
        // Giữ tọa độ và kích thước nhất quán ở sub-pixel; floor/ceil + cộng 1px
        // khiến mép tile thay đổi theo từng frame, tạo cảm giác nền bị rung.
        for (let x = -off; x < this.w; x += W) c.drawImage(im, x, y, W, H);
      }
      c.restore();
      c.imageSmoothingEnabled = false;
    }

    // ---- sprite nhân vật / yêu thú
    person(cx, gy, pose, t) {
      if (this.shake > 0) { cx += rnd(-4, 4); gy += rnd(-3, 3); }
      const mt = this.mt;
      let fr, i;
      if (pose === "dead") { fr = A.hero("dead"); i = 0; }
      else if (pose === "walk") { fr = A.hero("walk"); i = Math.floor(t / 4) % fr.length; }
      else if (pose === "fight") {
        if (!this.win && mt >= 28) { fr = A.hero("hurt"); i = Math.floor(t / 6) % fr.length; }
        else {
          fr = A.hero("atk");
          i = mt < 22 ? 0 : (mt <= 34 ? Math.min(fr.length - 1, 1 + Math.trunc((mt - 22) / 12 * (fr.length - 1))) : 0);
        }
      } else { fr = A.hero("sit"); i = Math.floor(t / 12) % fr.length; }
      this.img(fr[i % fr.length], cx, gy + 3, "s");
    }

    monSprite() {
      const m = this.mon, mt = this.mt, k = m.k;
      let fr, i;
      if (this.win && mt >= 44) { fr = A.mon(k, "die"); i = Math.min(fr.length - 1, Math.floor((mt - 44) / 7)); }
      else if (!this.win && mt >= 16 && mt <= 46) { fr = A.mon(k, "atk"); i = Math.min(fr.length - 1, Math.floor((mt - 16) / 4)); }
      else { fr = A.mon(k, "idle"); i = Math.floor(this.t / 8) % fr.length; }
      this.img(fr[i], m.x, this.gy + 3, "s");
    }

    // ---- vòng lặp
    loop(now) {
      if (!this.alive) return;
      if (!this.cv.isConnected) { this.last = now; requestAnimationFrame(this.loop); return; }
      this.acc += Math.min(now - this.last, 200);
      this.last = now;
      let n = 0;
      while (this.acc >= STEP && n < 3) { this.acc -= STEP; n++; this.tick(); }
      if (this.acc > STEP * 3) this.acc = 0;
      requestAnimationFrame(this.loop);
    }

    tick() {
      const c = this.ctx, t = ++this.t;
      let mode = this.mode;
      c.clearRect(0, 0, this.w, this.h);
      c.imageSmoothingEnabled = false;

      if (mode !== "idle" && mode !== "dead") {
        this.mt++;
        if (this.mt >= this.mdur) { this.mode = "idle"; this.mt = 0; this.mon = null; mode = "idle"; }
      }
      this.speed += ((mode === "explore" ? 4.0 : 0.15) - this.speed) * 0.1;
      this.scroll += this.speed;
      if (this.shake > 0) this.shake--;

      // nền
      if (this.kind === "title") {
        this.img(A.img("bg/title.png"), 0, 0, "nw");
      } else {
        c.fillStyle = "#0a0f1e"; c.fillRect(0, 0, this.w, this.h);
        if (this.sb < 1) { this.sb = Math.min(1, this.sb + 1 / 45); this.drawSeasonBg(this.prevSeason, 1); }
        this.drawSeasonBg(this.season, this.sb);
      }

      // logic chế độ
      if (mode === "fight" && this.mon) {
        const m = this.mon, tx = this.cx + this.w * 0.28;
        m.x += (tx - m.x) * 0.18;
        if (this.mt === 28) {
          this.burst(m.x - 20, this.gy - 55, "#fff2a8", 16);
          if (this.win) { this.fxOnce("hit", m.x - 10, this.gy - 55, 0.5); this.flash("#ffffff", 4); }
          else {
            this.fxOnce("hit", this.cx, this.gy - 60, 0.5);
            this.shake = 10; this.flash("#ff3030", 10);
            this.floats.push({ x: this.cx, y: this.gy - 120, text: "BỊ THƯƠNG!", col: C.RED, life: 50, max: 50 });
          }
        }
        if (this.mt === 44 && this.win) {
          this.burst(m.x, this.gy - 45, m.col, 30);
          this.fxOnce("hit", m.x, this.gy - 45, 0.4);
        }
      }
      if (mode === "break") {
        if (t % 9 === 0) { this.fxOnce("bolt", this.cx + rnd(-110, 110), this.gy - 4, 0.6, "s"); this.shake = 3; }
        if (this.mt % 20 === 0) this.addRing("#9fd0ff");
      }

      const wt = (0.25 + 0.55 * Math.sin(t * 0.0035) + 0.25 * Math.sin(t * 0.011 + 1)) * SEASON[this.season].wind + (mode === "break" ? 3 : 0);
      this.wind += (wt - this.wind) * 0.04;                             // gió đổi hướng từ từ; đột phá thì cuốn mạnh

      this.spawn(mode);

      // cập nhật hạt
      const alive = []; let spN = 0;
      for (const p of this.parts) {
        if (p.k === "qi") {
          const dx = this.cx - p.x, dy = (this.gy - 45) - p.y, d = Math.hypot(dx, dy) + 0.01;
          const sp = 2.0 + Math.max(0.0, 1 - d / (this.R * 2.2)) * 5;
          p.x += dx / d * sp; p.y += dy / d * sp;
          if (d < 14) p.life = 0;
        } else if (p.k === "sp") {
          p.age++;
          const wd = this.wind * p.d, par = this.speed * 0.5 * p.d;     // gió + trôi ngược khi đang đi (parallax)
          if (p.glow) {
            p.x += Math.sin(t * 0.021 + p.ph) * 0.45 + wd * 0.3 - par;
            p.y += Math.cos(t * 0.017 + p.ph * 1.7) * 0.35;
            if (p.s !== this.season) p.life -= 3;                       // đom đóm mùa cũ tắt nhanh khi chuyển mùa
          } else {
            p.x += wd + Math.sin(t * p.sf + p.ph) * p.sa - par;
            p.y += p.vy;
            p.rot += p.vr * (1 + Math.abs(wd) * 0.3);
          }
        } else {
          p.x += p.vx; p.y += p.vy;
          if (p.k === "spark") p.vy += 0.15;
        }
        p.life--;
        const inside = p.k === "sp" ? (p.y < p.gnd && p.x > -80 && p.x < this.w + 80)
          : (p.y < this.h && p.x > -20 && p.x < this.w + 20);
        if (p.life > 0 && inside) { alive.push(p); if (p.k === "sp") spN++; }
      }
      this.spN = spN;
      this.parts = alive;

      // aura
      const col = this.colorFn(), R = this.R, cx = this.cx, cy = this.gy - 45;
      if (mode === "train") {
        for (let i = 0; i < 3; i++) {
          const r = R * (0.75 + 0.25 * Math.sin(t * 0.2 + i * 2.1)) + i * 10;
          this.ellipse(cx, cy, r, r * 0.8, mix(SKY, col, 0.9 - i * 0.2), 2);
        }
      } else if (mode === "break") {
        const r = R * (1.2 + 0.15 * Math.sin(t * 0.7));
        ["#ffe27a", "#ffffff"].forEach((cc, i) => { const rr = r - i * 14; this.ellipse(cx, cy, rr, rr * 0.8, cc, 3); });
      } else if (mode === "idle" && this.kind !== "title") {
        const r = R * (0.55 + 0.05 * Math.sin(t * 0.07));
        this.ellipse(cx, cy, r, r * 0.8, mix(SKY, col, 0.35), 1);
      }

      // VFX lặp theo trạng thái
      if (this.kind !== "title") {
        if (mode === "train") { const fr = A.vfx("qi"); this.img(fr[Math.floor(t / 3) % fr.length], cx, this.gy - 48); }
        else if (mode === "break") { const fr = A.vfx("break"); this.img(fr[Math.floor(this.mt / 4) % fr.length], cx, this.gy + 8, "s"); }
        else if (mode === "rest") { const fr = A.vfx("heal"); this.img(fr[Math.floor(t / 4) % fr.length], cx, this.gy + 6, "s"); }
      }

      this.drawSeason(true);                                            // hạt xa / giữa (nằm sau nhân vật)

      // nhân vật + yêu thú
      const pose = { explore: "walk", fight: "fight", dead: "dead" }[mode] || "sit";
      if (this.kind !== "title") this.person(cx, this.gy, pose, t);
      if (this.mon) this.monSprite();

      // VFX phát 1 lần
      if (this.fx.length) {
        const keep = [];
        for (const f of this.fx) {
          const fr = A.vfx(f.n), i = Math.floor(f.t);
          if (i < fr.length) { this.img(fr[i], f.x, f.y, f.a); f.t += f.spd; keep.push(f); }
        }
        this.fx = keep;
      }

      this.drawSeason(false);                                           // hạt gần (nằm trước nhân vật)

      // hạt (vẽ trên)
      for (const p of this.parts) {
        if (p.k === "sp") continue;
        const f = p.life / p.max;
        let cc = mix(SKY, p.col, Math.min(1.0, f * 1.4));
        if (p.k === "heal") {
          c.font = `bold 18px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
          c.fillStyle = cc; c.fillText("+", p.x, p.y);
        } else {
          c.fillStyle = cc; c.beginPath(); c.arc(p.x, p.y, p.size, 0, 6.2832); c.fill();
        }
      }

      // vòng sóng
      const keepR = [];
      for (const rg of this.rings) {
        rg.r += 5; rg.life--;
        if (rg.life > 0) {
          this.ellipse(cx, cy, rg.r, rg.r * 0.7, mix(SKY, rg.col, rg.life / rg.max), 3);
          keepR.push(rg);
        }
      }
      this.rings = keepR;

      // chữ bay
      const keepF = [];
      c.font = `bold 17px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
      for (const fl of this.floats) {
        fl.y -= 0.9; fl.life--;
        if (fl.life > 0) {
          c.fillStyle = "#000"; c.fillText(fl.text, fl.x + 1, fl.y + 1);
          c.fillStyle = mix(SKY, fl.col, Math.min(1.0, fl.life / 25)); c.fillText(fl.text, fl.x, fl.y);
          keepF.push(fl);
        }
      }
      this.floats = keepF;

      // chớp màn hình
      if (this.flashT > 0) {
        c.globalAlpha = 0.12 + 0.38 * (this.flashT / this.flashMax);
        c.fillStyle = this.flashC; c.fillRect(0, 0, this.w, this.h);
        c.globalAlpha = 1;
        this.flashT--;
      }

      c.font = `13px ${FONT}`; c.textAlign = "left"; c.textBaseline = "top";
      c.fillStyle = "rgba(0,0,0,.55)"; c.fillText("Mùa " + TT.SEASONS[this.season], 11, 11);
      c.fillStyle = C.DIM; c.fillText("Mùa " + TT.SEASONS[this.season], 10, 10);
    }
  }
  TT.Scene = Scene;
})();
