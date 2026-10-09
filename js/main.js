/* Điểm vào: nạp ảnh rồi mở màn tạo nhân vật. */
"use strict";
(function () {
  const start = () => { TT.game = new TT.Game(); TT.game.showCreate(); };
  TT.A.preload().then(start, start);
})();
