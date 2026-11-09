/* HƯ GIỚI · NẠP TÀI NGUYÊN
 * Tiến độ tài nguyên đo theo xử lý thực; 100% chỉ khi engine sẵn sàng
 * và người chơi đã xem đủ 8 mẹo, mỗi mẹo 3,2 giây. Hỗ trợ file://. */
(function (root) {
  'use strict';
  const doc = root.document, el = doc?.getElementById('loading');
  if (!el) return;
  const fill = el.querySelector('.loading-fill'), pct = el.querySelector('.loading-pct');
  const track = el.querySelector('.loading-track'), tip = el.querySelector('.loading-tip');
  const list = [...new Set([
    ...(Array.isArray(root.HU_PRELOAD) ? root.HU_PRELOAD : []),
    'media/assets/world/bg/ha_gioi/day/xuan.webp',
    'media/assets/world/bg/logo.webp'
  ].filter(Boolean))];
  const POOL = 6, IMAGE_TIMEOUT = 12000, ENGINE_TIMEOUT = 30000;
  let completed = 0, failures = 0, assetsReady = false, engine = 'pending', finished = false;
  const retained = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  // Tiến độ đo xử lý thật. Mỗi mẹo được hiển thị trọn 3,2 giây trước khi hoàn tất.
  const HINTS = [
    'Ma thú về đêm mạnh và nguy hiểm hơn. Hãy chuẩn bị kỹ trước khi lịch luyện sau khi trời tối.',
    'Hãy dùng đan dược để nâng cảnh giới khi tu vi tiến chậm.',
    'Tu vi đầy ở viên mãn: bấm đột phá thủ công, cảnh giới lớn có thể gặp thiên kiếp.',
    'Thọ nguyên cạn là hết đường tu. Đừng quên đan trường sinh và bế quan định kỳ.',
    'Linh căn càng thuần, tốc độ tu luyện càng cao. Tạp chất tích tụ sẽ làm chậm tu vi.',
    'Nghề phụ vẫn chạy khi bạn offline. Quay lại để nhận thành quả.',
    'Linh khí mùa xuân dồi dào hơn; mùa đông tu luyện chậm lại.',
    'Trang bị phẩm chất cao giúp sống sót qua các trận lịch luyện khó.'
  ];
  let hintIndex = Math.floor(Math.random() * HINTS.length);
  const nextHint = () => HINTS[hintIndex++ % HINTS.length];
  const rotateHints = (element, onComplete) => {
    let shown = 1;
    element.textContent = nextHint();
    const timer = setInterval(() => {
      if (shown === HINTS.length) {
        clearInterval(timer);
        onComplete?.();
        return;
      }
      element.textContent = nextHint();
      shown++;
    }, 3200);
    return () => clearInterval(timer);
  };
  let hintsComplete = false;
  const stopInitialHints = rotateHints(tip, () => { hintsComplete = true; check(); });
  // Hàng phía trên thanh là thông tin nạp thật; dòng dưới dành riêng cho mẹo.
  const phaseLabel = el.querySelector('.loading-row span');

  function draw(bar, number, meter, ratio, label) {
    const p = Math.max(0, Math.min(1, ratio)), n = Math.round(p * 100);
    bar.style.transform = 'scaleX(' + p + ')';
    number.textContent = n + '%';
    meter.setAttribute('aria-valuenow', String(n));
    meter.setAttribute('aria-valuetext', label);
  }
  function preloadImage(url, keep) {
    return new Promise(resolve => {
      const img = new Image();
      let settled = false;
      const end = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        img.onload = img.onerror = null;
        resolve(!!ok);
      };
      const timeout = setTimeout(() => end(false), IMAGE_TIMEOUT);
      img.decoding = 'async';
      img.onload = () => {
        if (typeof img.decode === 'function') img.decode().then(() => end(true), () => end(false));
        else end(true);
      };
      img.onerror = () => end(false);
      keep?.push(img);
      img.src = url;
    });
  }
  async function preloadBatch(urls, progress, hold) {
    const queue = [...new Set((Array.isArray(urls) ? urls : []).filter(Boolean))];
    const total = queue.length;
    let count = 0, failed = 0;
    const worker = async () => {
      while (queue.length) {
        const url = queue.shift();
        const ok = await preloadImage(url, hold);
        count++;
        if (!ok) failed++;
        progress?.({ count, total, failed, url, ok });
      }
    };
    await Promise.all(Array.from({ length: Math.min(POOL, total) }, worker));
    return { count, total, failed };
  }
  function paint() {
    const progress = (list.length ? completed / list.length : 1) * 0.88
      + (engine === 'ready' ? 0.11 : 0)
      + (hintsComplete && assetsReady && engine === 'ready' ? 0.01 : 0);
    const label = !assetsReady
      ? 'Đang tải tài nguyên · ' + completed + '/' + list.length + (failures ? ' · ' + failures + ' tài nguyên lỗi' : '')
      : engine === 'pending' ? 'Đã tải tài nguyên · đang khởi tạo engine…'
        : engine === 'failed' ? 'Engine không thể khởi tạo.'
          : !hintsComplete ? 'Đã tải tài nguyên · đang hiển thị các mẹo chơi…'
            : failures ? 'Sẵn sàng · ' + failures + ' tài nguyên lỗi, dùng dự phòng.' : 'Đã sẵn sàng.';
    draw(fill, pct, track, progress, label);
    if (phaseLabel) phaseLabel.textContent = label;
  }
  function finish(failed = false) {
    if (finished) return;
    finished = true;
    stopInitialHints();
    clearTimeout(engineDeadline);
    if (phaseLabel) phaseLabel.textContent = failed ? 'Engine chưa sẵn sàng' : 'Hoàn tất chuẩn bị';
    if (!failed) {
      draw(fill, pct, track, 1, 'Tài nguyên và engine đã sẵn sàng');
      tip.textContent = failures ? 'Đã sẵn sàng · ' + failures + ' tài nguyên dùng dự phòng.' : 'Hoàn tất chuẩn bị.';
    }
    el.setAttribute('aria-busy', 'false');
    el.classList.add('done');
    if (failed) {
      const note = doc.getElementById('engineNotice');
      if (note) {
        note.hidden = false;
        note.textContent = 'Không thể khởi tạo engine. Hãy kiểm tra tập tin trò chơi và tải lại trang.';
      }
    } else root.dispatchEvent(new Event('hu:loaded'));
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      retained.length = 0;
    }, 400);
  }
  function check() {
    paint();
    if (engine === 'failed') finish(true);
    else if (assetsReady && engine === 'ready' && hintsComplete) finish();
  }
  function engineReady(result = {}) {
    if (engine !== 'pending' || finished) return;
    engine = result.ready ? 'ready' : 'failed';
    check();
  }
  const engineDeadline = setTimeout(() => {
    if (engine === 'pending') engineReady({ ready: false });
  }, ENGINE_TIMEOUT);
  root.HU_LOADER = {
    engineReady, enter,
    get status() { return { assetsDone: completed, assetsTotal: list.length, assetsFailed: failures, assetsReady, engine, finished }; }
  };

  const bg = new Image();
  bg.onload = () => el.classList.add('scene-ready');
  bg.onerror = () => {};
  bg.src = 'media/assets/world/bg/ha_gioi/day/xuan.webp';
  paint();
  preloadBatch(list, ({ count, failed }) => {
    completed = count;
    failures = failed;
    paint();
  }, retained).then(({ count, failed }) => {
    completed = count; failures = failed; assetsReady = true; check();
  }).catch(() => { assetsReady = true; engine = 'failed'; check(); });

  // Khi tạo nhân vật: tải tài nguyên, xác thực engine, chờ đủ 8 mẹo rồi mới đạt 100%.
  async function enter(urls, start) {
    const screen = el.cloneNode(true);
    const focusBefore = doc.activeElement;
    const panels = ['welcome', 'game'].map(id => doc.getElementById(id)).filter(Boolean);
    const prevInert = panels.map(p => p.inert);
    screen.id = 'gameLoading';
    screen.classList.remove('done');
    screen.classList.add('scene-ready');
    screen.setAttribute('aria-busy', 'true');
    screen.setAttribute('aria-label', 'Đang bước vào Hư Giới');
    screen.tabIndex = -1;
    screen.addEventListener('keydown', e => {
      if (e.key === 'Tab') e.preventDefault();
      e.stopPropagation();
    });
    const entryLabel = screen.querySelector('.loading-row span');
    entryLabel.textContent = 'Đang tải tài nguyên';
    const bar = screen.querySelector('.loading-fill');
    const number = screen.querySelector('.loading-pct');
    const meter = screen.querySelector('.loading-track');
    const status = screen.querySelector('.loading-tip');
    meter.setAttribute('aria-label', 'Tiến độ chuẩn bị nhân vật');
    const hint = doc.createElement('p');
    hint.className = 'loading-hint';
    status.after(hint);
    let resolveHints;
    const hintsReady = new Promise(resolve => { resolveHints = resolve; });
    const stopEntryHints = rotateHints(hint, resolveHints);
    draw(bar, number, meter, 0, 'Đang tải tài nguyên');
    status.textContent = 'Đang tải tài nguyên…';
    doc.body.appendChild(screen);
    doc.body.classList.add('loading-game');
    panels.forEach(p => { p.inert = true; });
    screen.focus({ preventScroll: true });
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const result = await preloadBatch(urls, ({ count, total, failed }) => {
        draw(bar, number, meter, 0.88 * (total ? count / total : 1), 'Đang tải tài nguyên · ' + count + '/' + total);
        status.textContent = 'Đang tải tài nguyên · ' + count + '/' + total + (failed ? ' · ' + failed + ' tài nguyên lỗi' : '');
      });
      draw(bar, number, meter, 0.88, 'Tải tài nguyên hoàn tất · đang xác thực engine');
      status.textContent = 'Tài nguyên đã tải xong · đang xác thực engine…';
      if (typeof start === 'function') await start(result);
      draw(bar, number, meter, 0.99, 'Đã tải tài nguyên và khởi tạo engine · đang hiển thị mẹo chơi');
      entryLabel.textContent = 'Đã tải tài nguyên · đang hiển thị mẹo chơi…';
      status.textContent = 'Các mẹo chơi sẽ hiển thị đủ trước khi vào game.';
      await hintsReady;
      draw(bar, number, meter, 1, 'Tài nguyên, engine và các mẹo chơi đã hoàn tất');
      status.textContent = result.failed ? 'Sẵn sàng · ' + result.failed + ' tài nguyên dùng dự phòng.' : 'Đã sẵn sàng.';
    } finally {
      stopEntryHints();
      screen.setAttribute('aria-busy', 'false');
      screen.classList.add('done');
      await delay(180);
      screen.remove();
      doc.body.classList.remove('loading-game');
      panels.forEach((p, i) => { p.inert = prevInert[i] || (p.id === 'welcome' && !!root.HU_UI?.intro?.active); });
      if (focusBefore?.isConnected && focusBefore.getClientRects().length) focusBefore.focus({ preventScroll: true });
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
