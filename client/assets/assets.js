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
    logo: BG_BASE + 'logo.webp'
  };
  const MAPS = { ha_gioi: MAP_BASE + 'MAP-HG.webp', linh_gioi: MAP_BASE + 'MAP-LG.webp', tien_gioi: MAP_BASE + 'MAP-TG.webp' };
  const zoneBg = zone => BG[worldOf(zone)];

  /* ---- hiệu ứng khung hình ----
   * Bộ Hu-gioi dùng chuỗi 8 khung PNG (không phải sprite sheet). Mỗi hiệu ứng
   * được phát bằng cách đổi src theo nhịp thời gian trong client/ui/vfx.js. */
  const VFX_BASE = BASE + 'world/vfx/';
  const VFX = {
    hu_gioi: { slash: 8, hit: 8, bolt: 8, break: 8, heal: 8, qi: 8 },
    loi_kiep: { ha_gioi: 8, linh_gioi: 8, tien_gioi: 8, hon_don: 8 },
    dot_pha: { ha_gioi: 8 },
    phi_thang: { linh_gioi: 8, tien_gioi: 8, hon_don: 8 },
    chien_dau: {
      linh_khi: 8, ke_dich: 8, nhan_vat: 8, trung_don: 8,
      ho_thuan: 8, linh_phu: 8, phi_thang: 8,
      hoi_phuc: { mau_01: 8, mau_02: 8 }
    }
  };
  const vfxCount = (kind, variant) => {
    let node = VFX[kind];
    for (const part of String(variant || '').split('/').filter(Boolean)) node = node && node[part];
    return Number.isInteger(node) ? node : 0;
  };
  const vfxFrames = (kind, variant) => {
    const n = vfxCount(kind, variant);
    if (!n) return [];
    if (kind === 'hu_gioi') return Array.from({ length: n }, (_, i) => VFX_BASE + 'hu_gioi/' + variant + '_' + i + '.png');
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

  /* ---- vật phẩm ----
   * Bộ asset gốc là các bảng sprite 128×128. Dữ liệu vật phẩm không còn giữ
   * đường dẫn ảnh riêng; giao diện dùng icon đã cắt sẵn theo loại. Bốn biến
   * thể mỗi loại chọn theo bậc/phẩm để giao diện có sắc thái. */
  const ITEM_ICON = BASE + 'item/icons/';
  const ITEM_VARIANTS = {
    HERB: ['herb_0', 'herb_1', 'herb_2', 'herb_3'],
    EQ: ['eq_0', 'eq_1', 'eq_2', 'eq_3'],
    BT: ['bt_0', 'bt_1', 'bt_2', 'bt_3'],
    SEED: ['seed_0', 'seed_1', 'seed_2', 'seed_3'],
    MAT: ['mat_0', 'mat_1', 'mat_2', 'mat_3'],
    TAL: ['tal_0', 'tal_1', 'tal_2', 'tal_3'],
    GFT: ['gft_0', 'gft_1', 'gft_2', 'gft_3']
  };
  const PILL_SINGLE = ['pill_single_0', 'pill_single_1', 'pill_single_2', 'pill_single_3'];
  const PILL_PACK = ['pill_pack_0', 'pill_pack_1', 'pill_pack_2', 'pill_pack_3'];
  const hashOf = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const variantOf = (x, list) => list[(hashOf(x.code) + Math.max(0, Number(x.tier) || 0) * 3 + Math.max(0, Number(x.sub) || 0)) % list.length];

  function itemSrc(x) {
    if (!x) return '';
    const code = String(x.code || '');
    if (/^INK-(HG|LG|TG)$/.test(code)) return BASE + 'item/muc_luyen_phu/' + code + '.png';
    if (/^FERT-(HG|LG|TG)$/.test(code)) return BASE + 'item/phan_bon/' + code + '.png';
    if (/^CAT-(HG|LG|TG)$/.test(code)) return BASE + 'item/tinh_hoa_luyen_che/' + code + '.png';
    if (/^QITEM-HD-0[1-6]$/.test(code)) return BASE + 'item/vat_pham_nhiem_vu/' + code + '.png';
    if (x.kind === 'PILL') {
      const n = Number((code.match(/\d+/) || [0])[0]);
      return ITEM_ICON + variantOf(x, n && n <= 25 ? PILL_PACK : PILL_SINGLE) + '.png';
    }
    const list = ITEM_VARIANTS[x.kind];
    if (list) return ITEM_ICON + variantOf(x, list) + '.png';
    return BASE + 'item/vat_pham_nhiem_vu/QITEM-HD-01.png';
  }

  root.HU_ASSETS = { BASE, worldOf, WORLD_NAME, HERO, heroFrames, heroSrc, heroPortrait, preloadHero, enemyDir, enemyFrames, enemySrc, enemyPath, BG, MAPS, zoneBg, skillIcon, menuIcon, farm, MONEY, moneyIcon, itemSrc, VFX_BASE, VFX, vfxCount, vfxFrames, vfxSrc, tribWorld, preloadVfx };
  if (typeof module !== 'undefined') module.exports = root.HU_ASSETS;
})(typeof window !== 'undefined' ? window : globalThis);
