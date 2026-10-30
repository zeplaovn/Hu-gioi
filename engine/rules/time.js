/* Miền luật: time — CHƯA VIẾT LẠI.
   Phụ trách: advance(now, offline) — tiến trình theo thời gian, bế quan khi vắng mặt, tuổi/thọ nguyên, isDead(). Không có lệnh riêng.
   Cài đặt: gắn phương thức vào API.Game.prototype trong install(). Mỗi lệnh trong "commands" phải có
   phương thức cùng tên nhận (payload, now) và trả kết quả cho UI; game.js sẽ báo thiếu lệnh qua HU_GAME.MISSING. */
(function (root) {
  'use strict';
  const domain = 'time';
  const commands = Object.freeze([]);
  function install(API) { /* TODO: API.Game.prototype.<lệnh> = function (payload, now) { ... } */ }
  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
