/* Cảnh động (canvas) port từ scene.js của bản cũ: nền parallax theo map + mùa, hạt mùa, nhân vật ngồi thiền, hào quang đột phá.
   Chỉ vẽ; không giữ trạng thái game. Tôn trọng prefers-reduced-motion. */
import { assetBase, resolveAssetUrl } from "../config.js";
import { h } from "./dom.js";
import { frameAt, frameUrls, vfxFor } from "./vfx.js";

const cache = new Map();
function load(src) {
  src = resolveAssetUrl(src);
  let im = cache.get(src);
  if (!im) { im = new Image(); im.decoding = "async"; im.src = src; cache.set(src, im); }
  return im;
}
const ok = (im) => !!im && im.complete && im.naturalWidth > 0;

const W = 700, H = 290, STEP = 1000 / 30;
const BG_LAYERS = [
  { n: "far", k: 0.06, dr: 0.035, sc: 1.18, by: 44, bob: 1.2 },
  { n: "mid", k: 0.22, dr: 0.09, sc: 1.1, by: 24, bob: 2.0 },
  { n: "fore", k: 1.0, dr: 0, sc: 1.0, by: 0, bob: 0 },
];
const BG_SKY = [["#a9d4f5", "#f6e6f0"], ["#1b8fda", "#8fd0ee"], ["#99737f", "#f2a65a"], ["#032f70", "#1d518e"]];
const SEASON = [
  { rate: 0.10, wind: 0.8, vy: 0.75, sm: 1.0 },
  { rate: 0.06, wind: 0.3, vy: 0.8, sm: 1.0 },
  { rate: 0.10, wind: 1.2, vy: 0.95, sm: 0.9 },
  { rate: 0.20, wind: 1.5, vy: 1.0, sm: 0.75 },
];
const cx = Math.floor(W * 0.33), gy = Math.floor(H * 0.87);

/**
 * @param {{ world?: "ha_gioi"|"linh_gioi"|"tien_gioi", season?: number, color?: string, pulse?: number, ascend?: boolean (pulse này là Phi Thăng sang đại giới mới), thunder?: boolean (lôi kiếp khi chuẩn bị đại đột phá), gender?: "male"|"female", label?: string }} init
 *   season: 0..3 = Xuân, Hạ, Thu, Đông. pulse: tăng giá trị để phát hiệu ứng đột phá.
 */
export function createScene(init = {}) {
  const o = { world: "ha_gioi", season: 0, color: "#cfd8dc", pulse: 0, gender: "male", label: "Cảnh tu luyện", ...init };
  const A = assetBase();
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = h("canvas", { class: "scene-cv", width: W, height: H, "aria-hidden": "true" });
  const el = h("div", { class: "scene-wrap", role: "img", "aria-label": o.label }, canvas);
  const c = canvas.getContext("2d");

  let parts = [], rings = [], fx = [], thunderOn = false, thunderT = 0;
  let flashT = 0, t = 0, scroll = 0, wind = 0;
  let curSeason = o.season, prevSeason = o.season, sb = 1, lastPulse = o.pulse;

  const bg = (w, layer, s) => load(`${A}/parallax/${w}/${layer}_${s}.webp`);
  const sprite = (s, v) => load(`${A}/seasons/${s}_${v}.png`);
  // Số khung hình idle thật của bộ asset: nam ở Hạ Giới chỉ có 3 khung, còn lại 4.
  const heroFrames = (w, g) => (g === "male" && w === "ha_gioi" ? 3 : 4);
  const hero = (w, g) => Array.from({ length: heroFrames(w, g) }, (_, i) => load(`${A}/player/${g}/${w}/idle/${i + 1}.png`));

  // Tải trước: chỉ lớp của map + mùa đang xem (tránh tải 12 MB một lúc).
  function preload() {
    for (const L of BG_LAYERS) bg(o.world, L.n, o.season);
    sprite(o.season, 0); sprite(o.season, 1); sprite(o.season, 2);
    hero(o.world, o.gender);
    for (const n of ["linhKhi", "dotPha", "phiThang", "loiKiep"]) { const v = vfxFor(n, o.world); if (v) frameUrls(v).forEach((u) => load(u)); }
  }
  preload();

  /** Phát một hiệu ứng khung hình (một lần hoặc lặp) tại vị trí/tỉ lệ cho trước. */
  function playFx(name, { world = o.world, x = cx, y = gy, scale = 1, alpha = 1, loop = false, ttl = 0 } = {}) {
    const v = vfxFor(name, world);
    if (!v || reduced) return;
    const frames = frameUrls(v).map((u) => load(u));
    fx.push({ v, frames, x, y, scale, alpha, loop, age: 0, ttl });
  }
  const ambientQi = () => { if (!reduced && !fx.some((f) => f.loop)) playFx("linhKhi", { x: cx, y: gy - 55, scale: 0.9, alpha: 0.5, loop: true }); };

  function drawFx(loops) {
    fx = fx.filter((f) => {
      if (f.loop !== loops) return true;
      f.age++;
      const i = frameAt(f.v, f.age, { loop: f.loop });
      if (i === null || (f.ttl && f.age > f.ttl)) return false;
      const im = f.frames[i];
      if (ok(im)) {
        const w = im.naturalWidth * f.scale, hh = im.naturalHeight * f.scale;
        c.save(); c.globalAlpha = f.alpha; c.globalCompositeOperation = "lighter";
        c.drawImage(im, Math.round(f.x - w / 2), Math.round(f.y - hh), w, hh);
        c.restore();
      }
      return true;
    });
  }

  function drawBg(s, alpha) {
    c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    const g = c.createLinearGradient(0, 0, 0, H * 0.8);
    g.addColorStop(0, BG_SKY[s][0]); g.addColorStop(0.22, BG_SKY[s][0]); g.addColorStop(1, BG_SKY[s][1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const L of BG_LAYERS) {
      const im = bg(o.world, L.n, s);
      if (!ok(im)) continue;
      const w = im.naturalWidth * L.sc, hh = im.naturalHeight * L.sc;
      const off = (((scroll * L.k + t * L.dr) % w) + w) % w;
      const y = Math.round(H - L.by - hh + (L.bob ? Math.sin(t * 0.012 + L.k * 9) * L.bob : 0));
      for (let x = -off; x < W; x += w) c.drawImage(im, x, y, w, hh);
    }
    c.restore(); c.imageSmoothingEnabled = false;
  }

  function spawn() {
    if (reduced) return;
    const S = SEASON[curSeason];
    if (parts.length < 46 && Math.random() < S.rate) {
      const v = Math.floor(Math.random() * 3), glow = curSeason === 1 && v < 2;
      const im = sprite(curSeason, v);
      if (glow) parts.push({ k: "sp", x: Math.random() * W, y: gy - 20 - Math.random() * H * 0.45, vy: 0, life: 200 + Math.random() * 140, ph: Math.random() * 6.28, im, sc: 0.45, a: 1, glow: true });
      else {
        const d = 0.55 + Math.random() * 0.75;                                 // chiều sâu: gần = to, nhanh, rõ; xa = nhỏ, chậm, mờ
        parts.push({ k: "sp", x: Math.random() * (W + 120) - 60, y: -20, vy: S.vy * d * (0.8 + Math.random() * 0.4), life: 1500, ph: Math.random() * 6.28,
          im, sc: 0.45 * S.sm * d, a: 0.45 + 0.45 * Math.min(1, d), rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * (curSeason === 3 ? 0.02 : 0.06), d });
      }
    }
    if (Math.random() < 0.06) {                                           // khí tụ về nhân vật
      const a = Math.random() * 6.28, d = 130;
      parts.push({ k: "qi", x: cx + Math.cos(a) * d, y: gy - 45 + Math.sin(a) * d * 0.7, vy: 0, life: 80, ph: 0, sc: 2, a: 1 });
    }
  }

  function tick() {
    t++;
    c.clearRect(0, 0, W, H); c.imageSmoothingEnabled = false;
    scroll += reduced ? 0 : 0.15;
    c.fillStyle = "#0a0f1e"; c.fillRect(0, 0, W, H);
    if (sb < 1) { sb = Math.min(1, sb + 1 / 45); drawBg(prevSeason, 1); }
    drawBg(curSeason, sb);

    const wt = (0.25 + 0.55 * Math.sin(t * 0.0035) + 0.25 * Math.sin(t * 0.011 + 1)) * SEASON[curSeason].wind;
    wind += (wt - wind) * 0.04;
    spawn();

    const alive = [];
    for (const p of parts) {
      p.life--;
      if (p.k === "qi") {
        const dx = cx - p.x, dy = gy - 45 - p.y, d = Math.hypot(dx, dy) + 0.01, sp = 2 + Math.max(0, 1 - d / 290) * 5;
        p.x += dx / d * sp; p.y += dy / d * sp; if (d < 14) p.life = 0;
        if (p.life > 0) { c.globalAlpha = Math.min(1, p.life / 30); c.fillStyle = o.color; c.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); c.globalAlpha = 1; }
      } else if (p.glow) {
        p.ph += 0.05; p.x += Math.sin(p.ph) * 0.3; p.y += Math.cos(p.ph * 0.8) * 0.2;
        const a = Math.min(1, p.life / 60) * (0.6 + 0.4 * Math.sin(p.ph * 2));
        if (ok(p.im) && p.life > 0) { c.globalAlpha = Math.max(0, a); c.drawImage(p.im, p.x - 11, p.y - 11, 22, 22); c.globalAlpha = 1; }
      } else {
        p.ph += 0.04; p.y += p.vy; p.x += wind + Math.sin(p.ph) * 0.6;
        if (p.y > gy + 6) p.life = 0;
        if (ok(p.im) && p.life > 0) {
          const s = p.im.naturalWidth * p.sc; p.rot += p.vr;
          c.save(); c.globalAlpha = p.a; c.translate(Math.round(p.x + s / 2), Math.round(p.y + s / 2)); c.rotate(p.rot); c.drawImage(p.im, -s / 2, -s / 2, s, s); c.restore();
        }
      }
      if (p.life > 0) alive.push(p);
    }
    parts = alive;

    ambientQi();
    drawFx(true);                                                           // khí xoáy dưới chân nhân vật
    if (thunderOn && !reduced && t - thunderT > 34 + Math.random() * 26) {  // lôi kiếp khi đang chuẩn bị đại đột phá
      thunderT = t; playFx("loiKiep", { x: cx + (Math.random() - 0.5) * 220, y: gy + 4, scale: 1.15, alpha: 0.95 }); flashT = Math.max(flashT, 4);
    }
    const frames = hero(o.world, o.gender).filter(ok);
    if (frames.length) {
      const f = frames[Math.floor(t / 12) % frames.length];
      // sprite Tiên Giới cao hơn: co lại để không bị cắt đầu
      const s = Math.min(1.25, (H * 0.66) / f.naturalHeight), w = f.naturalWidth * s, hh = f.naturalHeight * s;
      c.drawImage(f, Math.round(cx - w / 2), Math.round(gy + 3 - hh), w, hh);
    }

    drawFx(false);
    rings = rings.filter((r) => (r.life--) > 0);
    for (const r of rings) {
      const k = 1 - r.life / r.max;
      c.beginPath(); c.ellipse(cx, gy - 45, Math.max(0.1, 12 + k * 150), Math.max(0.1, (12 + k * 150) * 0.7), 0, 0, Math.PI * 2);
      c.strokeStyle = `rgba(255,226,122,${1 - k})`; c.lineWidth = 3; c.stroke();
    }
    if (flashT > 0) { c.fillStyle = `rgba(255,255,255,${flashT / 20})`; c.fillRect(0, 0, W, H); flashT--; }
  }

  let raf = 0, last = performance.now(), acc = 0, on = true;
  const loop = (now) => {
    if (!on) return;
    acc += Math.min(now - last, 200); last = now;
    let n = 0;
    while (acc >= STEP && n < 3) { acc -= STEP; n++; tick(); }
    if (acc > STEP * 3) acc = 0;
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    el,
    /** Cập nhật thuộc tính (world/season/color/pulse/gender/label). */
    update(p) {
      Object.assign(o, p);
      el.setAttribute("aria-label", o.label);
      preload();
      if (o.season !== curSeason) { prevSeason = curSeason; curSeason = o.season; sb = t > 5 ? 0 : 1; }
      if (o.pulse !== lastPulse) {
        lastPulse = o.pulse; rings.push({ r: 10, life: 28, max: 28 }); flashT = 10;
        playFx("dotPha", { y: gy + 6, scale: 1.35 });
        if (o.ascend) playFx("phiThang", { y: gy + 10, scale: 0.9, alpha: 0.95 });
      }
      thunderOn = !!o.thunder;
    },
    destroy() { on = false; cancelAnimationFrame(raf); },
  };
}
