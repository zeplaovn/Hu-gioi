/* Điểm vào: nạp ảnh rồi mở màn tạo nhân vật. */
"use strict";
(function () {
  const start = () => { TT.game = new TT.Game(); TT.game.showCreate(); };
  const boot = () => { if (TT.cloud && TT.cloud.enabled) TT.auth.boot(start); else start(); };   // có Supabase: đăng nhập trước rồi mới vào game
  TT.A.preload().then(boot, boot);
})();
