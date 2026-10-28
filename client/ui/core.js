/* HƯ GIỚI · LÕI GIAO DIỆN
 * Kit dựng HTML, bộ lọc và cầu nối đến phiên chơi.
 * Chạy bằng script cổ điển để mở thẳng file:// được. */
(function (root) {
  'use strict';
  const H = root.HU_GAME, F = H.F, A = root.HU_ASSETS;
  if (!H || !F || !A) throw new Error('Thiếu lõi game. Kiểm tra thứ tự thẻ script.');
  const UI = root.HU_UI = root.HU_UI || {};

  /* ======================================================================
     1. KIT
     ====================================================================== */
  const $ = id => document.getElementById(id);
  const $$ = q => [...document.querySelectorAll(q)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = F.fmt;
  const money = F.format_linh_thach;
  const coinTier = name => /Tiên tinh|Hỗn Độn/.test(name) ? 'jade' : name === 'Hạ' ? 'low' : 'high';
  const coinImg = (name, cls = 'coin') => `<img class="${cls}" src="${esc(A.moneyIcon(coinTier(name)))}" alt="" aria-hidden="true" decoding="async">`;
  const coinLabel = name => `<span class="coin-label">${coinImg(name)}${esc(name)}</span>`;
  const moneyHTML = value => {
    const text = money(value);
    let name = 'Hạ';
    for (const [label, amount] of F.COINS) if (Number(value) >= amount) name = label;
    return `<span class="coin-value" title="${esc(text)}">${coinImg(name)}<span>${esc(text)}</span></span>`;
  };
  const pct = x => (x * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
  const duration = x => !Number.isFinite(x) ? '—'
    : x >= 86400 ? num(x / 86400) + ' ngày'
      : x >= 3600 ? num(x / 3600) + ' giờ'
        : x >= 60 ? num(x / 60) + ' phút'
          : Math.ceil(x) + ' giây';
  const abs = path => { try { return new URL(path, document.baseURI).href; } catch { return path; } };

  const row = (label, value) => `<div class="stat-line"><span>${label}</span><b>${value}</b></div>`;
  const btn = (label, act, data = '', disabled = false, style = 'btn-gold') =>
    `<button class="btn ${style}" data-act="${act}" ${data} ${disabled ? 'disabled' : ''}>${label}</button>`;
  const img = (key, cls = '') => {
    const x = H.item(key);
    const v = A.itemImg(x);
    return `<img class="${cls}" loading="lazy" decoding="async" src="${v.src}"${v.style ? ` style="${esc(v.style)}"` : ''} alt="${esc(x?.name || '')}">`;
  };
  const codeAttr = key => `data-code="${esc(key)}"`;
  const bar = (percent, cls = '', id = '') =>
    `<div class="meter-bar ${cls}"><i ${id ? `id="${id}"` : ''} style="width:${clamp(percent, 0, 100)}%"></i></div>`;
  const card = (title, body, { cls = '', eyebrow = '', aside = '' } = {}) =>
    `<section class="card ${cls}">${eyebrow || title || aside ? `<header class="card-head"><div>${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}${title ? `<h3>${title}</h3>` : ''}</div>${aside}</header>` : ''}${body}</section>`;
  const empty = text => `<p class="empty-note">${text}</p>`;
  const tabs = (items, active) =>
    `<div class="tabbar" role="tablist">${items.map(t =>
      `<button role="tab" class="tab ${t.id === active ? 'active' : ''}" aria-selected="${t.id === active}" data-tab="${t.id}">${t.icon ? `<span aria-hidden="true">${t.icon}</span>` : ''}${t.label}${t.badge ? `<em>${t.badge}</em>` : ''}</button>`).join('')}</div>`;
  const live = end => `<span class="live" data-end="${end}"></span>`;

  /* Mô tả một bảng hiệu ứng {attack,hp,guard,rate,crit,dodge,regen} thành chữ: "Phòng thủ +12% · Sinh lực +5%". */
  UI.rootEffectText = (effects, weight = 1) => {
    const labels = { attack: 'Công kích', hp: 'Sinh lực', guard: 'Phòng thủ', rate: 'Tốc tu', crit: 'Bạo kích', dodge: 'Né tránh', regen: 'Hồi sinh lực/giây' };
    return Object.entries(effects || {}).map(([k, v]) => labels[k] + ' +' + (v * weight * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) +
      (['crit', 'dodge', 'regen'].includes(k) ? ' điểm %' : '%')).join(' · ');
  };
  UI.kit = { $, $$, esc, clamp, num, money, moneyHTML, coinLabel, pct, duration, abs, row, btn, img, codeAttr, bar, card, empty, tabs, live };

  /* ======================================================================
     2. DỮ LIỆU HIỂN THỊ
     ====================================================================== */
  UI.data = {
    ELEMENTS: [['Kim', '#edca62'], ['Mộc', '#69dba0'], ['Thủy', '#65ceff'], ['Hỏa', '#f28e64'], ['Thổ', '#c2a779']],
    SKILLS: [
      { name: 'Thanh Vân Kiếm Quyết', desc: 'Kiếm khí gây sát thương.', mp: .12, cd: 5 },
      { name: 'Thái Hư Chân Kinh', desc: 'Chân khí xuyên phá phòng ngự.', mp: .15, cd: 7 },
      { name: 'Hộ Thể Kim Quang', desc: 'Hồi 26% sinh lực.', mp: .18, cd: 12 },
      { name: 'Cửu Thiên Lôi Động', desc: 'Lôi pháp sát thương lớn.', mp: .26, cd: 15 }
    ],
    QUESTS: H.QUESTS,
    ART: {
      workshop: A.BG.forge,
      talisman: A.BG.talisman,
      storm: A.BG.tribulation,
      world: A.BG.home
    },
    INK: tier => 'INK-' + (tier < 5 ? 'HG' : tier < 9 ? 'LG' : 'TG'),
    FARM: n => A.farm(n)
  };

  /* ======================================================================
     3. BỘ LỌC & PHÂN TRANG
     ====================================================================== */
  const PAGE_SIZE = 30;
  const fold = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  const lists = {
    PAGE_SIZE,
    matches(x) {
      const v = UI.view;
      return (v.category === 'Tất cả' || x.category === v.category)
        && (!v.query || fold(x.name + ' ' + x.code + ' ' + x.originalName).includes(fold(v.query)));
    },
    controls({ categories = null, quality = false, placeholder = 'Tên hoặc mã' } = {}) {
      const v = UI.view;
      const cats = categories || ['Tất cả', ...new Set(H.ITEMS.map(x => x.category))];
      return `<div class="catalog-controls">
        <label>Tìm vật phẩm<input id="itemSearch" value="${esc(v.query)}" placeholder="${esc(placeholder)}"></label>
        ${cats.length > 2 ? `<label>Nhóm<select id="categoryFilter">${cats.map(c => `<option ${c === v.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>` : ''}
        ${quality ? `<label>Phẩm chất<select id="qualityFilter">${F.SUBPHAM.map((n, i) => `<option value="${i}" ${i === v.quality ? 'selected' : ''}>${n} phẩm</option>`).join('')}</select></label>` : ''}
        ${btn('Tìm', 'search', '', false, 'btn-outline')}
      </div>`;
    },
    pager(total) {
      const max = Math.max(1, Math.ceil(total / PAGE_SIZE));
      UI.view.page = clamp(UI.view.page, 0, max - 1);
      const page = UI.view.page;
      return `<div class="pagination">${btn('Trước', 'prev', '', page === 0, 'btn-outline')}<span>${total} mục · Trang ${page + 1}/${max}</span>${btn('Sau', 'next', '', page >= max - 1, 'btn-outline')}</div>`;
    },
    slice: xs => xs.slice(UI.view.page * PAGE_SIZE, UI.view.page * PAGE_SIZE + PAGE_SIZE)
  };
  UI.lists = lists;

  /* ======================================================================
     4. PHIÊN CHƠI
     ====================================================================== */
  const session = new root.HU_LOCAL_SESSION.LocalSession();
  UI.session = session;
  UI.store = root.HU_LOCAL_STORE.createStore(session, message => UI.toast(message));
  // Chỉ đọc khi render; mọi thay đổi gameplay đi qua command().
  UI.g = () => session.game;
  UI.s = () => session.game.s;
  UI.command = (type, payload = {}) => UI.store.dispatch(type, payload);
  UI.preference = (key, value) => UI.store.preference(key, value);
  session.subscribe(event => { if (event.type === 'death') UI.onDeath?.(event.report); });

  /* ======================================================================
     5. TRẠNG THÁI GIAO DIỆN
     ====================================================================== */
  UI.view = { category: 'Tất cả', query: '', page: 0, quality: 0, selected: '', onlyReady: false };
  UI.screens = {};
  UI.actions = {};
  UI.tabState = {};
  UI.current = 'idle';
  UI.KEEP = Symbol('keep');
  UI.SOFT = Symbol('soft');
  UI.register = def => { UI.screens[def.id] = def; };
  UI.action = (name, fn) => { UI.actions[name] = fn; };

  UI.action('search', () => {
    const v = UI.view;
    v.query = $('itemSearch')?.value || '';
    v.category = $('categoryFilter')?.value || 'Tất cả';
    v.quality = Number($('qualityFilter')?.value || 0);
    v.page = 0;
  });
  UI.action('prev', () => { UI.view.page = Math.max(0, UI.view.page - 1); });
  UI.action('next', () => { UI.view.page++; });
})(typeof window !== 'undefined' ? window : globalThis);
