/* Miền luật: inventory — CHƯA VIẾT LẠI.
   Phụ trách: hành trang, mua/bán, trang bị, học công pháp, dùng vật phẩm, đấu giá (bid).
   Cài đặt: gắn phương thức vào API.Game.prototype trong install(). Mỗi lệnh trong "commands" phải có
   phương thức cùng tên nhận (payload, now) và trả kết quả cho UI; game.js sẽ báo thiếu lệnh qua HU_GAME.MISSING. */
(function (root) {
  'use strict';
  const domain = 'inventory';
  const commands = Object.freeze(['buy', 'sell', 'equip', 'learn', 'activate', 'use', 'sellYao', 'bid']);
  function install(API) { /* TODO: API.Game.prototype.<lệnh> = function (payload, now) { ... } */ }
  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
