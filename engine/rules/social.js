/* Miền luật: social — CHƯA VIẾT LẠI.
   Phụ trách: tri kỷ, đạo hữu, NPC Hạ Giới, luận đạo, PvP mô phỏng (dữ liệu ở data/social.js).
   Cài đặt: gắn phương thức vào API.Game.prototype trong install(). Mỗi lệnh trong "commands" phải có
   phương thức cùng tên nhận (payload, now) và trả kết quả cho UI; game.js sẽ báo thiếu lệnh qua HU_GAME.MISSING. */
(function (root) {
  'use strict';
  const domain = 'social';
  const commands = Object.freeze(['meetFriend', 'giftFriend', 'discuss', 'npcGift', 'npcOffer', 'duel']);
  function install(API) { /* TODO: API.Game.prototype.<lệnh> = function (payload, now) { ... } */ }
  const mod = Object.freeze({ domain, commands, install });
  (root.HU_RULES = root.HU_RULES || {})[domain] = mod;
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis);
