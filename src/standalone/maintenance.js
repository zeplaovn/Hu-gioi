/* Trang bảo trì độc lập: game chuyển người chơi sang đây (location.replace) khi máy chủ đang bảo trì, không che lên màn hình game.
   Hỏi server_status() định kỳ; hết bảo trì thì tự quay lại game. Không có ô đăng nhập: quản trị viên vào qua staff.html. */
"use strict";
(function () {
  const $ = id => document.getElementById(id), reason = $("reason"), retry = $("retry"), sub = $("sub");
  const DEFAULT = "Máy chủ đang bảo trì. Vui lòng quay lại sau.";
  async function check() {
    if (!TT.sb.ok) { reason.textContent = "Máy chủ chưa được cấu hình."; return; }
    try {
      const s = await TT.sb.rpc("server_status", {});
      if (s && !s.maintenance) { location.replace("./"); return; }
      reason.textContent = s && s.maintenance_reason ? String(s.maintenance_reason).slice(0, 500) : DEFAULT;
      sub.textContent = "Tự động kiểm tra lại mỗi 10 giây.";
    } catch (e) { sub.textContent = "Không kết nối được máy chủ, đang thử lại…"; }
  }
  retry.addEventListener("click", async () => { retry.disabled = true; await check(); retry.disabled = false; });
  check();
  setInterval(() => { if (document.visibilityState !== "hidden") check(); }, 10000);
})();
