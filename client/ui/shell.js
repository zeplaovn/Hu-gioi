/* HƯ GIỚI · KHUNG ỨNG DỤNG
 * Bố cục ba vùng theo skeleton: trạng thái · sân khấu · menu, cùng cửa sổ nổi.
 * Bộ định tuyến, toast/modal, hiệu ứng nền, độ kiếp đài, vòng lặp 1 giây và vòng lặp hình ảnh. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  const UI = root.HU_UI;
  const { $, $$, esc, clamp, num, money, moneyHTML, pct, duration, btn } = UI.kit;
  const store = UI.store;

  let modalAction = null, modalFocus = null, modalBusy = false;
  let lastFrameTime = 0, frameCount = 0, zTop = 1;
  let lastStageMode = '', lastIdleVfx = 0, lastDocTitle = '';
  let heroAttackUntil = 0, heroAttackFrame = 0;

  const motionQuery = typeof root.matchMedia === 'function' ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const isReduced = () => {
    const m = UI.s().settings.motionMode;
    return m === 'reduced' || (m === 'auto' && !!motionQuery?.matches);
  };

  /* ======================================================================
     TOAST / MODAL
     ====================================================================== */
  const TOAST_MAX = 4;
  const TOAST_ICON = { info: '✦', success: '✓', danger: '!', gold: '✧', loot: '◈', tribulation: '⚡' };
  const TOAST_TITLE = { info: 'Thiên mệnh', success: 'Thành công', danger: 'Cảnh báo', gold: 'Cơ duyên', loot: 'Thu hoạch', tribulation: 'Thiên kiếp' };
  const toastState = { queue: [], active: 0 };

  function classifyToast(message) {
    if (/thất bại|không thể|không đủ|chưa đủ|lỗi|hỏng|đang mở|quá mạnh|chưa mở|không có/i.test(message)) return 'danger';
    if (/thiên kiếp|lôi kiếp|độ kiếp|đột phá|trọng sinh|phi thăng/i.test(message)) return 'tribulation';
    if (/nhận|mua|thu hoạch|yêu đan|cơ duyên|rơi|phần thưởng/i.test(message)) return 'loot';
    if (/thành công|đã |nâng|may mắn|hoàn tất|chúc mừng/i.test(message)) return 'success';
    return 'info';
  }

  function toast(message, opts = {}) {
    const text = String(message ?? '').trim();
    if (!text) return;
    const type = opts.type || classifyToast(text);
    toastState.queue.push({ ...opts, message: text, type });
    if (logState.live) queueLog(text, { type, source: 'toast' });
    if (toastState.queue.length > 12) {
      const extra = toastState.queue.splice(10);
      const count = extra.reduce((n, item) => n + (item.collapsed || 1), 0);
      toastState.queue.push({ message: `+${count} thông báo khác`, collapsed: count, type: 'info', title: 'Thiên mệnh', duration: 2600 });
    }
    drainToasts();
  }

  function drainToasts() {
    while (toastState.active < TOAST_MAX && toastState.queue.length) showToast(toastState.queue.shift());
  }

  function showToast(data) {
    const root = $('toast');
    if (!root) return;
    const type = TOAST_ICON[data.type] ? data.type : 'info';
    const item = document.createElement('div');
    item.className = 'toast-item toast-' + type;
    item.innerHTML = '<span class="toast-icon" aria-hidden="true">' + esc(data.icon || TOAST_ICON[type] || '✦') + '</span>' +
      '<div class="toast-copy">' + (data.title === false ? '' : '<b>' + esc(data.title || TOAST_TITLE[type] || 'Thông báo') + '</b>') +
      '<p>' + esc(data.message) + '</p></div>' +
      '<button type="button" class="toast-close" aria-label="Đóng thông báo">✕</button>' +
      '<i class="toast-life" aria-hidden="true"></i>';
    root.append(item);
    toastState.active++;
    const life = Math.max(1200, Number(data.duration) || (type === 'danger' ? 5200 : 3800));
    item.style.setProperty('--toast-life', life + 'ms');
    requestAnimationFrame(() => item.classList.add('show'));
    let timer = 0, remaining = life, started = Date.now();
    const paused = new Set();
    const close = () => {
      if (!item.isConnected || item.classList.contains('out')) return;
      clearTimeout(timer);
      item.classList.add('out');
      item.classList.remove('show');
      if (item.contains(document.activeElement)) {
        const next = item.nextElementSibling || item.previousElementSibling;
        const fallback = !$('modalLayer').hidden ? $('modalButtons').querySelector('button') : trib.pageOpen ? $('tribBack') : $('stage');
        (next?.querySelector('button') || fallback)?.focus({ preventScroll: true });
      }
      setTimeout(() => {
        item.remove();
        toastState.active = Math.max(0, toastState.active - 1);
        drainToasts();
      }, 220);
    };
    const arm = () => {
      if (paused.size || item.classList.contains('out')) return;
      started = Date.now();
      clearTimeout(timer);
      timer = setTimeout(close, Math.max(0, remaining));
    };
    const pause = reason => {
      if (!paused.size) {
        clearTimeout(timer);
        remaining = Math.max(0, remaining - (Date.now() - started));
      }
      paused.add(reason);
      item.classList.add('paused');
    };
    const resume = reason => {
      paused.delete(reason);
      if (!paused.size) { item.classList.remove('paused'); arm(); }
    };
    item.addEventListener('mouseenter', () => pause('hover'));
    item.addEventListener('mouseleave', () => resume('hover'));
    item.addEventListener('focusin', () => pause('focus'));
    item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) resume('focus'); });
    item.querySelector('.toast-close').addEventListener('click', e => { e.stopPropagation(); close(); });
    item.addEventListener('click', close);
    arm();
  }

  /* ======================================================================
     NHẬT KÝ THÔNG BÁO
     ====================================================================== */
  const LOG_MAX = 60, LOG_KEY = 'huGioiLogCollapsed';
  const LOG_TAG = { tribulation: 'KIẾP', danger: 'NGUY', loot: 'THU', success: 'THÀNH', gold: 'DUYÊN', info: 'TIN' };
  const logState = {
    live: false, bound: false, owner: null, queue: [], current: null, timer: 0,
    follow: true, unseen: 0, count: 0, collapsed: false,
    engineRecent: new Map(), toastRecent: new Map(), lastPrune: 0
  };

  function classifyLog(text) {
    if (/thất bại|trọng thương|tổn hại|không đủ|chưa đủ|rút lui|lỗi|hỏng|nguy hiểm/i.test(text)) return 'danger';
    if (/thiên kiếp|lôi kiếp|độ kiếp|đột phá|trọng sinh|chứng đạo|phi thăng/i.test(text)) return 'tribulation';
    if (/nhận|mua|thu hoạch|luyện thành|rơi|phần thưởng|cống hiến|đấu giá|kỳ ngộ/i.test(text)) return 'loot';
    if (/thành công|hoàn thành|nâng|thăng|kết giao|tặng|thắng|đã /i.test(text)) return 'success';
    return 'info';
  }

  const logKey = text => String(text).toLowerCase().replace(/\s+/g, ' ').replace(/[.!…]+$/g, '').trim();
  const logClock = at => new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  function pruneLogKeys(now) {
    if (now - logState.lastPrune < 12000) return;
    logState.lastPrune = now;
    for (const map of [logState.engineRecent, logState.toastRecent]) {
      for (const [key, at] of map) if (now - at > 12000) map.delete(key);
    }
  }

  function appendLogEntry(item) {
    const feed = $('logFeed');
    if (!feed) return null;
    const el = document.createElement('div');
    el.className = 'log-entry ' + item.type;
    const tag = document.createElement('span');
    tag.className = 'log-tag';
    tag.textContent = LOG_TAG[item.type] || LOG_TAG.info;
    el.append(tag);
    if (item.at) {
      const time = document.createElement('time');
      time.className = 'log-time';
      time.dateTime = new Date(item.at).toISOString();
      time.textContent = logClock(item.at);
      el.append(time);
    }
    const text = document.createElement('span');
    text.className = 'log-text';
    el.append(text);
    feed.append(el);
    while (feed.childElementCount > LOG_MAX) feed.firstElementChild.remove();
    logState.count = feed.childElementCount;
    if (logState.follow) {
      feed.scrollTop = feed.scrollHeight;
    } else {
      logState.unseen++;
    }
    updateLogChrome();
    return { el, textEl: text, full: item.text, i: 0 };
  }

  function updateLogChrome() {
    const count = $('logCount'), jump = $('logJump');
    if (count) {
      count.textContent = logState.unseen > 0 ? '+' + logState.unseen : String(logState.count);
      count.classList.toggle('has-new', logState.unseen > 0);
      count.setAttribute('aria-label', logState.unseen > 0 ? logState.unseen + ' tin mới' : logState.count + ' tin trong nhật ký');
    }
    if (jump) jump.hidden = !(logState.unseen > 0 && !logState.follow);
  }

  function setLogCollapsed(collapsed, persist = true) {
    const panel = $('logPanel'), btn = $('logToggle');
    logState.collapsed = !!collapsed;
    if (panel) panel.classList.toggle('collapsed', logState.collapsed);
    document.body.classList.toggle('log-collapsed', logState.collapsed);
    if (btn) {
      btn.setAttribute('aria-expanded', String(!logState.collapsed));
      btn.setAttribute('aria-label', logState.collapsed ? 'Mở rộng nhật ký' : 'Thu gọn nhật ký');
      btn.title = logState.collapsed ? 'Mở rộng nhật ký' : 'Thu gọn nhật ký';
    }
    if (!logState.collapsed) {
      logState.follow = true;
      logState.unseen = 0;
      const feed = $('logFeed');
      if (feed) feed.scrollTop = feed.scrollHeight;
    }
    updateLogChrome();
    if (persist) try { localStorage.setItem(LOG_KEY, logState.collapsed ? '1' : '0'); } catch { /* bỏ qua */ }
  }

  function pumpLog(force = false) {
    if (!logState.live) return;
    const feed = $('logFeed');
    if (!feed) return;
    const reduced = isReduced();
    let budget = reduced ? Infinity : (force ? 4 : 2 + logState.queue.length * 3);
    while (budget > 0) {
      if (!logState.current) {
        if (!logState.queue.length) break;
        logState.current = appendLogEntry(logState.queue.shift());
        if (!logState.current) break;
      }
      const cur = logState.current;
      const take = Math.min(budget, cur.full.length - cur.i);
      cur.textEl.textContent += cur.full.slice(cur.i, cur.i + take);
      cur.i += take;
      budget -= take;
      if (cur.i >= cur.full.length) {
        logState.current = null;
        if (logState.follow) feed.scrollTop = feed.scrollHeight;
      }
    }
    if (logState.follow) feed.scrollTop = feed.scrollHeight;
  }

  function queueLog(message, opts = {}) {
    const text = String(message ?? '').trim();
    if (!text) return;
    const now = Date.now();
    pruneLogKeys(now);
    const key = logKey(text);
    const source = opts.source || 'engine';
    /* Toast và log engine thường kể cùng một việc. Giữ bản đến trước, bỏ bản trùng trong 4 giây. */
    if (source === 'toast') {
      const hit = logState.engineRecent.get(key);
      if (hit && now - hit < 4000) return;
      logState.toastRecent.set(key, now);
    } else {
      const hit = logState.toastRecent.get(key);
      if (hit && now - hit < 4000) { logState.toastRecent.delete(key); return; }
      logState.engineRecent.set(key, now);
    }
    const type = LOG_TAG[opts.type] ? opts.type : classifyLog(text);
    logState.queue.push({ text: text.slice(0, 240), type, at: now });
    if (logState.queue.length > 30) logState.queue.splice(0, logState.queue.length - 30);
    pumpLog(true);
  }

  function seedLogFeed(logs) {
    const feed = $('logFeed');
    if (!feed) return;
    feed.innerHTML = '';
    logState.queue = [];
    logState.current = null;
    logState.count = 0;
    logState.unseen = 0;
    logState.follow = true;
    const list = Array.isArray(logs) ? logs.slice(0, 38).reverse() : [];
    for (const text of list) {
      const item = appendLogEntry({ text: String(text).slice(0, 240), type: classifyLog(String(text)), at: null });
      if (item) {
        item.textEl.textContent = item.full;
        item.i = item.full.length;
      }
    }
    feed.scrollTop = feed.scrollHeight;
    updateLogChrome();
  }

  function buildLog() {
    const feed = $('logFeed');
    if (!feed) return;
    logState.owner = UI.s();
    logState.live = true;
    seedLogFeed(UI.s().logs);
    if (!logState.bound) {
      logState.bound = true;
      feed.addEventListener('scroll', () => {
        const near = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 28;
        logState.follow = near;
        if (near) logState.unseen = 0;
        updateLogChrome();
      }, { passive: true });
      $('logToggle')?.addEventListener('click', () => setLogCollapsed(!logState.collapsed));
      $('logJump')?.addEventListener('click', () => {
        logState.follow = true;
        logState.unseen = 0;
        feed.scrollTop = feed.scrollHeight;
        updateLogChrome();
        try { feed.focus({ preventScroll: true }); } catch { /* bỏ qua */ }
      });
    }
    try { logState.collapsed = localStorage.getItem(LOG_KEY) === '1'; } catch { logState.collapsed = false; }
    setLogCollapsed(logState.collapsed, false);
    if (!logState.timer) logState.timer = root.setInterval(pumpLog, 24);
  }

  function syncLogOwner() {
    if (!logState.live) return;
    const s = UI.s();
    if (logState.owner !== s) {
      logState.owner = s;
      seedLogFeed(s.logs);
      setLogCollapsed(logState.collapsed, false);
    }
  }

  /* Theo dõi đúng phiên chơi, không sửa prototype của luật dùng chung. */
  UI.session.subscribe(event => {
    if (event.type === 'log' && logState.live && UI.s() === logState.owner) queueLog(event.message, { source: 'engine' });
  });

  function modal(title, html, onConfirm = null, label = 'Tiếp tục', eyebrow = 'THIÊN MỆNH', opts = {}) {
    modalAction = onConfirm;
    modalBusy = !!opts.busy;
    if ($('modalLayer').hidden) modalFocus = document.activeElement;
    const type = opts.type || 'info';
    const layer = $('modalLayer');
    layer.dataset.type = type;
    layer.classList.toggle('is-busy', modalBusy);
    layer.querySelector('.game-modal').dataset.type = type;
    layer.querySelector('.game-modal').classList.toggle('is-busy', modalBusy);
    layer.querySelector('.game-modal').setAttribute('aria-busy', String(modalBusy));
    $('modalEyebrow').textContent = eyebrow;
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML = html;
    $('modalSymbol').textContent = opts.symbol || ({ success: '✦', danger: '⚠', gold: '✧', info: '✧' }[type] || '✦');
    $('modalButtons').innerHTML = modalBusy ? '' : btn(label, 'modalConfirm', '', false, type === 'danger' ? 'btn-danger' : 'btn-gold') +
      (onConfirm ? btn('Hủy', 'modalClose', '', false, 'btn-outline') : '');
    layer.querySelector('.modal-x').hidden = modalBusy;
    layer.hidden = false;
    hideItemTip();
    document.body.classList.add('modal-open');
    ['game', 'tribulationFx', 'welcome'].forEach(id => { $(id).inert = true; });
    UI.vfx?.clear('#modalVfx');
    if (opts.vfx !== false) {
      const fx = opts.vfx || (type === 'success' ? ['chien_dau', 'phi_thang']
        : type === 'danger' ? ['loi_kiep', 'ha_gioi']
          : type === 'gold' ? ['chien_dau', 'linh_phu'] : null);
      if (fx) UI.vfx?.play('#modalVfx', { kind: fx[0], variant: fx[1], fps: 10, loop: true, className: 'modal-vfx-sprite' });
    }
    if (!modalBusy) $('modalButtons').querySelector(type === 'danger' && onConfirm ? '[data-act="modalClose"]' : 'button')?.focus();
    else layer.querySelector('.game-modal').focus?.({ preventScroll: true });
  }

  function closeModal(force = false) {
    if (modalBusy && !force) return;
    modalBusy = false;
    const layer = $('modalLayer');
    layer.hidden = true;
    layer.removeAttribute('data-type');
    layer.classList.remove('is-busy');
    const card = layer.querySelector('.game-modal');
    card.removeAttribute('data-type');
    card.classList.remove('is-busy');
    card.removeAttribute('aria-busy');
    layer.querySelector('.modal-x').hidden = false;
    document.body.classList.remove('modal-open');
    ['game', 'tribulationFx', 'welcome'].forEach(id => { $(id).inert = false; });
    UI.vfx?.clear('#modalVfx');
    modalAction = null;
    const target = modalFocus?.isConnected && !modalFocus.matches(':disabled') && modalFocus.getClientRects().length ? modalFocus : trib.pageOpen ? $('tribBack') : $('stage');
    try { target?.focus?.({ preventScroll: true }); } catch { /* bỏ qua */ }
    modalFocus = null;
  }

  /* ======================================================================
     ĐỊNH TUYẾN
     ====================================================================== */
  const tabOf = def => {
    if (!def?.tabs) return '';
    const wanted = UI.tabState[def.id];
    return def.tabs.some(t => t.id === wanted) ? wanted : def.tabs[0].id;
  };

  function resetFilters() {
    Object.assign(UI.view, { category: 'Tất cả', query: '', page: 0, quality: 0, selected: '', onlyReady: false });
  }

  /* ======================================================================
     BỐ CỤC THEO TỈ LỆ KHUNG
     ====================================================================== */
  function pickLayout() {
    const w = root.innerWidth || document.documentElement.clientWidth || 0;
    const h = root.innerHeight || document.documentElement.clientHeight || 1;
    const a = w / h;
    return a < 0.85 ? 'portrait' : (a >= 1.5 && (w >= 1100 || (w >= 700 && h <= 520))) ? 'wide' : 'landscape';
  }

  function applyLayout() {
    const el = $('game');
    if (!el) return;
    const layout = pickLayout();
    document.body.dataset.layout = layout;
    if (el.dataset.layout !== layout) {
      el.dataset.layout = layout;
      wins.relayout();
    } else {
      wins.fit();
    }
  }

  /* ======================================================================
     CỬA SỔ NỔI
     ====================================================================== */
  const WINDOW_ORDER = ['idle', 'combat', 'craft', 'character', 'world', 'settings'];
  const WINDOW_SIZE = { idle: 470, combat: 590, craft: 700, character: 670, world: 740, settings: 580, meta: 760, more: 660 };
  const BADGED = ['combat', 'craft'];

  const wins = {
    map: new Map(),
    has(id) { return this.map.has(id); },
    key(id) { return 'huGioiWin:' + ($('game')?.dataset.layout || 'wide') + ':' + id; },
    topId() {
      let top = null, z = -1;
      this.map.forEach((w, id) => { const n = +w.el.style.zIndex || 0; if (n >= z) { z = n; top = id; } });
      return top;
    },
    open(id) {
      if (id === 'tribulation') { go('tribulation'); return null; }
      const def = UI.screens[id];
      if (!def) return null;
      closeMoreMenu();
      if (this.map.has(id)) {
        const w = this.map.get(id);
        if (w.tab !== tabOf(def)) this.render(id);
        this.focus(id); return w.el;
      }
      this.closeOthers(id);
      const el = document.createElement('section');
      el.className = 'win';
      el.dataset.window = id;
      el.tabIndex = -1;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', def.label);
      const icon = def.icon && /^ICON-/.test(def.icon)
        ? '<img src="media/assets/ui/icon/menu/' + esc(def.icon) + '-40.png" alt="" decoding="async">'
        : '<span aria-hidden="true">' + esc(def.icon || '◈') + '</span>';
      el.innerHTML = '<header><b>' + icon + '<span>' + esc(def.label) + '</span></b><button class="win-close" type="button" aria-label="Đóng">✕</button></header><div class="win-body"></div><div class="rz" aria-hidden="true"></div>';
      $('wins').appendChild(el);
      const rect = this.clampRect(this.loadRect(id) || this.defaultRect(id));
      this.setRect(el, rect);
      this.map.set(id, { el, body: el.querySelector('.win-body'), rect, def, sig: '' });
      el.addEventListener('pointerdown', () => this.focus(id), true);
      el.querySelector('.win-close').addEventListener('click', e => { e.stopPropagation(); this.close(id); });
      drag(el.querySelector('header'), el, id);
      resize(el.querySelector('.rz'), el, id);
      this.render(id);
      this.focus(id);
      markMenu();
      updateStage();
      return el;
    },
    close(id) {
      const w = this.map.get(id);
      if (!w) return;
      this.saveRect(id, w.rect);
      w.el.remove();
      this.map.delete(id);
      if (UI.current === id) UI.current = this.topId() || 'idle';
      markMenu();
      updateStage();
    },
    closeOthers(except = null) {
      let removed = false;
      [...this.map.keys()].forEach(id => {
        if (id === except) return;
        const w = this.map.get(id);
        if (!w) return;
        this.saveRect(id, w.rect);
        w.el.remove();
        this.map.delete(id);
        removed = true;
      });
      if (removed) {
        if (UI.current !== except) UI.current = this.topId() || 'idle';
        markMenu();
        updateStage();
      }
    },
    closeAll() {
      this.map.forEach((w, id) => this.saveRect(id, w.rect));
      this.map.forEach(w => w.el.remove());
      this.map.clear();
      UI.current = 'idle';
      markMenu();
      updateStage();
    },
    toggle(id) { this.has(id) ? this.close(id) : this.open(id); },
    focus(id) {
      const w = this.map.get(id);
      if (!w) return;
      w.el.style.zIndex = ++zTop;
      this.map.forEach((v, k) => v.el.classList.toggle('top', k === id));
      UI.current = id;
      markMenu();
    },
    render(id) {
      const w = this.map.get(id);
      if (!w) return;
      if (tipCell && w.body.contains(tipCell)) hideItemTip();
      const def = w.def, tab = tabOf(def), y = w.body.scrollTop;
      const content = def.panel ? def.panel(tab) : def.render(tab);
      w.body.innerHTML = (id === 'idle' ? '<p class="screen-lead">Tu vi tự tăng khi nhập định. Mở các bảng bên dưới để tăng tốc, xem công pháp và mục tiêu gần.</p>' : '') + content;
      w.body.scrollTop = y;
      w.tab = tab;
      def.mount?.(tab);
      def.update?.(tab);
      updateTimers();
      w.sig = def.signature?.(tab) ?? '';
    },
    refreshAll() { this.map.forEach((w, id) => this.render(id)); },
    defaultRect(id) {
      const layout = $('game')?.dataset.layout || 'wide';
      const W = root.innerWidth || document.documentElement.clientWidth || 1280;
      const H = root.innerHeight || document.documentElement.clientHeight || 800;
      const stage = $('stage')?.getBoundingClientRect();
      const pad = layout === 'portrait' ? 8 : 12;
      const maxW = stage ? Math.max(260, stage.width - pad * 2) : W - 16;
      const maxH = stage ? Math.max(180, stage.height - pad * 2) : H - 16;
      const width = Math.max(260, Math.min(WINDOW_SIZE[id] || 520, layout === 'portrait' ? W - 20 : maxW, W - 16));
      let height = Math.min(layout === 'portrait' ? H * 0.7 : H * 0.88, 800, maxH);
      height = Math.max(180, Math.min(height, H - 16));
      let x, y;
      /* Màn rộng: sân khấu thấp (~500px ở 768p) nên cửa sổ nội dung dài bị cắt sớm. Cho cửa sổ cao đến hết màn hình,
         đè lên phần nhật ký bên dưới (kéo thả được) để thấy nhiều nội dung hơn mà không phải cuộn. */
      const tall = layout === 'wide' && stage && H > 520 && id !== 'combat';
      if (tall) height = Math.max(height, Math.min(800, H - stage.top - 16));
      if (stage) {
        x = stage.left + (stage.width - width) / 2;
        y = tall ? stage.top + 10 : stage.top + (stage.height - height) / 2;
      } else {
        x = (W - width) / 2;
        y = (H - height) / 2;
      }
      // Điện thoại: cửa sổ chiếm trọn khoảng trống giữa bảng trạng thái và thanh menu,
      // thay vì bị bó trong sân khấu (chỉ cao ~370px nên nội dung bị cắt sớm).
      const status = $('status')?.getBoundingClientRect(), menu = $('menu')?.getBoundingClientRect();
      if (layout === 'portrait' && W < 600 && status && menu && menu.top - status.bottom > 200) {
        const top = status.bottom + 8;
        return this.clampRect({ x: 8, y: top, w: W - 16, h: menu.top - 8 - top });
      }
      /* Lịch luyện: hero và quái đứng ở hai bên giữa sân khấu nên cửa sổ ở giữa sẽ che trận đánh.
         Trên màn rộng, đặt cửa sổ dưới sân khấu (đè lên bảng nhật ký, nhật ký chiến đấu đã có trong cửa sổ). */
      if (id === 'combat' && layout === 'wide' && stage) {
        const top = stage.bottom + 6, h = H - top - 8;
        if (h >= 220) return this.clampRect({ x: stage.left, y: top, w: stage.width, h });
      }
      /* Màn ngang thấp: chừa cột kỹ năng ở mép trái sân khấu. */
      if (id === 'combat' && layout === 'wide' && stage && H <= 520) {
        return this.clampRect({ x: stage.left + 58, y, w: Math.min(width, stage.width - 66), h: height });
      }
      return this.clampRect({ x, y, w: width, h: height });
    },
    loadRect(id) {
      try {
        const raw = JSON.parse(localStorage.getItem(this.key(id)) || 'null');
        if (raw && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(raw[k]))) return this.clampRect(raw);
      } catch { /* bỏ qua */ }
      return null;
    },
    saveRect(id, rect) {
      try { localStorage.setItem(this.key(id), JSON.stringify(rect)); } catch { /* bỏ qua */ }
    },
    clampRect(r) {
      const W = root.innerWidth || document.documentElement.clientWidth || 1280;
      const H = root.innerHeight || document.documentElement.clientHeight || 800;
      r.w = Math.max(260, Math.min(r.w, W - 16));
      r.h = Math.max(180, Math.min(r.h, H - 16));
      r.x = Math.max(8, Math.min(r.x, W - r.w - 8));
      r.y = Math.max(8, Math.min(r.y, H - r.h - 8));
      return r;
    },
    setRect(el, r) {
      el.style.left = r.x + 'px';
      el.style.top = r.y + 'px';
      el.style.width = r.w + 'px';
      el.style.height = r.h + 'px';
    },
    fit() { this.map.forEach(w => { w.rect = this.clampRect(w.rect); this.setRect(w.el, w.rect); }); },
    relayout() {
      this.map.forEach((w, id) => {
        w.rect = this.clampRect(this.loadRect(id) || this.defaultRect(id));
        this.setRect(w.el, w.rect);
        this.render(id);
      });
    }
  };
  UI.windows = wins;

  function drag(handle, el, id) {
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      const w = wins.map.get(id);
      if (!w) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = w.rect.x, oy = w.rect.y;
      try { handle.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
      el.classList.add('drag');
      const mv = ev => {
        w.rect = wins.clampRect({ ...w.rect, x: ox + ev.clientX - sx, y: oy + ev.clientY - sy });
        wins.setRect(el, w.rect);
      };
      const up = () => {
        handle.removeEventListener('pointermove', mv);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        el.classList.remove('drag');
        wins.saveRect(id, w.rect);
      };
      handle.addEventListener('pointermove', mv);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function resize(handle, el, id) {
    handle.addEventListener('pointerdown', e => {
      const w = wins.map.get(id);
      if (!w) return;
      e.preventDefault();
      e.stopPropagation();
      const sx = e.clientX, sy = e.clientY, ow = w.rect.w, oh = w.rect.h;
      try { handle.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
      const mv = ev => {
        w.rect = wins.clampRect({ ...w.rect, w: ow + ev.clientX - sx, h: oh + ev.clientY - sy });
        wins.setRect(el, w.rect);
      };
      const up = () => {
        handle.removeEventListener('pointermove', mv);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        wins.saveRect(id, w.rect);
      };
      handle.addEventListener('pointermove', mv);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function buildMenu() {
    const menu = $('menu');
    if (!menu) return;
    menu.innerHTML = WINDOW_ORDER.map(id => {
      const def = UI.screens[id];
      if (!def) return '';
      const icon = def.icon && /^ICON-/.test(def.icon)
        ? '<img src="media/assets/ui/icon/menu/' + esc(def.icon) + '-40.png" alt="" decoding="async">'
        : '<span class="ico" aria-hidden="true">' + esc(def.icon || '◈') + '</span>';
      const badge = BADGED.includes(id) ? '<em class="badge' + (id === 'tribulation' ? ' hot' : '') + '" data-badge="' + id + '" hidden></em>' : '';
      return '<button type="button" data-window="' + id + '" title="' + esc(def.label) + '" aria-label="' + esc(def.label) + '" aria-pressed="false">' + icon + '<span>' + esc(def.label) + '</span>' + badge + '</button>';
    }).join('') +
      '<button type="button" id="moreMenuBtn" class="menu-more" title="Thêm" aria-label="Thêm" aria-haspopup="true" aria-expanded="false" aria-controls="moreMenu"><span class="ico" aria-hidden="true">⋯</span><span>Thêm</span></button>';
    markMenu();
  }

  function markMenu() {
    $$('#menu [data-window]').forEach(b => {
      const on = b.dataset.window === 'tribulation' ? trib.pageOpen : wins.has(b.dataset.window);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const moreBtn = $('moreMenuBtn');
    if (moreBtn) {
      const on = wins.has('more') || wins.has('chat');
      moreBtn.classList.toggle('on', on);
      moreBtn.setAttribute('aria-pressed', String(on));
    }
  }

  function closeMoreMenu({ focus = false } = {}) {
    const menu = $('moreMenu'), trigger = $('moreMenuBtn');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    if (focus) try { trigger?.focus({ preventScroll: true }); } catch { /* bỏ qua */ }
  }

  function positionMoreMenu() {
    const menu = $('moreMenu'), trigger = $('moreMenuBtn');
    if (!menu || menu.hidden || !trigger) return;
    const r = trigger.getBoundingClientRect();
    const W = root.innerWidth || document.documentElement.clientWidth || 1280;
    const H = root.innerHeight || document.documentElement.clientHeight || 800;
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    const layout = $('game')?.dataset.layout || 'wide';
    let left, top;
    if (layout === 'portrait') {
      left = clamp(r.left + r.width / 2 - mw / 2, 8, W - mw - 8);
      top = r.top - mh - 8;
      if (top < 8) top = Math.min(H - mh - 8, r.bottom + 8);
    } else {
      left = r.left - mw - 10;
      top = clamp(r.top + r.height / 2 - mh / 2, 8, H - mh - 8);
      if (left < 8) left = Math.min(W - mw - 8, r.right + 10);
    }
    menu.style.left = Math.max(8, left) + 'px';
    menu.style.top = Math.max(8, top) + 'px';
  }

  function openMoreMenu() {
    const menu = $('moreMenu'), trigger = $('moreMenuBtn');
    if (!menu || !trigger) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    positionMoreMenu();
    try { menu.querySelector('button')?.focus({ preventScroll: true }); } catch { /* bỏ qua */ }
  }

  function toggleMoreMenu() {
    const menu = $('moreMenu');
    if (!menu) return;
    menu.hidden ? openMoreMenu() : closeMoreMenu({ focus: true });
  }

  /* ======================================================================
     RENDER / ĐIỀU HƯỚNG
     ====================================================================== */
  function refresh() {
    hideItemTip();
    updateChrome();
    updateStage();
    wins.refreshAll();
    updateTimers();
    if (trib.pageOpen) trib.updatePage();
  }

  function soft() {
    hideItemTip();
    updateChrome();
    updateStage();
    wins.map.forEach(w => w.def.update?.(tabOf(w.def)));
    updateTimers();
    if (trib.pageOpen) trib.updatePage();
  }

  function go(target, { silent = false } = {}) {
    if (!UI.s().created) return;
    if (['running', 'settling'].includes(trib.phase)) return;
    closeMoreMenu();
    hideItemTip();
    const [id, tab] = String(target || 'idle').split(':');
    if (trib.pageOpen && id !== 'tribulation') trib.closePage();
    if (id === 'tribulation') {
      resetFilters();
      UI.current = 'tribulation';
      trib.openPage();
      updateChrome();
      updateStage();
      if (!silent) {
        try { if (root.location.hash !== '#tribulation') root.location.hash = '#tribulation'; } catch { /* file:// cũ */ }
        try { $('tribBack')?.focus?.({ preventScroll: true }); } catch { /* bỏ qua */ }
      }
      return;
    }
    const def = UI.screens[id] || UI.screens.idle;
    if (UI.current !== def.id || tab) resetFilters();
    UI.current = def.id;
    if (tab) UI.tabState[def.id] = tab;
    if (def.id === 'idle') wins.closeAll();
    else wins.open(def.id);
    updateChrome();
    updateStage();
    if (!silent) {
      try {
        const hash = '#' + def.id + (tab ? '/' + tabOf(def) : '');
        if (root.location.hash !== hash) root.location.hash = hash;
      } catch { /* file:// cũ */ }
      const focusEl = def.id === 'idle' ? $('stage') : wins.map.get(def.id)?.el;
      try { focusEl?.focus?.({ preventScroll: true }); } catch { /* bỏ qua */ }
    }
  }

  /* ======================================================================
     TRẠNG THÁI / SÂN KHẤU
     ====================================================================== */
  function updateChrome() {
    const s = UI.s(), g = UI.g();
    if (!s.created || !$('playerName')) return;
    syncLogOwner();
    const unlocked = UI.session.drainAchievements();
    if (unlocked.length) {
      unlocked.slice(0, 2).forEach(a => toast('Mở thành tựu · ' + a.name + ' · +' + a.points + ' điểm Thiên mệnh.', { type: 'gold', title: 'Thành tựu', duration: 5200 }));
      if (unlocked.length > 2) toast('+' + (unlocked.length - 2) + ' thành tựu khác vừa mở.', { type: 'gold', title: 'Thành tựu', duration: 5200 });
    }
    const need = g.need(), p = clamp(s.qi / need * 100, 0, 100), readyQi = p >= 100 && !s.completed;
    $('playerName').textContent = s.name;
    $('playerRealm').textContent = g.realmLabel();
    $('playerRoot').textContent = H.rootLabel(s.rootType, s.rootSub).toUpperCase();
    $('playerPlace').textContent = F.realm_map(s.zone) + ' · ' + H.ZONES[s.zone].name;
    const avatar = $('avatar'), avatarSrc = A.heroPortrait(s.gender, s.realm);
    if (avatar && avatar.getAttribute('src') !== avatarSrc) avatar.src = avatarSrc;
    const moneyEl = $('moneyTop'), moneyText = money(s.stone);
    if (moneyEl) {
      if (moneyEl.textContent !== moneyText) moneyEl.innerHTML = moneyHTML(s.stone);
      moneyEl.setAttribute('aria-label', 'Linh thạch ' + moneyText);
    }
    $('topRate').textContent = '+' + num(g.rate()) + '/giây';
    $('topWorld').textContent = F.realm_map(s.zone);
    $('topDaoVan').textContent = num(s.daoVan);
    $('topQiFill').style.width = p + '%';
    $('topQiFill').parentElement.classList.toggle('full', p >= 100);
    $('topQiText').textContent = num(s.qi) + ' / ' + num(need);
    $('topQiHint').textContent = s.completed ? 'Đã chứng đạo' : readyQi ? 'Đã đầy' : Math.floor(p) + '%';
    const st = g.stats(), maxMp = g.maxMp(), hpPct = clamp(s.hp / st.HP * 100, 0, 100), mpPct = clamp(s.mp / maxMp * 100, 0, 100);
    if ($('hpFill')) $('hpFill').style.width = hpPct + '%';
    if ($('mpFill')) $('mpFill').style.width = mpPct + '%';
    if ($('hpValue')) $('hpValue').textContent = num(s.hp) + ' / ' + num(st.HP);
    if ($('mpValue')) $('mpValue').textContent = num(s.mp) + ' / ' + num(maxMp);
    const life = g.lifeInfo();
    $('lifeFill').style.width = clamp(s.age / life.max * 100, 0, 100) + '%';
    $('lifeValue').textContent = s.completed ? 'Trường sinh' : Math.floor(s.age) + ' / ' + num(life.max) + ' năm';
    $('lifeRow').classList.toggle('low-life', !s.completed && life.left <= 40);
    $('lifeRow').title = s.completed ? 'Đã chứng đạo, không còn giới hạn thọ nguyên.' : 'Còn ' + num(life.left) + ' năm thọ nguyên';
    $('lifeMeter').setAttribute('aria-valuemax', String(life.max));
    $('lifeMeter').setAttribute('aria-valuenow', String(Math.min(life.max, Math.floor(s.age))));
    $('lifeMeter').setAttribute('aria-valuetext', $('lifeValue').textContent);
    $('statusVitals')?.setAttribute('aria-label', 'Sinh lực ' + num(s.hp) + ' trên ' + num(st.HP) + '; linh khí ' + num(s.mp) + ' trên ' + num(maxMp) + '; thọ nguyên ' + $('lifeValue').textContent);
    const talents = $('statusTalents');
    if (!talents.childElementCount) talents.innerHTML = H.TALENT_INFO.map(t => `<div class="status-talent" data-talent="${t.key}"><img src="${A.BASE}ui/icon/menu/${t.icon}" alt=""><span>${esc(t.name)}</span><b></b><meter min="0" max="${H.TALENT_MAX}" aria-label="${esc(t.name)}"></meter></div>`).join('');
    for (const t of H.TALENT_INFO) {
      const el = talents.querySelector(`[data-talent="${t.key}"]`), value = s.talent[t.key] || 0;
      el.querySelector('b').textContent = value;
      el.querySelector('meter').value = value;
      el.title = t.name + ': ' + value + ' điểm · ' + t.effect(value);
    }
    const bb = $('btn-break');
    if (bb) {
      /* Tiểu cảnh giới tự động đột phá; chỉ tầng cuối (viên mãn) mới cần bấm tay để độ kiếp. */
      const peak = s.stage === F.STAGES[s.realm], can = !s.completed && readyQi && peak;
      bb.disabled = !can;
      bb.classList.toggle('ready', can);
      bb.classList.toggle('auto', !s.completed && !peak);
      $('breakLabel').textContent = s.completed ? 'Đã chứng đạo' : peak ? 'Đột phá đại cảnh giới' : 'Tự động đột phá';
      $('breakHint').textContent = s.completed ? 'Trọng sinh để mở vòng mới' : peak ? (can ? 'Viên mãn · bấm để nhận thiên kiếp' : 'Viên mãn · chưa đủ tu vi') : 'Tầng ' + s.stage + '/' + F.STAGES[s.realm] + ' · tự động';
    }
    const badge = (id, text, on) => {
      const el = document.querySelector('#menu [data-badge="' + id + '"]');
      if (!el) return;
      el.hidden = !on; el.textContent = text;
    };
    badge('craft', String(s.craftQueue.length + s.garden.length), s.craftQueue.length + s.garden.length > 0);
    badge('combat', '⚔', s.auto);
    markMenu();
    document.body.classList.toggle('mode-fight', s.auto);
    const docTitle = s.name + ' · Hư Giới';
    if (docTitle !== lastDocTitle) { lastDocTitle = docTitle; document.title = docTitle; }
  }

  function updateStage() {
    const s = UI.s(), g = UI.g();
    if (!s.created || !$('scene')) return;
    if (trib.pageOpen) return;
    const mode = (wins.has('combat') || s.auto) ? 'combat' : 'idle';
    if (mode !== lastStageMode) {
      if (mode === 'combat') UI.vfx?.stage({ kind: 'chien_dau', variant: 'ke_dich', fps: 14, size: 'clamp(150px,23vw,290px)', style: { left: '64%', bottom: '23%', transform: 'translateX(-50%)' } });
      lastStageMode = mode;
    }
    const gameEl = $('game');
    if (gameEl) gameEl.dataset.stage = mode;
    UI.skillDock?.update();
    UI.combatFx?.sync(mode);
    UI.environment?.update(s);
    $('stageTag').textContent = F.realm_map(s.zone) + ' · ' + H.ZONES[s.zone].name;
    $('rateText').textContent = '+' + num(g.rate()) + ' tu vi/giây';
    $('stageHeroName').textContent = s.name;
    const mm = $('modeMeditate'), mf = $('modeFight');
    if (mm) { mm.classList.toggle('active', !s.auto); mm.setAttribute('aria-pressed', String(!s.auto)); }
    if (mf) { mf.classList.toggle('active', s.auto); mf.setAttribute('aria-pressed', String(s.auto)); }
    const enemyActor = $('enemyActor'), autoToggle = $('autoCombatToggle');
    if (mode === 'combat') {
      A.preloadHero(s.gender, s.realm, 'tan_cong');
      const enemy = g.enemy();
      if (enemyActor) enemyActor.hidden = false;
      if ($('enemyName')) $('enemyName').textContent = enemy.name;
      if ($('enemyLevel')) $('enemyLevel').textContent = F.REALMS[s.zone] + ' · ' + s.enemyKind;
      if ($('enemyBar')) $('enemyBar').style.width = clamp((s.enemyHp || enemy.HP) / enemy.HP * 100, 0, 100) + '%';
      if (autoToggle) {
        autoToggle.hidden = false;
        autoToggle.textContent = s.auto ? '⚔ Tự chiến: bật · Bấm để dừng' : '☯ Tự chiến: tắt · Bấm để bật';
        autoToggle.classList.toggle('fighting', s.auto);
        autoToggle.setAttribute('aria-pressed', String(s.auto));
      }
    } else {
      heroAttackUntil = 0;
      if (enemyActor) enemyActor.hidden = true;
      if (autoToggle) autoToggle.hidden = true;
    }
    stageFrame(frameCount, isReduced());
  }

  function heroAttack() {
    if (!UI.vfx?.effectsEnabled()) return;
    const s = UI.s();
    heroAttackFrame = frameCount;
    heroAttackUntil = Date.now() + A.heroFrames(s.gender, s.realm, 'tan_cong') * 235;
    stageFrame(frameCount, false);
  }

  function stageFrame(n, reduced) {
    const s = UI.s();
    if (!s.created) return;
    const mode = $('game')?.dataset.stage || 'idle';
    const hero = $('heroSprite');
    if (hero) {
      const manual = Date.now() < heroAttackUntil;
      const action = mode === 'combat' && (s.auto || manual) ? 'tan_cong' : 'dung_yen';
      A.preloadHero(s.gender, s.realm, action);
      const index = reduced ? 0 : manual && !s.auto ? n - heroAttackFrame : n;
      const src = A.heroSrc(s.gender, s.realm, action, index);
      hero.dataset.action = action;
      hero.alt = action === 'tan_cong' ? 'Đạo sĩ đang công kích' : 'Đạo sĩ đang nhập định';
      if (hero.getAttribute('src') !== src) hero.src = src;
    }
    const foe = $('enemySprite');
    if (foe && mode === 'combat') {
      const src = A.enemySrc(s.zone, s.enemyKind, s.auto && !reduced ? 'tan_cong' : 'dung_yen', reduced ? 0 : n);
      if (foe.getAttribute('src') !== src) foe.src = src;
    }
  }

  function updateTimers() {
    const s = UI.s(), now = Date.now();
    $$('[data-end]').forEach(el => {
      const end = Number(el.dataset.end);
      el.textContent = now >= end ? 'Sẵn sàng' : duration((end - now) / 1000);
    });
    $$('[data-cooldown]').forEach(el => {
      const t = s.cooldowns[Number(el.dataset.cooldown)] || 0;
      el.textContent = now >= t ? 'Sẵn sàng' : 'Hồi ' + duration((t - now) / 1000);
    });
  }

  /* ======================================================================
     GỢI Ý VẬT PHẨM
     ====================================================================== */
  let tipCell = null;

  function hideItemTip() {
    const tip = $('itemTip');
    if (tipCell) {
      tipCell.removeAttribute('aria-describedby');
      tipCell = null;
    }
    if (!tip) return;
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true');
  }

  function showItemTip(cell) {
    const key = cell?.dataset?.select, tip = $('itemTip');
    const x = key ? H.item(key) : null;
    if (!tip || !x) return;
    const g = UI.g();
    const count = g.count(key);
    const quality = [x.grade || x.quality, F.SUBPHAM[x.sub]].filter(Boolean).join(' · ') || 'Phàm phẩm';
    const price = moneyHTML(F.shop_sell_price(g.price(key)));
    const v = A.itemImg(x);
    tip.innerHTML = `<div class="item-tip-head"><img src="${v.src}"${v.style ? ` style="${esc(v.style)}"` : ''} alt="" decoding="async"><div><b>${esc(x.name)}</b><span>${esc(quality)}</span></div></div>` +
      `<p class="item-tip-desc">${esc(x.description || 'Không có mô tả.')}</p>` +
      `<div class="item-tip-meta"><span>Cảnh giới <b>${esc(x.realm || '—')}</b></span><span>Số lượng <b>×${num(count)}</b></span><span>Giá bán <b>${price}</b></span></div>`;
    tip.hidden = false;
    tip.setAttribute('aria-hidden', 'false');
    if (tipCell && tipCell !== cell) tipCell.removeAttribute('aria-describedby');
    tipCell = cell;
    cell.setAttribute('aria-describedby', 'itemTip');
    const r = cell.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    const VW = root.innerWidth || 1280, VH = root.innerHeight || 800;
    let left = r.right + 10, top = r.top + r.height / 2 - th / 2;
    if (left + tw > VW - 8) left = r.left - tw - 10;
    if (left < 8) left = clamp(r.left + r.width / 2 - tw / 2, 8, VW - tw - 8);
    top = clamp(top, 8, VH - th - 8);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  /* ======================================================================
     MÙA & LÁ RƠI
     ====================================================================== */
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  function seasonOf(s) {
    if (s.settings.season && s.settings.season !== 'auto') return s.settings.season;
    return SEASONS[Math.floor((s.tick || 0) / 900) % 4];
  }

  function fillLeaves(layer, season) {
    layer.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const leaf = document.createElement('img');
      leaf.className = 'leaf' + (season === 'summer' ? ' firefly' : '');
      leaf.src = A.seasonSprite(season, i);
      leaf.alt = '';
      leaf.draggable = false;
      leaf.decoding = 'async';
      leaf.style.left = (Math.random() * 100).toFixed(2) + '%';
      leaf.style.animationDelay = (-Math.random() * 14).toFixed(2) + 's';
      leaf.style.animationDuration = (8 + Math.random() * 8).toFixed(2) + 's';
      leaf.style.width = (season === 'summer' ? 14 + i % 3 * 3 : 18 + i % 4 * 5) + 'px';
      layer.append(leaf);
    }
    layer.dataset.season = season;
  }

  function buildHeroParticles() {
    const host = $('heroParticles');
    if (!host || host.childElementCount) return;
    const colors = ['#8cecff', '#67c9ff', '#ffdf8a', '#bda8ff', '#7fffd0'];
    const total = (root.innerWidth || 1280) < 600 ? 8 : 12;
    host.innerHTML = Array.from({ length: total }, (_, i) => {
      const angle = i / total * Math.PI * 2;
      const x = 50 + Math.cos(angle) * (38 + i % 3 * 5);
      const y = 55 + Math.sin(angle) * (28 + i % 4 * 4);
      const dx = Math.cos(angle) * (8 + i % 4 * 4);
      const size = 3 + i % 3;
      const dur = 2.8 + i % 5 * .55;
      return `<i style="--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--dx:${dx.toFixed(1)}px;--dx2:${(dx * 1.7).toFixed(1)}px;--s:${size}px;--dur:${dur}s;--delay:${(-i * .47).toFixed(2)}s;--c:${colors[i % colors.length]}"></i>`;
    }).join('');
  }

  function updateSceneEffects() {
    const s = UI.s();
    if (!s.created) return;
    const reduced = isReduced();
    $$('.scene').forEach(scene => {
      let layer = scene.querySelector('.fx-leaves');
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'fx-leaves';
        layer.setAttribute('aria-hidden', 'true');
        scene.append(layer);
      }
      const season = seasonOf(s);
      if (layer.dataset.season !== season) fillLeaves(layer, season);
      layer.hidden = reduced || !s.settings.seasonEffects || document.hidden;
    });
    const aura = $('idleAura');
    if (aura) aura.hidden = reduced || !s.settings.cultivationEffects || s.auto;
    const particles = $('heroParticles');
    if (particles) particles.hidden = reduced || !s.settings.cultivationEffects;
    const quote = $('idleQuote');
    if (quote) quote.textContent = s.auto ? 'Tâm động, kiếm xuất; yêu khí tan trong một niệm.' : 'Hô hấp như mây, ý niệm như nước; linh khí tự tụ nơi đan điền.';
  }

  function applySettings() {
    const s = UI.s();
    document.body.classList.toggle('reduced-motion', isReduced());
    document.body.classList.toggle('motion-full', s.settings.motionMode === 'full');
    document.body.classList.toggle('effects-off', s.settings.combatEffects === false);
    UI.tribulation?.setReduced(isReduced());
    if (isReduced() || s.settings.combatEffects === false) UI.vfx?.clearAll();
    updateSceneEffects();
    UI.environment?.update(s);
    const note = $('motionStatus');
    if (note) note.textContent = isReduced() ? 'Đang giảm chuyển động: lá, linh khí và hiệu ứng khung hình ở trạng thái tĩnh.' : 'Đang bật đầy đủ: lá rơi, linh khí và hiệu ứng chiến đấu chuyển động.';
  }

  /* ======================================================================
     ĐỘ KIẾP ĐÀI
     ====================================================================== */
  const trib = {
    active: false,
    pageOpen: false,
    phase: 'closed',
    result: null,
    timers: [],
    reduced: false,
    focus: null,
    world: 'ha_gioi',
    sig: '',
    actor: null,
    setReduced(v) { this.reduced = !!v; },
    layoutScene() {
      if (!this.pageOpen) return;
      const stage = $('tribStage'), scale = Math.max(stage.clientWidth / 1280, stage.clientHeight / 720);
      // Tâm hoa văn trong dai_loi_kiep.webp là (640,432), cùng phép cover với nền.
      $('tribulationFx').style.setProperty('--altar-x', stage.clientWidth / 2 + 'px');
      $('tribulationFx').style.setProperty('--altar-y', (stage.clientHeight - 720 * scale) / 2 + 432 * scale + 'px');
    },
    heroFrame(n = 0) {
      const s = this.actor || UI.s(), el = $('tribHero');
      A.preloadHero(s.gender, s.realm);
      const src = A.heroSrc(s.gender, s.realm, 'dung_yen', this.reduced ? 0 : n);
      if (el.getAttribute('src') !== src) el.src = src;
    },
    progress(value) {
      $('tribProgress').style.width = value + '%';
      $('tribProgressBar').setAttribute('aria-valuenow', String(Math.round(value)));
    },
    updateQi() {
      const s = UI.s(), need = UI.g().need();
      $('tribQiText').textContent = num(s.qi) + ' / ' + num(need);
      $('tribQiFill').style.width = clamp(s.qi / need * 100, 0, 100) + '%';
      const ready = this.canStart();
      $('tribEligibility').textContent = s.completed ? 'Đạo quả viên mãn · mở Trọng sinh trong phần chuẩn bị.'
        : !ready ? 'Còn ' + duration(F.time_to_goal(need, s.qi, UI.g().rate())) + ' tu luyện để đột phá.'
          : this.major() ? 'Đã đủ tu vi · mở phần chuẩn bị để dùng đan / phù hộ kiếp.' : 'Đã đủ tu vi · sẵn sàng đột phá tầng nhỏ.';
      const minorQi = $('tribMinorQi'), minorFill = $('tribMinorQiFill');
      if (minorQi) minorQi.textContent = num(s.qi) + ' / ' + num(need);
      if (minorFill) minorFill.style.width = clamp(s.qi / need * 100, 0, 100) + '%';
    },
    clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; },
    wait(fn, ms) { this.timers.push(setTimeout(fn, ms)); },
    major() { const s = UI.s(); return s.stage === F.STAGES[s.realm]; },
    canStart() { const s = UI.s(), g = UI.g(); return !s.completed && s.qi >= g.need(); },
    worldOf() { return A.tribWorld ? A.tribWorld(UI.s().realm) : 'ha_gioi'; },
    preload() {
      const world = this.worldOf();
      A.preloadVfx('loi_kiep', world);
      if (A.vfxCount('phi_thang', world)) A.preloadVfx('phi_thang', world);
      A.preloadVfx('dot_pha', 'ha_gioi');
      A.preloadVfx('chien_dau', 'ho_thuan');
      A.preloadVfx('chien_dau', 'linh_phu');
      ['bolt', 'break', 'hit'].forEach(name => A.preloadVfx('hu_gioi', name));
    },
    nextLabel() {
      const s = UI.s();
      if (s.completed) return 'Đạo Tổ · đạo quả viên mãn';
      if (this.major()) return F.REALMS[s.realm] + ' → ' + (s.realm < 13 ? F.REALMS[s.realm + 1] : 'Đạo Tổ');
      const name = UI.tribulationScreen?.stageName;
      return name ? name(s.realm, s.stage) + ' → ' + name(s.realm, s.stage + 1) : UI.g().realmLabel();
    },
    renderPrep() {
      const s = UI.s(), g = UI.g(), st = g.stats(), events = g.tribulation();
      const major = this.major(), can = this.canStart(), world = this.worldOf();
      this.world = world;
      $('tribRealmChip').textContent = g.realmLabel();
      $('tribEyebrow').textContent = s.completed ? 'THIÊN ĐẠO · ĐẠO QUẢ VIÊN MÃN' : major ? 'THIÊN ĐẠO · ĐẠI CẢNH GIỚI' : 'TIÊN LỘ · TIỂU CẢNH GIỚI';
      $('tribTitle').textContent = s.completed ? 'Đạo Tổ viên mãn' : major ? 'Thiên kiếp' : 'Đột phá tầng';
      $('tribSubtitle').textContent = this.nextLabel();
      $('tribHeadTags').innerHTML = `<span>${pct(g.chance())} xác suất</span><span>${s.pity}/15 bảo hiểm</span><span>${events.reduce((n, e) => n + e.bolts, 0) || 0} đạo lôi</span><span>${pct(s.shield)} hộ thuẫn</span>`;
      this.actor = { gender: s.gender, realm: s.realm };
      this.heroFrame();
      $('tribOverlayChance').textContent = pct(g.chance());
      $('tribReduction').textContent = pct(s.reduction);
      $('tribShieldSummary').textContent = pct(s.shield) + ' sinh lực';
      $('tribPitySummary').textContent = s.pity + '/15';
      $('tribHpText').textContent = num(s.hp) + ' / ' + num(st.HP);
      $('tribHpFill').style.width = clamp(s.hp / st.HP * 100, 0, 100) + '%';
      $('tribShieldText').textContent = pct(s.shield) + ' sinh lực';
      $('tribShieldFill').style.width = clamp(s.shield * 100, 0, 100) + '%';
      $('tribCounter').textContent = events.length ? 'Thiên kiếp · ' + events.reduce((n, e) => n + e.bolts, 0) + ' đạo lôi' : 'Không lôi kiếp · chỉ xét xác suất';
      $('tribEventCount').textContent = events.length ? events.length + ' đợt' : '0 đợt';
      $('tribEvents').innerHTML = events.length ? events.map(e =>
        `<li><b>${esc(e.name)}</b><span>${e.bolts} đạo · <em class="${e.success ? 'green-text' : 'danger-text'}">${e.success ? '✓ đủ sức' : '✗ chưa đủ sức'}</em></span></li>`).join('')
        : '<li><b>Không có lôi kiếp</b><span>Đột phá chỉ dựa vào xác suất</span></li>';
      this.progress(0);
      $('tribStatus').textContent = s.completed ? 'Đạo Tổ đã chứng đạo. Hãy trọng sinh để mở vòng mới.'
        : !major ? 'Tầng này không có lôi kiếp. Đột phá tại chỗ, ghi vào nhật ký.'
          : !can ? 'Tu vi chưa đầy. Hãy tiếp tục nhập định và chuẩn bị hộ kiếp.'
            : events.length ? 'Lôi vân đã tụ · chuẩn bị nghênh đón thiên kiếp.' : 'Tĩnh tâm vận khí · chuẩn bị vượt đại cảnh giới.';
      $('tribStageHint').textContent = s.completed ? 'Đạo quả viên mãn' : major ? 'Thiên đạo vô tình · đạo tâm bất diệt' : 'Tiểu cảnh giới · đột phá tại chỗ';
      $('tribResult').hidden = true;
      $('tribResult').className = 'trib-result';
      $('tribResult').innerHTML = '';
      $('tribStart').hidden = false;
      $('tribStart').disabled = !can;
      $('tribStart').textContent = s.completed ? 'Đã chứng đạo' : !can ? 'Chưa đủ tu vi' : !major ? 'Đột phá tầng nhỏ' : events.length ? 'Dẫn động lôi kiếp' : 'Đột phá cảnh giới';
      $('tribClose').hidden = false;
      $('tribClose').disabled = false;
      $('tribClose').textContent = 'Về tu luyện';
      $('tribReturn').hidden = true;
      $('tribBack').disabled = false;
      $('tribPrep').hidden = false;
      $('tribDetails').hidden = false;
      $('tribPrep').innerHTML = UI.tribulationScreen?.render() || '';
      $('tribStage').classList.remove('is-running', 'is-result', 'is-success', 'is-failure', 'struck');
      $('tribStage').classList.toggle('is-ready', can);
      $('tribStage').classList.toggle('is-minor', !major && !s.completed);
      $('tribStage').classList.toggle('is-completed', s.completed);
      $('tribulationFx').dataset.phase = 'prep';
      this.updateQi();
      this.sig = UI.screens.tribulation?.signature?.() || '';
    },
    openPage() {
      const s = UI.s();
      if (!s.created) return;
      if (this.pageOpen) { if (!this.active) this.updatePage(true); return; }
      if (this.active) return;
      closeMoreMenu();
      hideItemTip();
      store.catchUp();
      this.pageOpen = true;
      this.phase = 'prep';
      this.result = null;
      this.focus = document.activeElement;
      this.clearTimers();
      UI.vfx?.clear('#stageVfx');
      wins.closeAll();
      $('game').hidden = true;
      $('tribulationFx').hidden = false;
      document.body.classList.add('in-tribulation');
      UI.current = 'tribulation';
      this.layoutScene();
      $('tribDetails').open = false;
      this.preload();
      this.renderPrep();
      UI.vfx?.clear('#tribVfxLayer');
      UI.vfx?.ring('trib', '#91d9ed');
      $('tribulationFx').scrollTop = 0;
      markMenu();
      updateStage();
      if ($('modalLayer').hidden) try { $('tribBack')?.focus({ preventScroll: true }); } catch { /* bỏ qua */ }
    },
    closePage() {
      if (!this.pageOpen) return;
      if (this.active && ['running', 'settling'].includes(this.phase)) return;
      this.clearTimers();
      UI.vfx?.clear('#tribVfxLayer');
      UI.vfx?.clear('#tribStageVfx');
      UI.vfx?.clear('#tribStage');
      this.active = false;
      this.pageOpen = false;
      this.phase = 'closed';
      this.result = null;
      this.actor = null;
      $('tribulationFx').hidden = true;
      $('game').hidden = false;
      document.body.classList.remove('in-tribulation');
      UI.current = 'idle';
      markMenu();
      updateSceneEffects();
      updateChrome();
      updateStage();
      try { this.focus?.focus?.({ preventScroll: true }); } catch { /* bỏ qua */ }
    },
    close() {
      if (!this.pageOpen || ['running', 'settling'].includes(this.phase)) return;
      const result = this.result;
      const ok = !!result?.success;
      this.closePage();
      UI.go('idle');
      if (result) UI.toast(ok ? 'Thiên kiếp thành công · ' + UI.g().realmLabel() : 'Thiên kiếp thất bại · mất 15% tu vi.',
        { type: ok ? 'tribulation' : 'danger', title: ok ? 'Đột phá thành công' : 'Thiên kiếp thất bại' });
    },
    show() { UI.go('tribulation'); },
    start() {
      if (!this.pageOpen || this.active || this.phase === 'running') return;
      const s = UI.s(), g = UI.g();
      if (s.completed) { UI.toast('Đạo Tổ đã chứng đạo. Hãy trọng sinh.', { type: 'info' }); return; }
      if (!this.major()) { UI.actions.break?.({ dataset: {} }); return; }
      if (s.qi < g.need()) { UI.toast('Tu vi chưa đầy. Hãy tiếp tục nhập định.', { type: 'danger' }); this.renderPrep(); return; }
      store.catchUp();
      const world = this.worldOf(), oldStats = g.stats(), oldShield = s.shield;
      const oldRealm = s.realm, oldRoot = s.rootType, oldReduction = s.reduction;
      this.world = world;
      this.preload();
      const result = UI.command('breakthrough');
      this.result = result;
      this.active = true;
      this.phase = 'running';
      store.write();
      $('tribStart').disabled = true;
      $('tribClose').disabled = true;
      $('tribBack').disabled = true;
      $('tribReturn').hidden = true;
      $('tribResult').hidden = true;
      $('tribPrep').hidden = true;
      $('tribDetails').open = false;
      $('tribDetails').hidden = true;
      const events = result.events || [];
      this.progress(0);
      $('tribEligibility').textContent = 'Đang đột phá · giữ vững đạo tâm.';
      $('tribStatus').textContent = events.length ? 'Thiên đạo cảm ứng · lôi vân tụ họp...' : 'Thiên đạo cảm ứng · đạo cơ chuyển hóa...';
      $('tribStageHint').textContent = events.length ? 'Thiên lôi giáng thế...' : 'Thiên đạo định đoạt · đạo cơ chuyển hóa...';
      $('tribHpText').textContent = num(oldStats.HP) + ' / ' + num(oldStats.HP);
      $('tribHpFill').style.width = '100%';
      $('tribShieldText').textContent = pct(oldShield) + ' sinh lực';
      $('tribShieldFill').style.width = clamp(oldShield * 100, 0, 100) + '%';
      $('tribStage').classList.remove('is-ready', 'is-minor', 'is-completed', 'is-result', 'is-success', 'is-failure');
      $('tribStage').classList.add('is-running');
      $('tribulationFx').dataset.phase = 'running';
      UI.vfx?.ring('trib', '#e6c164');
      if (oldShield > 0) UI.vfx?.tribStage({ kind: 'chien_dau', variant: 'ho_thuan', fps: 12 });
      // Tóm lược tối đa 6 nhịp mỗi đợt; sinh lực/khiên lấy từ cùng công thức chịu kiếp.
      const steps = [];
      events.forEach((event, wave) => {
        const bolts = wave === 1 ? F.ascension_bolts(oldRealm, oldRoot) : F.tribulation_bolts(oldRealm, oldRoot);
        const end = event.success ? bolts.length : Math.min(bolts.length, event.survived + 1);
        const beats = Math.min(end, this.reduced ? 1 : 6);
        let at = 0, remaining = oldStats.HP * (1 + oldShield);
        for (let beat = 1; beat <= beats; beat++) {
          const to = Math.ceil(end * beat / beats);
          let damage = 0;
          while (at < to) damage += bolts[at++] * (1 - oldReduction);
          remaining = Math.max(0, remaining - damage);
          steps.push({ event, wave, damage, count: Math.ceil(to / bolts.length * event.bolts),
            hp: Math.min(oldStats.HP, remaining), shield: Math.max(0, remaining - oldStats.HP) });
        }
      });
      let i = 0;
      const step = () => {
        if (i >= steps.length) { this.settle(); return; }
        const e = steps[i];
        if (UI.vfx?.effectsEnabled()) {
          const stage = $('tribStage');
          stage.classList.remove('struck'); void stage.offsetWidth; stage.classList.add('struck');
          this.wait(() => stage.classList.remove('struck'), 360);
          if (world === 'ha_gioi') UI.vfx.effect('bolt', 'trib', { size: 'calc(var(--hero-size) * 2)' });
          else UI.vfx.tribStage({ kind: 'loi_kiep', variant: world, size: 'calc(var(--hero-size) * 2.3)' });
          UI.vfx.ring('trib', '#9adcff');
          UI.vfx.burst('trib', '#bceaff', 12);
          UI.vfx.float('−' + num(e.damage), 'trib', 'skill');
          UI.vfx.screenFlash('flash-blue', 350);
        }
        $('tribCounter').textContent = `Đợt ${e.wave + 1}/${events.length} · ${e.count}/${e.event.bolts} đạo lôi`;
        $('tribStageHint').textContent = e.event.name;
        $('tribStatus').textContent = e.hp <= 0 ? 'Hộ thể vỡ · đạo cơ chấn động!' : e.shield > 0 ? 'Hộ thuẫn đang hấp thu lôi kiếp.' : 'Vận công hộ thể · giữ vững đạo tâm.';
        $('tribHpText').textContent = num(e.hp) + ' / ' + num(oldStats.HP);
        $('tribHpFill').style.width = clamp(e.hp / oldStats.HP * 100, 0, 100) + '%';
        $('tribShieldText').textContent = pct(e.shield / oldStats.HP) + ' sinh lực';
        $('tribShieldFill').style.width = clamp(e.shield / oldStats.HP * 100, 0, 100) + '%';
        this.progress((i + 1) / steps.length * 100);
        i++;
        this.wait(step, this.reduced ? 180 : 720);
      };
      if (!steps.length) this.wait(() => this.settle(), this.reduced ? 200 : 900);
      else this.wait(step, this.reduced ? 180 : 600);
    },
    settle() {
      if (!this.pageOpen || !['running', 'settling'].includes(this.phase)) return;
      this.phase = 'settling';
      $('tribStatus').textContent = 'Thiên lôi tàn · đạo cơ đang tái tạo...';
      $('tribStageHint').textContent = 'Thiên đạo phán quyết · linh quang tụ hội';
      $('tribStage').classList.remove('struck');
      const settleMs = this.reduced ? 220 : 5900;
      UI.vfx?.tribStage({ kind: this.result?.success ? 'dot_pha' : 'chien_dau', variant: this.result?.success ? 'ha_gioi' : 'linh_khi', fps: 10, loop: true, duration: settleMs });
      this.wait(() => this.finish(), settleMs);
    },
    finish() {
      if (!this.pageOpen || !['running', 'settling'].includes(this.phase)) return;
      this.clearTimers();
      this.phase = 'result';
      const result = this.result, s = UI.s(), g = UI.g(), world = this.world;
      $('tribStart').hidden = true;
      $('tribClose').hidden = true;
      $('tribReturn').hidden = false;
      $('tribBack').disabled = false;
      this.progress(100);
      $('tribResult').hidden = false;
      $('tribPrep').hidden = true;
      $('tribStage').classList.remove('is-running', 'struck');
      $('tribStage').classList.add('is-result');
      $('tribulationFx').dataset.phase = 'result';
      if (result?.success) {
        $('tribTitle').textContent = 'Đột phá thành công';
        $('tribEyebrow').textContent = 'THIÊN ĐẠO · ĐẠO CƠ TÁI TẠO';
        $('tribSubtitle').textContent = g.realmLabel() + ' · cảnh giới mới đã mở';
        $('tribStatus').textContent = result.events.length ? 'Thiên kiếp đã qua, đạo cơ tái tạo.' : 'Đạo cơ đã thành · mở ra cảnh giới mới.';
        $('tribResult').className = 'trib-result success';
        const chaosNote = result.awaken
          ? `<p class="root-awaken">✦ Lôi kiếp tẩy luyện: <b>${esc(result.awaken.from)} linh căn</b> hóa thành <b>Hỗn Độn linh căn</b>! (xác suất ${pct(result.awaken.chance)})</p>`
          : (result.events.length && g.chaosChance() > 0 ? `<p class="info-note">Linh căn chưa hóa Hỗn Độn. Lần vượt lôi kiếp sau: ${pct(g.chaosChance())}.</p>` : '');
        $('tribResult').innerHTML = `<h3 class="gold">${esc(g.realmLabel())}</h3><p>Xác suất ${pct(result.chance)} · hộ kiếp còn lại đã tiêu hao. Cảnh giới mới mở ra trước mắt.</p>${chaosNote}`;
        if (result.awaken) UI.toast(result.awaken.from + ' linh căn hóa thành Hỗn Độn linh căn!', { type: 'gold', title: 'Linh căn thức tỉnh' });
        $('tribHpText').textContent = num(s.hp) + ' / ' + num(g.stats().HP);
        $('tribHpFill').style.width = clamp(s.hp / g.stats().HP * 100, 0, 100) + '%';
        $('tribShieldText').textContent = 'Đã tiêu hao';
        $('tribShieldFill').style.width = '0%';
        $('tribStage').classList.add('is-success');
        $('tribStageHint').textContent = 'Thiên đạo công nhận · đạo cơ tái tạo';
        if (A.vfxCount('phi_thang', world)) UI.vfx?.tribStage({ kind: 'phi_thang', variant: world, fps: 10, size: 'calc(var(--hero-size) * 2.4)' });
        else UI.vfx?.effect('break', 'trib', { fps: 10 });
        UI.vfx?.burst('trib', '#ffe29a', 24);
        UI.vfx?.ring('trib');
        UI.vfx?.screenFlash('flash-gold', 900);
      } else {
        $('tribTitle').textContent = 'Đột phá thất bại';
        $('tribEyebrow').textContent = 'THIÊN ĐẠO · LÔI KIẾP VÔ TÌNH';
        $('tribSubtitle').textContent = g.realmLabel() + ' · đạo cơ chấn động';
        $('tribStatus').textContent = 'Đạo cơ chấn động, tu vi tổn hại.';
        $('tribResult').className = 'trib-result failure';
        $('tribResult').innerHTML = `<h3 class="danger">Thất bại</h3><p>Mất 15% tu vi · bảo hiểm hiện tại ${s.pity}/15. Lần sau xác suất cao hơn.</p>`;
        $('tribHpText').textContent = num(s.hp) + ' / ' + num(g.stats().HP);
        $('tribHpFill').style.width = clamp(s.hp / g.stats().HP * 100, 0, 100) + '%';
        $('tribShieldText').textContent = 'Đã tiêu hao';
        $('tribShieldFill').style.width = '0%';
        $('tribStage').classList.add('is-failure');
        $('tribStageHint').textContent = result.events.some(e => !e.success) ? 'Lôi kiếp xuyên thấu · đạo cơ tổn hại' : 'Phá cảnh chưa thành · tiếp tục tích lũy';
        UI.vfx?.effect('hit', 'trib');
        UI.vfx?.screenFlash('flash-red', 700);
      }
      $('tribRealmChip').textContent = g.realmLabel();
      this.actor = { gender: s.gender, realm: s.realm };
      this.heroFrame();
      const events = result?.events || [];
      $('tribHeadTags').innerHTML = `<span>${pct(result.chance)} xác suất</span><span>${s.pity}/15 bảo hiểm</span><span>${events.reduce((n, e) => n + e.bolts, 0)} đạo lôi</span><span>Hộ kiếp đã tiêu hao</span>`;
      $('tribOverlayChance').textContent = pct(result?.chance ?? g.chance());
      $('tribReduction').textContent = pct(s.reduction);
      $('tribShieldSummary').textContent = 'Đã tiêu hao';
      $('tribPitySummary').textContent = s.pity + '/15';
      $('tribCounter').textContent = result.success ? 'Đạo tâm bất diệt' : 'Tĩnh tâm dưỡng sức';
      this.updateQi();
      $('tribEligibility').textContent = 'Kết quả đã được lưu · trở về tiên sơn để tiếp tục hành trình.';
      $('tribResult').focus({ preventScroll: true });
      store.write();
    },
    updatePage(force = false) {
      if (!this.pageOpen || this.active) return;
      const sig = UI.screens.tribulation?.signature?.() || '';
      if (force || sig !== this.sig) { this.renderPrep(); return; }
      const s = UI.s(), g = UI.g(), can = this.canStart();
      $('tribOverlayChance').textContent = pct(g.chance());
      $('tribReduction').textContent = pct(s.reduction);
      $('tribShieldSummary').textContent = pct(s.shield) + ' sinh lực';
      $('tribPitySummary').textContent = s.pity + '/15';
      $('tribStart').disabled = !can;
      this.updateQi();
      const hp = g.stats().HP;
      $('tribHpText').textContent = num(s.hp) + ' / ' + num(hp);
      $('tribHpFill').style.width = clamp(s.hp / hp * 100, 0, 100) + '%';
    },
    refreshPage() { this.updatePage(true); }
  };
  UI.tribulation = trib;
  UI.applySettings = applySettings;
  UI.isReduced = isReduced;
  UI.updateSceneEffects = updateSceneEffects;

  /* ======================================================================
     HÀNH ĐỘNG
     ====================================================================== */
  function safe(fn) {
    try { return fn(); } catch (e) { toast(e.message); console.warn('Hư Giới:', e.message); }
  }

  function run(name, el) {
    if (name === 'reincarnate') { if (UI.reincarnate) safe(() => UI.reincarnate()); return; }
    if (name === 'modalClose') { closeModal(); return; }
    if (name === 'modalConfirm') {
      if ($('modalLayer').hidden) return;
      const fn = modalAction;
      closeModal();
      if (fn && !store.locked) { store.catchUp(); safe(fn); store.write(); refresh(); }
      return;
    }
    if (!$('modalLayer').hidden) return;
    if (store.locked) { toast('Một tab khác đang chơi. Đóng tab kia rồi tải lại trang.'); return; }
    if (trib.pageOpen) {
      if (name === 'tribStart') { trib.start(); return; }
      if (name === 'tribClose' || name === 'tribReturn' || name === 'tribBack') { trib.close(); return; }
      if (trib.active) return;
    } else if (trib.active) return;
    store.catchUp();
    const handler = UI.actions[name];
    if (!handler) return;
    const result = safe(() => handler(el, el?.dataset || {}));
    if (result === UI.KEEP) return;
    store.write();
    if (result === UI.SOFT) soft(); else refresh();
  }

  /* ======================================================================
     SỰ KIỆN
     ====================================================================== */
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-shade')) { closeModal(); return; }
    if (!$('modalLayer').hidden && !e.target.closest('#modalLayer, #toast')) return;
    const moreToggle = e.target.closest('#moreMenuBtn');
    if (moreToggle && UI.s().created) { e.preventDefault(); toggleMoreMenu(); return; }
    const moreGo = e.target.closest('#moreMenu [data-more-go]');
    if (moreGo && UI.s().created) {
      e.preventDefault();
      const target = moreGo.dataset.moreGo;
      closeMoreMenu();
      safe(() => { store.catchUp(); go(target); });
      return;
    }
    if (!$('moreMenu')?.hidden && !e.target.closest('#moreMenu, #moreMenuBtn')) closeMoreMenu();
    const winBtn = e.target.closest('[data-window]');
    if (winBtn && !winBtn.closest('.win') && UI.s().created) {
      safe(() => {
        store.catchUp();
        if (winBtn.dataset.window === 'tribulation') {
          if (trib.pageOpen) trib.close();
          else go('tribulation');
        } else {
          if (trib.pageOpen) trib.closePage();
          wins.toggle(winBtn.dataset.window);
        }
      });
      return;
    }
    const nav = e.target.closest('[data-go]');
    if (nav && UI.s().created) { safe(() => { store.catchUp(); go(nav.dataset.go); }); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      UI.tabState[UI.current] = tab.dataset.tab;
      resetFilters();
      refresh();
      return;
    }
    const select = e.target.closest('[data-select]');
    if (select) { UI.view.selected = select.dataset.select; refresh(); return; }
    const b = e.target.closest('[data-act]');
    if (b) safe(() => run(b.dataset.act, b));
  });

  document.addEventListener('change', e => {
    if (store.locked || trib.active) return;
    if (['categoryFilter', 'qualityFilter'].includes(e.target.id)) safe(() => run('search', { dataset: {} }));
  });

  document.addEventListener('keydown', e => {
    if (UI.intro?.active || UI.tutorial?.active) return;
    if (e.key === 'Tab' && !$('modalLayer').hidden) {
      const els = [...$('modalLayer').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(x => x.offsetParent !== null);
      const first = els[0], last = els.at(-1);
      if (!first) { e.preventDefault(); $('modalLayer').querySelector('.game-modal').focus(); }
      else if (!$('modalLayer').contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      return;
    }
    if (trib.pageOpen) {
      if (e.key === 'Escape') {
        if (!$('modalLayer').hidden) closeModal();
        else if ($('tribDetails').open) { e.preventDefault(); $('tribDetails').open = false; $('tribDetails').querySelector('summary').focus(); }
        else if (trib.phase !== 'running') { e.preventDefault(); trib.close(); }
      }
      return;
    }
    if (trib.active) return;
    if (e.key === 'Escape') {
      if (!$('modalLayer').hidden) closeModal();
      else if (!$('moreMenu')?.hidden) closeMoreMenu({ focus: true });
      else if (wins.topId()) wins.close(wins.topId());
      return;
    }
    if (e.target.id === 'itemSearch' && e.key === 'Enter') { e.preventDefault(); safe(() => run('search', { dataset: {} })); return; }
    if (!store.ready || !UI.s().created || !$('modalLayer').hidden || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName) || e.ctrlKey || e.altKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (['1', '2', '3', '4'].includes(key)) {
      if (UI.current === 'combat') { e.preventDefault(); safe(() => run('skill', { dataset: { index: String(Number(key) - 1) } })); }
      return;
    }
    const map = { t: 'idle', l: 'combat', n: 'craft', c: 'character', i: 'character:bag', m: 'world', s: 'settings' };
    if (map[key]) safe(() => go(map[key]));
  });

  if (typeof root.addEventListener === 'function') {
    root.addEventListener('hashchange', () => {
      if (!store.ready || !UI.s().created) return;
      closeMoreMenu();
      hideItemTip();
      if (['running', 'settling'].includes(trib.phase)) {
        try { root.history.replaceState(null, '', '#tribulation'); } catch { /* file:// cũ */ }
        return;
      }
      const [id, tab] = String(root.location.hash || '#idle').replace(/^#\/?/, '').split('/');
      if (!UI.screens[id]) return;
      if (id === 'tribulation') { trib.openPage(); return; }
      if (trib.pageOpen) trib.closePage();
      if (tab) UI.tabState[id] = tab;
      if (id === 'idle') wins.closeAll();
      else wins.open(id);
      updateChrome();
      updateStage();
    });
    root.addEventListener('resize', () => { applyLayout(); positionMoreMenu(); trib.layoutScene(); });
    root.addEventListener('orientationchange', () => { applyLayout(); positionMoreMenu(); trib.layoutScene(); });
  }

  document.addEventListener('pointerover', e => {
    const cell = e.target.closest('.inventory-cell[data-select]');
    if (cell) showItemTip(cell);
  });
  document.addEventListener('pointerout', e => {
    const cell = e.target.closest('.inventory-cell[data-select]');
    if (cell && !cell.contains(e.relatedTarget)) hideItemTip();
  });
  document.addEventListener('focusin', e => {
    const cell = e.target.closest('.inventory-cell[data-select]');
    if (cell) showItemTip(cell);
  });
  document.addEventListener('focusout', e => {
    const cell = e.target.closest('.inventory-cell[data-select]');
    if (cell && !cell.contains(e.relatedTarget)) hideItemTip();
  });
  document.addEventListener('scroll', hideItemTip, true);

  /* ======================================================================
     VÒNG LẶP
     ====================================================================== */
  function tick() {
    if (!store.ready || document.hidden || store.locked) return;
    safe(() => {
      const beforeQi = UI.s().qi;
      const report = store.catchUp();
      if (trib.active) return;
      updateChrome();
      updateStage();
      updateSceneEffects();
      const absorbed = Math.max(0, UI.s().qi - beforeQi);
      if (absorbed > 0 && report?.seconds <= 3 && UI.current === 'idle' && !UI.s().auto && !UI.intro?.active && !trib.pageOpen && $('modalLayer').hidden && $('game')?.dataset.stage === 'idle') UI.vfx?.cultivationGain(absorbed);
      wins.map.forEach((w, id) => {
        const def = w.def, tab = tabOf(def);
        def.update?.(tab);
        const sig = def.signature?.(tab) ?? '';
        if (sig !== w.sig && !w.body.contains(document.activeElement)) wins.render(id);
      });
      updateTimers();
      if (trib.pageOpen) trib.updatePage();
      const st = UI.s();
      if (!trib.pageOpen && $('game')?.dataset.stage === 'idle' && !st.auto && st.settings.cultivationEffects && !isReduced() && Date.now() - lastIdleVfx > 14000) {
        lastIdleVfx = Date.now();
        UI.vfx?.effect('qi', 'hero', { fps: 10 });
        UI.vfx?.ring('hero', '#70d4e8');
      }
    });
  }
  setInterval(tick, 1000);
  setInterval(() => { if (store.ready && !document.hidden && !store.locked) { store.catchUp(); store.write(); } }, 15000);

  function animate(time) {
    if (trib.pageOpen && !document.hidden && time - lastFrameTime >= 235) {
      lastFrameTime = time; frameCount++;
      trib.heroFrame(frameCount);
    }
    if (store.ready && UI.s().created && !trib.active && !trib.pageOpen && !document.hidden && time - lastFrameTime >= 235) {
      lastFrameTime = time; frameCount++;
      stageFrame(frameCount, isReduced());
    }
    requestAnimationFrame(animate);
  }

  motionQuery?.addEventListener?.('change', () => { if (store.ready && UI.s().created) applySettings(); });
  store.setBusy(() => trib.active);
  applyLayout();
  requestAnimationFrame(animate);

  Object.assign(UI, {
    toast, modal, closeModal, go, refresh, soft, run, safe,
    updateChrome, updateStage, updateTimers, heroAttack,
    tabOf: id => tabOf(UI.screens[id]),
    animate, resetFilters, toastState,
    buildShell() { applyLayout(); buildMenu(); buildLog(); buildHeroParticles(); updateChrome(); updateStage(); updateSceneEffects(); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
