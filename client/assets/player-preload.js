/* Chỉ giữ ảnh đạo thân WebP ưu tiên để tải nhanh và tránh nạp lại.
 * Nạp sau preload-manifest.js và trước platform/loader.js. */
(function (root) {
  'use strict';
  if (!Array.isArray(root.HU_PRELOAD)) return;
  const base = 'media/assets/chars/player/realistic/';
  const priority = ['nam', 'nu'].flatMap(g => [
    base + g + '/portrait.webp', base + g + '/thien_dinh/00.webp'
  ]);
  root.HU_PRELOAD = [...priority, ...root.HU_PRELOAD.filter(src =>
    !String(src).startsWith('media/assets/chars/player/') && !priority.includes(src))];
})(typeof window !== 'undefined' ? window : globalThis);
