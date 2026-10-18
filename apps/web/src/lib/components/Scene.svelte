<script lang="ts" module>
  export type WorldId = "ha_gioi" | "linh_gioi" | "tien_gioi";
  const cache = new Map<string, HTMLImageElement>();
  function load(src: string): HTMLImageElement {
    let im = cache.get(src);
    if (!im) { im = new Image(); im.decoding = "async"; im.src = src; cache.set(src, im); }
    return im;
  }
  const ok = (im: HTMLImageElement | undefined): im is HTMLImageElement => !!im && im.complete && im.naturalWidth > 0;
</script>

<script lang="ts">
  /* Cảnh động (canvas) port từ scene.js của bản cũ: nền parallax theo map + mùa, hạt mùa, nhân vật ngồi thiền, hào quang đột phá.
     Chỉ vẽ; không giữ trạng thái game. Tôn trọng prefers-reduced-motion. */
  import { onMount, untrack } from "svelte";
  import { base } from "$app/paths";

  interface Props {
    world: WorldId;
    /** 0..3 = Xuân, Hạ, Thu, Đông */
    season: number;
    /** màu hạt khí quanh nhân vật */
    color?: string;
    /** tăng giá trị này để phát hiệu ứng đột phá */
    pulse?: number;
    gender?: "male" | "female";
    label?: string;
  }
  let { world, season, color = "#cfd8dc", pulse = 0, gender = "male", label = "Cảnh tu luyện" }: Props = $props();

  const W = 700, H = 290, STEP = 1000 / 30;
  const A = `${base}/assets`;
  const BG_LAYERS = [
    { n: "far", k: 0.06, dr: 0.035, sc: 1.18, by: 44, bob: 1.2 },
    { n: "mid", k: 0.22, dr: 0.09, sc: 1.1, by: 24, bob: 2.0 },
    { n: "fore", k: 1.0, dr: 0, sc: 1.0, by: 0, bob: 0 },
  ];
  const BG_SKY: readonly (readonly [string, string])[] = [["#a9d4f5", "#f6e6f0"], ["#1b8fda", "#8fd0ee"], ["#99737f", "#f2a65a"], ["#032f70", "#1d518e"]];
  const SEASON = [
    { rate: 0.10, wind: 0.8, vy: 0.75, sa: [0.4, 1.2], sm: 1.0 },
    { rate: 0.06, wind: 0.3, vy: 0.8, sa: [0.4, 1.0], sm: 1.0 },
    { rate: 0.10, wind: 1.2, vy: 0.95, sa: [0.4, 1.2], sm: 0.9 },
    { rate: 0.20, wind: 1.5, vy: 1.0, sa: [0.2, 0.6], sm: 0.75 },
  ];
  const cx = Math.floor(W * 0.33), gy = Math.floor(H * 0.87);

  let canvas: HTMLCanvasElement;
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  type P = { k: "sp" | "qi" | "fx"; x: number; y: number; vx: number; vy: number; life: number; max: number; ph: number; im?: HTMLImageElement; sc: number; a: number; glow?: boolean };
  let parts: P[] = [];
  let rings: { r: number; life: number; max: number }[] = [];
  let flashT = 0, t = 0, scroll = 0, wind = 0;
  let curSeason = untrack(() => season), prevSeason = curSeason, sb = 1;
  let lastPulse = untrack(() => pulse);

  const bg = (w: WorldId, layer: string, s: number) => load(`${A}/parallax/${w}/${layer}_${s}.webp`);
  const sprite = (s: number, v: number) => load(`${A}/seasons/${s}_${v}.png`);
  // Số khung hình idle thật của bộ asset: nam ở Hạ Giới chỉ có 3 khung, còn lại 4.
  const heroFrames = (w: WorldId, g: string) => (g === "male" && w === "ha_gioi" ? 3 : 4);
  const hero = (w: WorldId, g: string): HTMLImageElement[] =>
    Array.from({ length: heroFrames(w, g) }, (_, i) => load(`${A}/player/${g}/${w}/idle/${i + 1}.png`));

  // Tải trước: chỉ lớp của map + mùa đang xem (tránh tải 12 MB một lúc).
  $effect(() => { for (const L of BG_LAYERS) bg(world, L.n, season); sprite(season, 0); sprite(season, 1); sprite(season, 2); hero(world, gender); });
  $effect(() => {
    if (season !== curSeason) { prevSeason = curSeason; curSeason = season; sb = t > 5 ? 0 : 1; }
  });
  $effect(() => {
    if (pulse !== lastPulse) { lastPulse = pulse; rings.push({ r: 10, life: 28, max: 28 }); flashT = 10; }
  });

  function drawBg(s: number, alpha: number, c: CanvasRenderingContext2D) {
    c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    const g = c.createLinearGradient(0, 0, 0, H * 0.8);
    g.addColorStop(0, BG_SKY[s]![0]); g.addColorStop(0.22, BG_SKY[s]![0]); g.addColorStop(1, BG_SKY[s]![1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const L of BG_LAYERS) {
      const im = bg(world, L.n, s);
      if (!ok(im)) continue;
      const w = im.naturalWidth * L.sc, h = im.naturalHeight * L.sc;
      const off = (((scroll * L.k + t * L.dr) % w) + w) % w;
      const y = Math.round(H - L.by - h + (L.bob ? Math.sin(t * 0.012 + L.k * 9) * L.bob : 0));
      for (let x = -off; x < W; x += w) c.drawImage(im, x, y, w, h);
    }
    c.restore(); c.imageSmoothingEnabled = false;
  }

  function spawn() {
    if (reduced) return;
    const S = SEASON[curSeason]!;
    if (parts.length < 38 && Math.random() < S.rate) {
      const v = Math.floor(Math.random() * 3), glow = curSeason === 1 && v < 2;
      const im = sprite(curSeason, v);
      if (glow) parts.push({ k: "sp", x: Math.random() * W, y: gy - 20 - Math.random() * H * 0.45, vx: 0, vy: 0, life: 200 + Math.random() * 140, max: 340, ph: Math.random() * 6.28, im, sc: 0.45, a: 1, glow: true });
      else parts.push({ k: "sp", x: Math.random() * (W + 120) - 60, y: -20, vx: 0, vy: S.vy * (0.7 + Math.random() * 0.6), life: 1500, max: 1500, ph: Math.random() * 6.28, im, sc: 0.45 * S.sm, a: 0.9 });
    }
    if (Math.random() < 0.06) {                                           // khí tụ về nhân vật
      const a = Math.random() * 6.28, d = 130;
      parts.push({ k: "qi", x: cx + Math.cos(a) * d, y: gy - 45 + Math.sin(a) * d * 0.7, vx: 0, vy: 0, life: 80, max: 80, ph: 0, sc: 2, a: 1 });
    }
  }

  function tick(c: CanvasRenderingContext2D) {
    t++;
    c.clearRect(0, 0, W, H); c.imageSmoothingEnabled = false;
    scroll += reduced ? 0 : 0.15;
    c.fillStyle = "#0a0f1e"; c.fillRect(0, 0, W, H);
    if (sb < 1) { sb = Math.min(1, sb + 1 / 45); drawBg(prevSeason, 1, c); }
    drawBg(curSeason, sb, c);

    const wt = (0.25 + 0.55 * Math.sin(t * 0.0035) + 0.25 * Math.sin(t * 0.011 + 1)) * SEASON[curSeason]!.wind;
    wind += (wt - wind) * 0.04;
    spawn();

    const alive: P[] = [];
    for (const p of parts) {
      p.life--;
      if (p.k === "qi") {
        const dx = cx - p.x, dy = gy - 45 - p.y, d = Math.hypot(dx, dy) + 0.01, sp = 2 + Math.max(0, 1 - d / 290) * 5;
        p.x += dx / d * sp; p.y += dy / d * sp; if (d < 14) p.life = 0;
        if (p.life > 0) { c.globalAlpha = Math.min(1, p.life / 30); c.fillStyle = color; c.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); c.globalAlpha = 1; }
      } else if (p.glow) {
        p.ph += 0.05; p.x += Math.sin(p.ph) * 0.3; p.y += Math.cos(p.ph * 0.8) * 0.2;
        const a = Math.min(1, p.life / 60) * (0.6 + 0.4 * Math.sin(p.ph * 2));
        if (ok(p.im) && p.life > 0) { c.globalAlpha = Math.max(0, a); c.drawImage(p.im, p.x - 11, p.y - 11, 22, 22); c.globalAlpha = 1; }
      } else {
        p.ph += 0.04; p.y += p.vy; p.x += wind + Math.sin(p.ph) * 0.6;
        if (p.y > gy + 6) p.life = 0;
        if (ok(p.im) && p.life > 0) { const s = p.im.naturalWidth * p.sc; c.globalAlpha = p.a; c.drawImage(p.im, Math.round(p.x), Math.round(p.y), s, s); c.globalAlpha = 1; }
      }
      if (p.life > 0) alive.push(p);
    }
    parts = alive;

    const frames = hero(world, gender).filter(ok);
    if (frames.length) {
      const f = frames[Math.floor(t / 12) % frames.length]!;
      const s = Math.min(1.25, (H * 0.66) / f.naturalHeight), w = f.naturalWidth * s, h = f.naturalHeight * s;   // sprite Tiên Giới cao hơn: co lại để không bị cắt đầu
      c.drawImage(f, Math.round(cx - w / 2), Math.round(gy + 3 - h), w, h);
    }

    rings = rings.filter(r => (r.life--) > 0);
    for (const r of rings) {
      const k = 1 - r.life / r.max;
      c.beginPath(); c.ellipse(cx, gy - 45, Math.max(0.1, 12 + k * 150), Math.max(0.1, (12 + k * 150) * 0.7), 0, 0, Math.PI * 2);
      c.strokeStyle = `rgba(255,226,122,${1 - k})`; c.lineWidth = 3; c.stroke();
    }
    if (flashT > 0) { c.fillStyle = `rgba(255,255,255,${flashT / 20})`; c.fillRect(0, 0, W, H); flashT--; }
  }

  onMount(() => {
    const c = canvas.getContext("2d")!;
    let raf = 0, last = performance.now(), acc = 0, on = true;
    const loop = (now: number) => {
      if (!on) return;
      acc += Math.min(now - last, 200); last = now;
      let n = 0;
      while (acc >= STEP && n < 3) { acc -= STEP; n++; tick(c); }
      if (acc > STEP * 3) acc = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { on = false; cancelAnimationFrame(raf); };
  });
</script>

<div class="scene-wrap" role="img" aria-label={label}>
  <canvas bind:this={canvas} class="scene-cv" width={W} height={H} aria-hidden="true"></canvas>
</div>
