/* Cảnh hoạt họa (canvas): nền parallax, nhân vật, yêu thú, hiệu ứng. Port từ game/scene.py */
"use strict";
(function () {
  const { A, mix, C, FONT } = TT;
  const SKY = C.SKY;
  const STEP = 1000 / 30;

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
      this.gy = Math.floor(h * 0.82);
      this.t = 0; this.mode = "idle"; this.mt = 0; this.mdur = 0; this.win = true;
      this.parts = []; this.floats = []; this.rings = []; this.fx = [];
      this.shake = 0;
      this.flashC = null; this.flashT = 0; this.flashMax = 1;
      this.scroll = 0; this.speed = 0.2; this.season = 0; this.mon = null;
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
    setSeason(s) { this.season = ((s % 4) + 4) % 4; }
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
      if (r() < 0.22) {                       // hạt môi trường theo mùa
        const col = ["#ffb3d1", "#e6ff6a", "#e0782a", "#ffffff"][this.season];
        if (this.season === 1) {
          this.parts.push({ k: "amb", x: r() * w, y: this.gy - r() * 120, vx: 0, vy: 0, life: 90, max: 90, col, size: 2, ph: r() * 6, fire: true });
        } else {
          this.parts.push({ k: "amb", x: r() * w, y: -5, vx: uni(-0.3, 0.6), vy: uni(0.6, 1.6), life: 260, max: 260, col, size: pick([2, 3]), ph: r() * 6 });
        }
      }
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
        for (const [name, k] of [["far", 0.15], ["mid", 0.4], ["fore", 1.0]]) {
          const im = A.img(`bg/${name}.png`);
          if (!A.ok(im)) continue;
          const W = im.naturalWidth, off = (this.scroll * k) % W;
          for (let x = -off; x < this.w; x += W) c.drawImage(im, Math.round(x), 0);
        }
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

      this.spawn(mode);

      // cập nhật hạt
      const alive = [];
      for (const p of this.parts) {
        if (p.k === "qi") {
          const dx = this.cx - p.x, dy = (this.gy - 45) - p.y, d = Math.hypot(dx, dy) + 0.01;
          const sp = 2.0 + Math.max(0.0, 1 - d / (this.R * 2.2)) * 5;
          p.x += dx / d * sp; p.y += dy / d * sp;
          if (d < 14) p.life = 0;
        } else if (p.k === "amb") {
          if (p.fire) { p.x += Math.sin(t * 0.07 + p.ph) * 0.8; p.y += Math.cos(t * 0.05 + p.ph) * 0.5; }
          else { p.x += p.vx + Math.sin(t * 0.05 + p.ph) * 0.4; p.y += p.vy; }
        } else {
          p.x += p.vx; p.y += p.vy;
          if (p.k === "spark") p.vy += 0.15;
        }
        p.life--;
        if (p.life > 0 && p.y < this.h && p.x > -20 && p.x < this.w + 20) alive.push(p);
      }
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

      // hạt (vẽ trên)
      for (const p of this.parts) {
        const f = p.life / p.max;
        let cc = mix(SKY, p.col, Math.min(1.0, f * 1.4));
        if (p.k === "heal") {
          c.font = `bold 18px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
          c.fillStyle = cc; c.fillText("+", p.x, p.y);
        } else {
          if (p.fire) cc = mix(SKY, p.col, 0.5 + 0.5 * Math.sin(t * 0.2 + p.ph));
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
