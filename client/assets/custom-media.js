/* Hư Giới · asset gốc nghề phụ và Kinh Mạch Đồ.
   Toàn bộ 15 WebP được lưu cùng repository; không phụ thuộc tệp ZIP riêng. */
(function (root) {
  'use strict';
  const BASE = 'media/assets/custom/2026-11/';
  const MEDIA = Object.freeze({
    installed: true,
    base: BASE,
    backgrounds: Object.freeze({
      dan: BASE + 'workshops/dan-cac.webp',
      khi: BASE + 'workshops/lo-ren.webp'
    }),
    furnace: BASE + 'workshops/lo-dan.webp',
    workshop(gender, tab, animate = true) {
      const who = gender === 'nu' ? 'nu' : 'nam';
      const job = tab === 'khi' ? 'ren-vu-khi' : 'luyen-dan';
      return BASE + 'animations/' + who + '/' + job + (animate ? '' : '-still') + '.webp';
    },
    meridian(gender, tone = 'xanh') {
      const who = gender === 'nu' ? 'nu' : 'nam';
      return BASE + 'meridians/' + who + '-' + (tone === 'vang' ? 'vang' : 'xanh') + '.webp';
    }
  });
  root.HU_CUSTOM_MEDIA = MEDIA;
  if (typeof module !== 'undefined' && module.exports) module.exports = MEDIA;
})(typeof window !== 'undefined' ? window : globalThis);
