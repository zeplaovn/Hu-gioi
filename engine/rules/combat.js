/* Miền luật: combat — CHƯA VIẾT LẠI.
   Phụ trách: chiến đấu tự động/thủ công, kỹ năng, yêu thú, chiến lợi phẩm, di chuyển vùng.
   Cài đặt: gắn phương thức vào API.Game.prototype trong install(). Mỗi lệnh trong "commands" phải có
   phương thức cùng tên nhận (payload, now) và trả kết quả cho UI; game.js sẽ báo thiếu lệnh qua HU_GAME.MISSING. */
(function (root) {
  'use strict';
  const domain = 'combat';
  const commands = Object.freeze(['strike', 'skill', 'castManual', 'activateArtifact', 'setEnemyKind', 'travel']);
  function install(API) { /* TODO: API.Game.prototype.<lệnh> = function (payload, now) { ... } */ }
  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
