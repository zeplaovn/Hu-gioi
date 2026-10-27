/* HƯ GIỚI · NẠP TÀI NGUYÊN
   Nạp trước các ảnh chính (danh sách ở preload-manifest.js) và hiện tiến độ thật trên #loading.
   Nạp xong thì mờ dần màn loading; mọi lỗi tải đều được bỏ qua để không kẹt ở màn này. */
(function (root) {
  'use strict';
  const doc = root.document;
  const el = doc && doc.getElementById('loading');
  if (!el) return;

  const fill = el.querySelector('.loading-fill'), pctEl = el.querySelector('.loading-pct');
  const tipEl = el.querySelector('.loading-tip'), track = el.querySelector('.loading-track');
  const list = Array.isArray(root.HU_PRELOAD) ? root.HU_PRELOAD.slice() : [];
  const MIN_MS = 900, MAX_MS = 20000, POOL = 6;
  const TIPS = [
    [0, 'Triệu hồi linh khí…'],
    [30, 'Dệt cảnh giới Hạ Giới…'],
    [65, 'Mài giũa pháp bảo…'],
    [92, 'Mở cửa Hư Giới…']
  ];
  const started = (root.performance && performance.now()) || Date.now();
  const now = () => ((root.performance && performance.now()) || Date.now()) - started;
  let done = 0, shown = 0, finished = false;
  const keep = [];   // giữ tham chiếu để ảnh không bị thu hồi trước khi vào bộ nhớ đệm

  function paint(p) {
    p = Math.max(0, Math.min(1, p));
    if (fill) fill.style.transform = 'scaleX(' + p + ')';
    const n = Math.round(p * 100);
    if (pctEl) pctEl.textContent = n + '%';
    if (track) track.setAttribute('aria-valuenow', String(n));
    if (tipEl) { let t = TIPS[0][1]; TIPS.forEach(([from, text]) => { if (n >= from) t = text; }); if (tipEl.textContent !== t) tipEl.textContent = t; }
  }

  function finish() {
    if (finished) return;
    finished = true;
    paint(1);
    el.setAttribute('aria-busy', 'false');
    el.classList.add('done');
    root.dispatchEvent(new Event('hu:loaded'));
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); keep.length = 0; }, 800);
  }

  // Cảnh nền chỉ hiện khi đã tải xong, tránh nháy một khung hình đen.
  const bg = new Image();
  bg.onload = bg.onerror = () => el.classList.add('scene-ready');
  bg.src = 'media/assets/world/bg/idle_ha_gioi.webp';

  function loadOne(url) {
    return new Promise(resolve => {
      const img = new Image();
      const end = () => { done++; paint(done / Math.max(1, list.length)); resolve(); };
      img.onload = img.onerror = end;
      img.decoding = 'async';
      img.src = url;
      keep.push(img);
    });
  }

  async function run() {
    paint(0);
    const queue = list.slice();
    await Promise.all(Array.from({ length: Math.min(POOL, queue.length) }, async () => {
      while (queue.length) await loadOne(queue.shift());
    }));
    // Giữ màn loading đủ lâu để logo kịp đọc, kể cả khi mọi thứ đã nằm trong bộ nhớ đệm.
    const wait = MIN_MS - now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    finish();
  }

  // Chốt an toàn: mạng chậm hoặc treo cũng không giữ người chơi ở màn loading quá lâu.
  setTimeout(finish, MAX_MS);
  run().catch(finish);
})(typeof window !== 'undefined' ? window : globalThis);
