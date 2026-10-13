/* Minigame nghề phụ: giữ lửa, bấm nhịp, kéo nét phù văn. */
"use strict";
(function () {
  const { C, mix, FONT } = TT;
  const CW = 560, CH = 300;

  /* --- helper vẽ --- */
  const rect = (c, x0, y0, x1, y1, fill, stroke, lw = 1) => {
    if (fill) { c.fillStyle = fill; c.fillRect(x0, y0, x1 - x0, y1 - y0); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.strokeRect(x0, y0, x1 - x0, y1 - y0); }
  };
  const text = (c, x, y, s, fill, size = 13, bold = false) => {
    c.font = `${bold ? "bold " : ""}${size}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = fill; c.fillText(s, x, y);
  };
  const line = (c, pts, stroke, lw, dash) => {
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.strokeStyle = stroke; c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round";
    c.setLineDash(dash || []); c.stroke(); c.setLineDash([]);
  };
  const circle = (c, x, y, r, stroke, lw) => { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); };

  class Stage {
    constructor() { this.done = false; this.score = 0.0; this.name = ""; this.hint = ""; }
    start() {} tick() {} press() {} move() {} release() {} key() {}
  }

  /** Giữ "hỏa lực" trong vùng xanh đang trôi. Điểm = tỉ lệ thời gian nằm trong vùng. */
  class FireStage extends Stage {
    constructor(name, hint, dur, zw) { super(); Object.assign(this, { name, hint, dur, zw }); }
    start() {
      this.t = 0; this.temp = 0.3; this.hold = false; this.ok = 0;
      this.ph = Math.random() * 6; this.total = Math.trunc(this.dur * 30);
    }
    key(down) { this.hold = down; }
    press() { this.hold = true; }
    release() { this.hold = false; }
    tick(c) {
      this.t++;
      const cc = 0.55 + 0.18 * Math.sin(this.ph + this.t * 0.04);
      this.temp += (this.hold ? 0.016 : -0.007) + uni(-0.004, 0.004);
      this.temp = clamp(this.temp, 0, 1);
      const inz = Math.abs(this.temp - cc) <= this.zw / 2;
      if (inz) this.ok++;
      const x0 = 240, x1 = 320, y0 = 24, y1 = 246;
      rect(c, x0, y0, x1, y1, "#0b1015", "#2a4a3a", 2);
      const zt = y1 - (cc + this.zw / 2) * (y1 - y0), zb = y1 - (cc - this.zw / 2) * (y1 - y0);
      rect(c, x0 + 2, zt, x1 - 2, zb, inz ? "#3cff3c" : "#1f6b3a");
      const ty = y1 - this.temp * (y1 - y0);
      rect(c, x0 + 24, ty, x1 - 24, y1 - 2, mix("#ff9f43", "#ff3b1f", this.temp));
      line(c, [[x0 - 12, ty], [x1 + 12, ty]], "#ffffff", 3);
      text(c, CW / 2, 266, "Giữ [Space] hoặc chạm/chuột trái để thêm lửa - đưa vạch trắng vào vùng xanh", C.DIM, 12);
      rect(c, 40, 284, 40 + (CW - 80) * this.t / this.total, 291, C.GOLD);
      if (this.t >= this.total) { this.score = this.ok / this.total; this.done = true; }
    }
  }

  /** Vạch chạy qua lại, bấm đúng lúc nó nằm trong vùng xanh. Điểm = trung bình các lần bấm. */
  class TimingStage extends Stage {
    constructor(name, hint, n, speed = 0.018) { super(); Object.assign(this, { name, hint, n, speed }); }
    start() {
      this.i = 0; this.m = 0.0; this.d = 1; this.hits = []; this.msg = ""; this.msgc = C.GREEN; this.cool = 0;
      this.newc();
    }
    newc() { this.c = uni(0.2, 0.8); this.w = 0.13; }
    key(down) { if (down) this.hit(); }
    press() { this.hit(); }
    hit() {
      if (this.done || this.cool > 0 || this.i >= this.n) return;
      const d = Math.abs(this.m - this.c);
      const s = d <= this.w / 2 ? 1.0 : Math.max(0.0, 1 - (d - this.w / 2) / (this.w * 1.5));
      this.hits.push(s); this.i++; this.cool = 8;
      [this.msg, this.msgc] = s >= 0.99 ? ["Hoàn hảo!", C.GOLD] : (s >= 0.6 ? ["Tốt", C.GREEN] : ["Lệch", C.RED]);
      this.newc();
      if (this.i >= this.n) { this.score = this.hits.reduce((a, b) => a + b, 0) / this.n; this.done = true; }
    }
    tick(c) {
      this.cool = Math.max(0, this.cool - 1);
      this.m += this.d * this.speed * (1 + 0.12 * this.i);
      if (this.m >= 1) { this.m = 1.0; this.d = -1; }
      if (this.m <= 0) { this.m = 0.0; this.d = 1; }
      const x0 = 40, x1 = 520, y0 = 110, y1 = 160;
      rect(c, x0, y0, x1, y1, "#0b1015", "#2a4a3a", 2);
      rect(c, x0 + (this.c - this.w / 2) * (x1 - x0), y0 + 2, x0 + (this.c + this.w / 2) * (x1 - x0), y1 - 2, "#1f8f4a", "#3cff3c", 1);
      const mx = x0 + this.m * (x1 - x0);
      line(c, [[mx, y0 - 14], [mx, y1 + 14]], "#ffffff", 4);
      text(c, CW / 2, 70, `Lần ${Math.min(this.i + 1, this.n)} / ${this.n}`, C.FG, 21, true);
      if (this.msg) text(c, CW / 2, 205, this.msg, this.msgc, 21, true);
      text(c, CW / 2, 266, "Bấm [Space] hoặc chạm/chuột trái đúng lúc vạch trắng nằm trong vùng xanh", C.DIM, 12);
    }
  }

  /** Kéo bút theo đường phù văn. Điểm = độ chính xác nét vẽ + độ phủ đường, có giới hạn mực. */
  class PathStage extends Stage {
    constructor(name, hint, shape) { super(); Object.assign(this, { name, hint, shape }); }
    start() {
      const pts = TT.SHAPES[this.shape].map(([x, y]) => [50 + x * 460, 22 + y * 230]);
      const g = [];
      for (let k = 0; k + 1 < pts.length; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
        const n = Math.max(1, Math.trunc(Math.hypot(bx - ax, by - ay) / 10));
        for (let j = 0; j < n; j++) g.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]);
      }
      g.push(pts[pts.length - 1]);
      this.pts = pts; this.g = g; this.cov = new Array(g.length).fill(false);
      this.total = 0;
      for (let k = 0; k + 1 < pts.length; k++) this.total += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
      this.stroke = []; this.drawing = false; this.started = false;
      this.samples = 0; this.good = 0; this.len = 0.0; this.last = null;
    }
    ink() { return 1 - this.len / (this.total * 2.4); }   // 2,4 lần độ dài đường (trước 1,6): tay rung vẫn đủ mực
    coverage() { return this.cov.filter(Boolean).length / this.cov.length; }
    sample(x, y) {
      let best = 1e9;
      this.g.forEach(([gx, gy], i) => {
        const d = Math.hypot(x - gx, y - gy);
        best = Math.min(best, d);
        if (d <= 26) this.cov[i] = true;
      });
      this.samples++;
      if (best <= 24) this.good++;
    }
    press(x, y) {
      if (this.done) return;
      if (this.started || Math.hypot(x - this.g[0][0], y - this.g[0][1]) <= 40) {
        this.drawing = this.started = true;
        this.last = [x, y]; this.stroke.push([[x, y]]); this.sample(x, y);
      }
    }
    move(x, y) {
      if (!this.drawing || this.done) return;
      this.len += Math.hypot(x - this.last[0], y - this.last[1]);
      this.last = [x, y];
      this.stroke[this.stroke.length - 1].push([x, y]);
      this.sample(x, y);
      if (this.ink() <= 0 || this.coverage() >= 0.97) this.finish();
    }
    release() {
      this.drawing = false;
      if (this.started && this.coverage() >= 0.8) this.finish();
    }
    finish() {
      const acc = this.good / Math.max(1, this.samples);
      this.score = clamp(0.5 * acc + 0.5 * this.coverage(), 0, 1); this.done = true;
    }
    tick(c) {
      line(c, this.pts, "#1d4a63", 12);
      line(c, this.pts, "#7fdcff", 2, [5, 4]);
      circle(c, this.pts[0][0], this.pts[0][1], 11, "#3cff3c", 3);
      const e = this.pts[this.pts.length - 1];
      circle(c, e[0], e[1], 7, C.GOLD, 2);
      for (const s of this.stroke) if (s.length > 1) line(c, s, "#e8ffff", 4);
      const ink = Math.max(0.0, this.ink());
      rect(c, 40, 272, 40 + (CW - 80) * ink, 282, mix("#ff3b1f", "#7fdcff", ink));
      text(c, CW / 2, 292, "Mực (kéo bút bắt đầu từ vòng xanh, thả chuột khi xong)", C.DIM, 12);
    }
  }

  TT.FireStage = FireStage; TT.TimingStage = TimingStage; TT.PathStage = PathStage;

  /** Cửa sổ minigame: chạy lần lượt các Stage rồi gọi onDone(list điểm) -> text kết quả. */
  class CraftWindow {
    constructor(game, title, stages, onDone) {
      Object.assign(this, { game, stages, onDone, i: -1, scores: [], cur: null, fin: false, wait: 0, kdown: false, result: "" });
      const { overlay, box, close } = TT.ui.modal("craft-box", () => this.close());
      this.overlay = overlay; this.closeModal = close;
      box.append(
        h("h2", { class: "mtitle" }, title),
        this.lblSteps = h("div", { class: "dim small center" }),
        this.cv = h("canvas", { class: "craft-cv", width: CW, height: CH }),
        this.lblHint = h("div", { class: "hint-line" }),
        h("div", { class: "row center" }, this.btnClose = h("button", { class: "btn red", onclick: () => this.close() }, "Hủy")),
      );
      this.ctx = this.cv.getContext("2d");
      const pos = e => { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height]; };
      const fw = (what, e) => { e.preventDefault(); if (this.cur && !this.cur.done && !this.fin) this.cur[what](...pos(e)); };
      this.cv.addEventListener("pointerdown", e => { this.cv.setPointerCapture?.(e.pointerId); fw("press", e); });
      this.cv.addEventListener("pointermove", e => fw("move", e));
      this.cv.addEventListener("pointerup", e => fw("release", e));
      this.cv.addEventListener("pointercancel", e => fw("release", e));
      this.kd = e => {
        if (e.code !== "Space") return;
        e.preventDefault();
        if (!this.kdown) { this.kdown = true; if (this.cur && !this.cur.done && !this.fin) this.cur.key(true); }
      };
      this.ku = e => {
        if (e.code !== "Space") return;
        e.preventDefault(); this.kdown = false;
        if (this.cur && !this.fin) this.cur.key(false);
      };
      window.addEventListener("keydown", this.kd, true); window.addEventListener("keyup", this.ku, true);
      this.timer = setInterval(() => this.loop(), 33);
      setTimeout(() => this.advance(), 150);
    }
    get alive() { return this.overlay.isConnected; }
    advance() {
      this.i++;
      if (this.i >= this.stages.length) { this.finalize(); return; }
      this.cur = this.stages[this.i]; this.cur.done = false; this.cur.start();
      this.lblSteps.textContent = this.stages.map((s, k) => k === this.i ? `[${s.name}]` : s.name).join("  →  ");
      this.lblHint.textContent = this.cur.hint;
    }
    finalize() {
      this.fin = true; this.cur = null;
      this.result = this.onDone(this.scores) || "";
      this.lblHint.textContent = "";
      this.btnClose.textContent = "Đóng"; this.btnClose.className = "btn";
    }
    loop() {
      if (!this.alive) { clearInterval(this.timer); return; }
      const c = this.ctx;
      c.clearRect(0, 0, CW, CH); c.fillStyle = "#0a0f1e"; c.fillRect(0, 0, CW, CH);
      if (this.fin) {
        const lines = [];
        String(this.result).split("\n").forEach(ln => {          // ngắt dòng thủ công, rộng 500px
          c.font = `bold 21px ${FONT}`;
          let cur = "";
          ln.split(" ").forEach(w => { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > 500 && cur) { lines.push(cur); cur = w; } else cur = t; });
          lines.push(cur);
        });
        lines.forEach((ln, i) => text(c, CW / 2, CH / 2 + (i - (lines.length - 1) / 2) * 28, ln, C.GOLD, 21, true));
      } else if (this.cur) {
        if (!this.cur.done) {
          this.cur.tick(c);
          if (this.cur.done) { this.scores.push(this.cur.score); this.wait = 22; }
        } else {
          this.wait--;
          text(c, CW / 2, CH / 2, `${this.cur.name}: ${Math.trunc(this.cur.score * 100)}%`, C.GOLD, 21, true);
          if (this.wait <= 0) this.advance();
        }
      }
    }
    close() {
      if (!this.fin) { this.fin = true; this.onDone(null); }
      clearInterval(this.timer);
      window.removeEventListener("keydown", this.kd, true); window.removeEventListener("keyup", this.ku, true);
      this.closeModal();
      this.game.renderDialog();
    }
  }
  TT.CraftWindow = CraftWindow;
})();
