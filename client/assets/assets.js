/* assets.js — đường dẫn ảnh cho bộ assets phẳng (v8). Mọi màn lấy đường dẫn từ đây, không tự ghép chuỗi.
 * Nhân vật: player/{nam|nu}/{ha_gioi|linh_gioi|tien_gioi}/{dung_yen|di_chuyen|tan_cong}/N.png
 * Quái:     monster/<giới>/<mon_xxx|boss_x|final_boss*>/{dung_yen|tan_cong|tu_vong}/N.png */
(function (root) {
  'use strict';
  const BASE = 'media/assets/';
  const PLAYER = BASE + 'chars/player/';
  const ENEMY = BASE + 'enemies/';
  const BG_BASE = BASE + 'world/bg/';
  const MAP_BASE = BASE + 'world/map/';
  const ITEM_DB = root.HU_ITEM_INDEX || (typeof require === 'function' ? require('./item-index.js') : { sheets: {}, items: {} });
  const IDX = root.HU_ASSET_INDEX || (typeof require === 'function' ? require('./asset-index.js') : { player: {}, monster: {} });

  /* Cảnh giới (zone) -> đại giới. Khớp F.realm_map: 0-4 Hạ, 5-8 Linh, 9+ Tiên. */
  const worldOf = zone => zone < 5 ? 'ha_gioi' : zone < 9 ? 'linh_gioi' : 'tien_gioi';
  const WORLD_NAME = { ha_gioi: 'Hạ Giới', linh_gioi: 'Linh Giới', tien_gioi: 'Tiên Giới' };
  const wrap = (n, count) => ((Math.floor(n) % count) + count) % count + 1;

  /* ---- nhân vật ---- */
  const gender = g => g === 'nu' ? 'nu' : 'nam';
  const heroFrames = (g, zone, action) => IDX.player[`${gender(g)}/${worldOf(zone)}/${action}`] || 1;
  const heroSrc = (g, zone, action = 'dung_yen', n = 0) =>
    `${PLAYER}${gender(g)}/${worldOf(zone)}/${action}/${wrap(n, heroFrames(g, zone, action))}.png`;
  const heroPortrait = (g, zone) => `${PLAYER}${gender(g)}/${worldOf(zone)}/portrait.png`;
  // Cùng quy chuẩn với tools/player-sprites.json và các biến --player-* trong CSS.
  const HERO = { width: 512, height: 384, anchorX: 256, anchorY: 352,
    bodyHeight: { dung_yen: 198, di_chuyen: 236, tan_cong: 236 } };
  const heroCache = new Map();
  function preloadHero(g, zone, action = 'dung_yen') {
    const key = `${gender(g)}/${worldOf(zone)}/${action}`;
    if (heroCache.has(key)) return heroCache.get(key);
    if (typeof Image === 'undefined') return [];
    const frames = Array.from({ length: heroFrames(g, zone, action) }, (_, i) => {
      const image = new Image(); image.src = heroSrc(g, zone, action, i); return image;
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
    ha_gioi: BG_BASE + 'idle_ha_gioi.webp',
    linh_gioi: BG_BASE + 'idle_linh_gioi.webp',
    tien_gioi: BG_BASE + 'idle_tien_gioi.webp',
    home: BG_BASE + 'background.webp',
    tribulation: BG_BASE + 'dai_loi_kiep.webp',
    forge: BG_BASE + 'room_luyen_khi.webp',
    talisman: BG_BASE + 'room_ve_phu.webp',
    logo: BG_BASE + 'logo.webp' /* có kèm logo.png */
  };
  const MAPS = { ha_gioi: MAP_BASE + 'MAP-HG.png', linh_gioi: MAP_BASE + 'MAP-LG.png', tien_gioi: MAP_BASE + 'MAP-TG.png' };
  const zoneBg = zone => BG[worldOf(zone)];
  const INTRO = Array.from({ length: 5 }, (_, i) => `${BASE}world/story/intro/${i + 1}.png`);
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
    low: BASE + 'ui/icon/money/linh_thach_ha_pham.png',
    high: BASE + 'ui/icon/money/linh_thach_thuong_pham.png',
    jade: BASE + 'ui/icon/money/tien_ngoc.png'
  };
  const moneyIcon = tier => MONEY[tier] || MONEY.high;

  /* ---- vật phẩm ----
   * Ảnh vật phẩm nằm trong các bảng sprite 128×128 (media/assets/item/*.png). Số ô trong item-index bắt đầu từ 1
   * (trái → phải, trên → xuống). Giao diện giữ thẻ <img> nhưng src là ảnh trong suốt 128×128 và ảnh thật được cắt
   * bằng CSS (background-position tính theo %), nên đổi kích thước ô thế nào cũng đúng. Mã ngoài bảng dùng ảnh riêng. */
  const BLANK = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27128%27 height=%27128%27/%3E';
  function itemImg(x) {
    const ref = ITEM_DB.items[String(x && x.code || '')];
    if (!ref) return { src: BASE + 'item/vat_pham_nhiem_vu/QITEM-HD-01.png', style: '' };
    const at = ref.indexOf('#');
    if (at < 0) return { src: BASE + ref, style: '' };
    const sheet = ref.slice(0, at), k = Number(ref.slice(at + 1)) - ITEM_DB.indexBase, [cols, rows] = ITEM_DB.sheets[sheet];
    const px = cols > 1 ? (k % cols) / (cols - 1) * 100 : 0, py = rows > 1 ? Math.floor(k / cols) / (rows - 1) * 100 : 0;
    return { src: BLANK, style: `background:url(${BASE}item/${sheet}) ${px.toFixed(3)}% ${py.toFixed(3)}%/${cols * 100}% ${rows * 100}% no-repeat` };
  }
  const itemSrc = x => itemImg(x).src;

  root.HU_ASSETS = { BASE, worldOf, WORLD_NAME, HERO, heroFrames, heroSrc, heroPortrait, preloadHero, enemyDir, enemyFrames, enemySrc, enemyPath, BG, MAPS, zoneBg, INTRO, seasonSprite, skillIcon, menuIcon, farm, MONEY, moneyIcon, itemSrc, itemImg, VFX_BASE, VFX, vfxCount, vfxFrames, vfxSrc, tribWorld, preloadVfx };
  if (typeof module !== 'undefined') module.exports = root.HU_ASSETS;
})(typeof window !== 'undefined' ? window : globalThis);
