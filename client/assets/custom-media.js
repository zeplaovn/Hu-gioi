/* Hư Giới · bộ hình ảnh nghề phụ và kinh mạch tùy chọn.
   Asset đi kèm được phân phối trong gói riêng. Chỉ bật installed sau khi đã chép đủ ảnh. */
(function (root) {
  'use strict';
  const BASE = 'media/assets/custom/2026-11/';
  const MEDIA = Object.freeze({
    installed: false,
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
    },
    // SVG có sẵn trong repository để đạo thể luôn hiển thị dù chưa cài gói WebP.
    meridianFallback(gender, tone = 'xanh') {
      const who = gender === 'nu' ? 'nu' : 'nam';
      return BASE + 'meridians/' + who + '-' + (tone === 'vang' ? 'vang' : 'xanh') + '-fallback.svg';
    }
  });
  root.HU_CUSTOM_MEDIA = MEDIA;
  if (typeof module !== 'undefined' && module.exports) module.exports = MEDIA;
})(typeof window !== 'undefined' ? window : globalThis);
