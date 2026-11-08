/* assets.js — đường dẫn ảnh cho bộ assets phẳng (v8). Mọi màn lấy đường dẫn từ đây, không tự ghép chuỗi.
 * Nhân vật: player/realistic/{nam|nu}/{thien_dinh|di_bo|tung_skill|guc_nga}/00..05.webp
 * Quái:     monster/<giới>/<mon_xxx|boss_x|final_boss*>/{dung_yen|tan_cong|tu_vong}/N.png */
(function (root) {
  'use strict';
  const BASE = 'media/assets/';
  const PLAYER = BASE + 'chars/player/realistic/';
  const ENEMY = BASE + 'enemies/';
  const BG_BASE = BASE + 'world/bg/';
  const MAP_BASE = BASE + 'world/map/';
  const ITEM_DB = root.HU_ITEM_INDEX || (typeof require === 'function' ? require('./item-index.js') : { sheets: {}, items: {} });
  const IDX = root.HU_ASSET_INDEX || (typeof require === 'function' ? require('./asset-index.js') : { player: {}, monster: {} });

  /* Cảnh giới (zone) -> đại giới. Khớp F.realm_map: 0-4 Hạ, 5-8 Linh, 9+ Tiên. */
  const worldOf = zone => zone < 5 ? 'ha_gioi' : zone < 9 ? 'linh_gioi' : 'tien_gioi';
  const WORLD_NAME = { ha_gioi: 'Hạ Giới', linh_gioi: 'Linh Giới', tien_gioi: 'Tiên Giới' };
  const wrap = (n, count) => ((Math.floor(n) % count) + count) % count + 1;

  /* ---- nhân vật: chỉ còn WebP bán hiện thực; mọi giới dùng chung đạo thân ---- */
  const gender = g => g === 'nu' ? 'nu' : 'nam';
  const HERO_ACTIONS = Object.freeze({
    dung_yen: 'thien_dinh', di_chuyen: 'di_bo',
    tan_cong: 'tung_skill', tu_vong: 'guc_nga'
  });
  const HERO_FRAMES = 6;
  const heroFrames = () => HERO_FRAMES;
  const heroSrc = (g, zone, action = 'dung_yen', n = 0) => {
    const folder = HERO_ACTIONS[action] || HERO_ACTIONS.dung_yen;
    const frame = ((Math.floor(Number(n) || 0) % HERO_FRAMES) + HERO_FRAMES) % HERO_FRAMES;
    return PLAYER + gender(g) + '/' + folder + '/' + String(frame).padStart(2, '0') + '.webp';
  };
  const heroPortrait = g => PLAYER + gender(g) + '/portrait.webp';
  const HERO = { width: 512, height: 512, anchorX: 256, anchorY: 472,
    bodyHeight: { dung_yen: 360, di_chuyen: 400, tan_cong: 400, tu_vong: 225 } };
  const heroCache = new Map();
  function preloadHero(g, zone, action = 'dung_yen') {
    const key = gender(g) + '/' + (HERO_ACTIONS[action] || HERO_ACTIONS.dung_yen);
    if (heroCache.has(key)) return heroCache.get(key);
    if (typeof Image === 'undefined') return [];
    const frames = Array.from({ length: HERO_FRAMES }, (_, i) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = heroSrc(g, zone, action, i);
      return image;
    });
    heroCache.set(key, frames);
    return frames;
  }

  /* ---- quái ----
   * thường    : mỗi cảnh giới một loài (Hạ 001-005, Linh 006-011, Tiên 012-015).
   * tinh anh  : loài kế tiếp trong cùng giới.
   * boss      : boss của giới (Hạ chưa có boss riêng nên dùng Cáo Truyền Thuyết; Hỗn Độn dành cho Đạo Tổ).
   * boss kiếp : boss cuối của giới. */
  const MOBS = {
    ha_gioi: ['mon_001', 'mon_002', 'mon_003', 'mon_004', 'mon_005'],
    linh_gioi: ['mon_006', 'mon_007', 'mon_008', 'mon_009', 'mon_010', 'mon_011'],
    tien_gioi: ['mon_012', 'mon_013', 'mon_014', 'mon_015']
  };
  const BOSSES = { ha_gioi: ['final_boss_01'], linh_gioi: ['boss_1', 'boss_2'], tien_gioi: ['boss_3', 'boss_4'] };
  const FINALS = { ha_gioi: 'final_boss_01', linh_gioi: 'final_boss_2', tien_gioi: 'final_boss_3' };
  const FIRST = { ha_gioi: 0, linh_gioi: 5, tien_gioi: 9 };

  function enemyDir(zone, kind = 'thường') {
    const w = worldOf(zone), list = MOBS[w], i = Math.max(0, zone - FIRST[w]);
    if (zone >= 13 && kind === 'boss kiếp') return 'hon_don/final_boss';
    if (kind === 'boss kiếp') return `${w}/${FINALS[w]}`;
    if (kind === 'boss') return `${w}/${BOSSES[w][i % BOSSES[w].length]}`;
    if (kind === 'tinh anh') return `${w}/${list[(i + 1) % list.length]}`;
    return `${w}/${list[i % list.length]}`;
  }
  /* Thư mục thật: quái thường nằm trong enemies/mon/<giới>/<mã>, boss nằm trong
   * enemies/boss/<mã>. "hon_don/final_boss" là boss cuối dùng chung final_boss_4. */
  function enemyPath(zone, kind) {
    const dir = enemyDir(zone, kind), [world, name] = dir.split('/');
    if (name === 'final_boss' && world === 'hon_don') return ENEMY + 'boss/final_boss_4';
    if (name.startsWith('boss') || name.startsWith('final_boss')) return ENEMY + 'boss/' + name;
    return ENEMY + 'mon/' + dir;
  }
  const enemyFrames = (zone, kind, action) => IDX.monster[`${enemyDir(zone, kind)}/${action}`] || 1;
  const enemySrc = (zone, kind, action = 'dung_yen', n = 0) =>
    `${enemyPath(zone, kind)}/${action}/${wrap(n, enemyFrames(zone, kind, action))}.png`;

  /* ---- nền, bản đồ, logo ---- */
  const BG = {
    ha_gioi: BG_BASE + 'ha_gioi/day/xuan.webp',
    linh_gioi: BG_BASE + 'linh_gioi/day/xuan.webp',
    tien_gioi: BG_BASE + 'tien_gioi/bg.webp',
    home: BG_BASE + 'background.webp',
    tribulation: BG_BASE + 'dai_loi_kiep.webp',
    combat: BG_BASE + 'bi_canh.webp',
    combatFallback: BG_BASE + 'bi_canh.png',
    forge: BG_BASE + 'room/luyen_khi.webp',
    talisman: BG_BASE + 'room/ve_phu.webp',
    garden: BASE + 'ui/linh_dien/BG.webp',
    logo: BG_BASE + 'logo.webp' /* có kèm logo.png */
  };
  const MAPS = { ha_gioi: MAP_BASE + 'MAP-HG.webp', linh_gioi: MAP_BASE + 'MAP-LG.webp', tien_gioi: MAP_BASE + 'MAP-TG.webp' };
  const SEASON_FILES = { spring: 'xuan', summer: 'ha', autumn: 'thu', winter: 'dong' };
  const zoneBg = (zone, season = 'spring', phase = 'day') => worldOf(zone) === 'tien_gioi' ? BG.tien_gioi
    : `${BG_BASE}${worldOf(zone)}/${phase === 'night' ? 'night' : 'day'}/${SEASON_FILES[season] || 'xuan'}.webp`;
  const INTRO = Array.from({ length: 5 }, (_, i) => `${BASE}world/story/intro/${i + 1}.webp`);
  const SEASONS = { spring: 'mua_xuan', summer: 'mua_ha', autumn: 'mua_thu', winter: 'mua_dong' };
  const seasonSprite = (season, n = 0) => `${BASE}world/vfx/leaf/${SEASONS[season] || SEASONS.spring}/${wrap(n, 3)}.png`;

  /* ---- hiệu ứng khung hình ----
   * Bộ Hu-gioi dùng chuỗi 8 khung PNG (không phải sprite sheet). Mỗi hiệu ứng
   * được phát bằng cách đổi src theo nhịp thời gian trong client/ui/vfx.js. */
  const VFX_BASE = BASE + 'world/vfx/';
  const VFX = {
    loi_kiep: { ha_gioi: 8, linh_gioi: 8, tien_gioi: 8, hon_don: 8 },
    dot_pha: { ha_gioi: 8 },
    phi_thang: { linh_gioi: 8, tien_gioi: 8, hon_don: 8 },
    chien_dau: {
      linh_khi: 8, ke_dich: 8, nhan_vat: 8, trung_don: 8,
      ho_thuan: 8, linh_phu: 8, phi_thang: 8,
      hoi_phuc: { mau_01: 8, mau_02: 8 }
    }
  };
  /* Bộ hiệu ứng "hu_gioi" cũ đã được thay bằng bộ mới: ánh xạ tên cũ sang chuỗi khung mới. */
  const VFX_ALIAS = {
    slash: ['chien_dau', 'nhan_vat'], hit: ['chien_dau', 'trung_don'], bolt: ['chien_dau', 'linh_khi'],
    break: ['dot_pha', 'ha_gioi'], heal: ['chien_dau', 'hoi_phuc/mau_01'], qi: ['chien_dau', 'linh_khi']
  };
  const resolveVfx = (kind, variant) => kind === 'hu_gioi' && VFX_ALIAS[variant] ? VFX_ALIAS[variant] : [kind, variant];
  const vfxCount = (kind0, variant0) => {
    const [kind, variant] = resolveVfx(kind0, variant0);
    let node = VFX[kind];
    for (const part of String(variant || '').split('/').filter(Boolean)) node = node && node[part];
    return Number.isInteger(node) ? node : 0;
  };
  const vfxFrames = (kind0, variant0) => {
    const [kind, variant] = resolveVfx(kind0, variant0);
    const n = vfxCount(kind, variant);
    if (!n) return [];
    const dir = VFX_BASE + kind + '/' + String(variant || '').replace(/^\/+|\/+$/g, '') + '/';
    return Array.from({ length: n }, (_, i) => dir + (i + 1) + '.png');
  };
  const vfxSrc = (kind, variant, n = 0) => {
    const list = vfxFrames(kind, variant);
    return list.length ? list[((Math.floor(n) % list.length) + list.length) % list.length] : '';
  };
  /* Đại giới của lôi kiếp: Hạ Giới, Linh Giới, Tiên Giới và Hỗn Độn (Đạo Tổ). */
  const tribWorld = realm => realm >= 13 ? 'hon_don' : realm >= 9 ? 'tien_gioi' : realm >= 5 ? 'linh_gioi' : 'ha_gioi';
  const vfxCache = new Map();
  function preloadVfx(kind, variant) {
    const key = kind + '/' + variant;
    if (vfxCache.has(key)) return vfxCache.get(key);
    const list = vfxFrames(kind, variant);
    if (!list.length || typeof Image === 'undefined') return [];
    const imgs = list.map(src => { const im = new Image(); im.decoding = 'async'; im.src = src; return im; });
    vfxCache.set(key, imgs);
    return imgs;
  }

  /* ---- ảnh đã chọn cho giao diện ---- */
  /* Bộ asset hiện có không kèm icon kỹ năng riêng; dùng icon menu cùng tông. */
  const skillIcon = i => menuIcon(((Math.max(1, i) - 1) % 4) + 1);
  const menuIcon = n => `${BASE}ui/icon/menu/ICON-MENU-${String(n).padStart(3, '0')}-40.png`;
  const farm = n => `${BASE}ui/linh_dien/UI-FARM-${String(n).padStart(3, '0')}.png`;

  /* ---- tiền tệ ----
   * Ba biểu tượng gốc: linh thạch hạ phẩm (lam), thượng phẩm (tím) và tiên ngọc (ngọc bích).
   * Trung/Thượng/Cực dùng chung biểu tượng thượng phẩm; các bậc Tiên tinh dùng tiên ngọc. */
  const MONEY = {
    low: BASE + 'ui/icon/money/linh_thach_ha_pham.webp',
    high: BASE + 'ui/icon/money/linh_thach_thuong_pham.webp',
    jade: BASE + 'ui/icon/money/tien_ngoc.webp'
  };
  const moneyIcon = tier => MONEY[tier] || MONEY.high;

  /* ---- ảnh vật phẩm: ô gốc 128 × 128 px, đánh số từ 1.
   * Ô 1 ở (0,0); đi từ trái qua phải rồi từ trên xuống dưới.
   * background-size theo kích thước ô đang hiển thị để ảnh vẫn nét ở mọi cỡ UI. */
  const ITEM_CELL_SIZE = 128;
  const BLANK = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27128%27 height=%27128%27/%3E';
  const UNKNOWN_ITEM = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">' +
    '<rect x="5" y="5" width="118" height="118" rx="17" fill="#1e2835" stroke="#baa476" stroke-width="3"/>' +
    '<path d="M64 24 92 64 64 104 36 64Z" fill="#aa9167" fill-opacity=".23" stroke="#ecd5a2" stroke-width="5"/>' +
    '<circle cx="64" cy="64" r="12" fill="#d9c18b"/></svg>');
  const missingItem = () => ({ src: UNKNOWN_ITEM, style: '' });
  const itemCode = x => String(typeof x === 'string' ? x : (x && (x.imageCode || x.code)) || '');

  // 1-based ID => tọa độ pixel nguyên gốc, không lệ thuộc số trong hậu tố mã item.
  function itemTile(x) {
    const ref = ITEM_DB.items[itemCode(x)];
    if (typeof ref !== 'string') return null;
    const hash = ref.lastIndexOf('#');
    if (hash <= 0) return null;
    const sheet = ref.slice(0, hash), grid = ITEM_DB.sheets[sheet];
    const id = Number(ref.slice(hash + 1)), base = Number(ITEM_DB.indexBase);
    if (!Array.isArray(grid) || grid.length !== 2 ||
        !grid.every(n => Number.isInteger(n) && n > 0) ||
        !Number.isInteger(id) || !Number.isInteger(base)) return null;
    const offset = id - base;
    const [columns, rows] = grid;
    if (offset < 0 || offset >= columns * rows) return null;
    const column = offset % columns, row = Math.floor(offset / columns);
    return {
      sheet, id, column: column + 1, row: row + 1,
      x: column * ITEM_CELL_SIZE, y: row * ITEM_CELL_SIZE,
      width: ITEM_CELL_SIZE, height: ITEM_CELL_SIZE,
      columns, rows
    };
  }

  function itemImg(x) {
    const ref = ITEM_DB.items[itemCode(x)];
    if (typeof ref !== 'string' || !ref) return missingItem();
    if (!ref.includes('#')) return { src: BASE + ref, style: '' };
    const tile = itemTile(x);
    if (!tile) return missingItem();

    // Mỗi ô là 128×128 pixel trong file atlas. Khi icon thu nhỏ trên giao diện,
    // phần trăm tương đương phép cắt (x,y,128,128) mà không làm giãn toàn bộ atlas.
    const xPercent = tile.columns > 1 ? (tile.column - 1) * 100 / (tile.columns - 1) : 0;
    const yPercent = tile.rows > 1 ? (tile.row - 1) * 100 / (tile.rows - 1) : 0;
    return {
      src: BLANK,
      style: 'background-image:url("' + BASE + 'item/' + tile.sheet + '");' +
        'background-position:' + xPercent.toFixed(6) + '% ' + yPercent.toFixed(6) + '%;' +
        'background-size:' + (tile.columns * 100) + '% ' + (tile.rows * 100) + '%;' +
        'background-repeat:no-repeat'
    };
  }
  const itemSrc = x => itemImg(x).src;

  root.HU_ASSETS = { BASE, worldOf, WORLD_NAME, HERO, heroFrames, heroSrc, heroPortrait, preloadHero, enemyDir, enemyFrames, enemySrc, enemyPath, BG, MAPS, zoneBg, INTRO, seasonSprite, skillIcon, menuIcon, farm, MONEY, moneyIcon, itemSrc, itemImg, itemTile, ITEM_CELL_SIZE, VFX_BASE, VFX, vfxCount, vfxFrames, vfxSrc, tribWorld, preloadVfx };
  if (typeof module !== 'undefined') module.exports = root.HU_ASSETS;
})(typeof window !== 'undefined' ? window : globalThis);
