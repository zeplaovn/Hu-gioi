/* HƯ GIỚI · NẠP TÀI NGUYÊN
   Nạp trước các ảnh chính (danh sách ở preload-manifest.js) và hiện tiến độ thật trên #loading.
   Tiến độ phối hợp tải ảnh và thời gian trình diễn; lỗi tải không làm kẹt màn này.
   HU_LOADER.enter dùng lại giao diện khi người chơi bắt đầu tu tiên. */
(function (root) {
  'use strict';
  const doc = root.document;
  const el = doc && doc.getElementById('loading');
  if (!el) return;

  const fill = el.querySelector('.loading-fill'), pctEl = el.querySelector('.loading-pct');
  const tipEl = el.querySelector('.loading-tip'), track = el.querySelector('.loading-track');
  const list = Array.isArray(root.HU_PRELOAD) ? root.HU_PRELOAD.slice() : [];
  const MIN_MS = 10900, MAX_MS = 30000, POOL = 6;
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

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Mỗi lần vào game dùng một lớp riêng: timer của lần tải trang không thể đóng nhầm lớp này.
  async function enter(urls, start) {
    const screen = el.cloneNode(true), startedAt = Date.now();
    const previousFocus = doc.activeElement;
    const panels = ['welcome', 'game'].map(id => doc.getElementById(id)).filter(Boolean);
    const inert = panels.map(panel => panel.inert);
    screen.id = 'gameLoading';
    screen.classList.remove('done');
    screen.classList.add('scene-ready');
    screen.setAttribute('aria-busy', 'true');
    screen.setAttribute('aria-label', 'Đang bước vào Hư Giới');
    screen.tabIndex = -1;
    screen.addEventListener('keydown', event => {
      if (event.key === 'Tab') event.preventDefault();
      event.stopPropagation();
    });
    screen.querySelector('.loading-row span').textContent = 'Đang bước vào Hư Giới';
    const fill = screen.querySelector('.loading-fill'), pct = screen.querySelector('.loading-pct');
    const track = screen.querySelector('.loading-track'), tip = screen.querySelector('.loading-tip');
    track.setAttribute('aria-label', 'Tiến độ chuẩn bị hành trình');
    tip.setAttribute('role', 'status');
    let targetProgress = 0, tipText = '', entryProgress = 0;
    const paintEntry = () => {
      const p = entryProgress = Math.max(entryProgress, Math.min(targetProgress, (Date.now() - startedAt) / MIN_MS));
      fill.style.transform = 'scaleX(' + p + ')';
      pct.textContent = Math.round(p * 100) + '%';
      track.setAttribute('aria-valuenow', String(Math.round(p * 100)));
      tip.textContent = tipText;
    };
    const update = (p, text) => { targetProgress = p; tipText = text; paintEntry(); };
    const entryTimer = setInterval(paintEntry, 50);
    update(0, 'Chuẩn bị hành trình tu tiên…');
    doc.body.appendChild(screen);
    doc.body.classList.add('loading-game');
    panels.forEach(panel => { panel.inert = true; });
    screen.focus({ preventScroll: true });
    try {
      // Cho trình duyệt vẽ màn loading trước các bước khởi tạo đồng bộ.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const images = [...new Set(urls)];
      let loaded = 0;
      update(.1, 'Dệt tiên cảnh, triệu hồi đạo thân…');
      await Promise.all(images.map(url => new Promise(resolve => {
        const image = new Image();
        let settled = false;
        const end = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          image.onload = image.onerror = null;
          update(.1 + .7 * ++loaded / images.length, 'Dệt tiên cảnh, triệu hồi đạo thân…');
          resolve();
        };
        const timer = setTimeout(end, MAX_MS);
        image.onload = () => image.decode ? image.decode().catch(() => {}).then(end) : end();
        image.onerror = end;
        image.decoding = 'async';
        image.src = url;
      })));
      update(.85, 'Khai mở linh căn, chuẩn bị nhập định…');
      await start();
      await delay(Math.max(0, MIN_MS - (Date.now() - startedAt)));
      update(1, 'Tiên lộ đã mở, bắt đầu tu luyện!');
      await delay(200);
    } finally {
      clearInterval(entryTimer);
      screen.setAttribute('aria-busy', 'false');
      screen.classList.add('done');
      await delay(550);
      screen.remove();
      doc.body.classList.remove('loading-game');
      panels.forEach((panel, i) => { panel.inert = inert[i] || (panel.id === 'welcome' && !!root.HU_UI?.intro?.active); });
      if (previousFocus?.isConnected && previousFocus.getClientRects().length) previousFocus.focus({ preventScroll: true });
    }
  }
  root.HU_LOADER = { enter };

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
    clearInterval(progressTimer);
    clearTimeout(deadline);
    paint(1);
    el.setAttribute('aria-busy', 'false');
    el.classList.add('done');
    root.dispatchEvent(new Event('hu:loaded'));
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); keep.length = 0; }, 800);
  }

  // Cảnh nền chỉ hiện khi đã tải xong, tránh nháy một khung hình đen.
  const bg = new Image();
  bg.onload = bg.onerror = () => el.classList.add('scene-ready');
  bg.src = 'media/assets/world/bg/ha_gioi/day/xuan.webp';

  function loadOne(url) {
    return new Promise(resolve => {
      const img = new Image();
      const end = () => { done++; resolve(); };
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
  const progressTimer = setInterval(() => {
    shown = Math.max(shown, Math.min(done / Math.max(1, list.length), now() / MIN_MS));
    paint(shown);
  }, 50);
  const deadline = setTimeout(finish, MAX_MS);
  run().catch(finish);
})(typeof window !== 'undefined' ? window : globalThis);
