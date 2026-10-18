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
  /* Thanh tiến độ nạp tài nguyên. Lần đầu vào game (chưa có bộ nhớ đệm) hiện thêm lời giải thích; các lần sau ảnh đã nằm trong cache nên thanh chạy gần như tức thì. */
  const SEEN = "tu_tien_assets_seen";
  let first = true;
  try { first = localStorage.getItem(SEEN) !== "1"; } catch (e) { /* không đọc được thì coi như lần đầu */ }
  const $ = id => document.getElementById(id);
  const onProgress = (done, total) => {
    const pct = total ? Math.round(done / total * 100) : 100, bar = $("ldBar"), fill = $("ldFill"), text = $("ldText"), note = $("ldNote");
    if (fill) fill.style.width = pct + "%";
    if (bar) bar.setAttribute("aria-valuenow", String(pct));
    if (text) text.textContent = `${first ? "Lần đầu vào game: đang tải tài nguyên" : "Đang nạp tài nguyên"}… ${pct}%`;
    if (note && first) note.textContent = "Chỉ tải một lần, những lần sau game mở nhanh hơn nhờ bộ nhớ đệm trình duyệt.";
  };
  const finish = () => { try { localStorage.setItem(SEEN, "1"); } catch (e) { /* bỏ qua */ } boot(); };
  TT.A.preload(onProgress).then(finish, finish);
})();
