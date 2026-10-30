/* Miền luật: progression — CHƯA VIẾT LẠI.
   Phụ trách: tu vi theo thời gian, đột phá tiểu/đại cảnh giới, độ kiếp, thiên mệnh, trọng sinh, nâng cấp và thành tựu (checkMeta).
   Cài đặt: gắn phương thức vào API.Game.prototype trong install(). Mỗi lệnh trong "commands" phải có
   phương thức cùng tên nhận (payload, now) và trả kết quả cho UI; game.js sẽ báo thiếu lệnh qua HU_GAME.MISSING. */
(function (root) {
  'use strict';
  const domain = 'progression';
  const commands = Object.freeze(['absorb', 'upgrade', 'upgradeOffline', 'buyMeta', 'breakthrough', 'prestige', 'reincarnate', 'setAuto']);
  function install(API) { /* TODO: API.Game.prototype.<lệnh> = function (payload, now) { ... } */ }
  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
