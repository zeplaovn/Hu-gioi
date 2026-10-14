/* Điểm vào: game online-only, dữ liệu được nạp từ database trước khi tạo Game. */
"use strict";
(function () {
  const start = () => { TT.game = new TT.Game(); TT.game.showCreate(); };
  const unavailable = () => {
    const app = document.getElementById("app");
    if (app) app.replaceChildren(h("div", { class: "auth-screen" }, h("div", { class: "auth-card", role: "alert" },
      h("h1", { class: "auth-title" }, "Không kết nối được máy chủ"),
      h("p", { class: "center" }, "Thiên Vân Đại Lục hiện dùng dữ liệu tài khoản trên máy chủ. Cấu hình Supabase chưa sẵn sàng nên game không thể chạy ngoại tuyến."))));
  };
  const boot = () => (TT.cloud && TT.cloud.enabled && TT.auth ? TT.auth.boot(start) : unavailable());
  TT.A.preload().then(boot, boot);
})();
