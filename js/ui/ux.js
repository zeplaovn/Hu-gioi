/* Các cải tiến trải nghiệm gắn thêm vào màn chơi (bọc hàm gốc, không sửa game.js):
   - ấn Đột phá hiển thị tiến độ tu vi và sáng lên khi đủ điều kiện
   - hiển thị trạng thái lưu game để người chơi an tâm khi để game chạy nền */
"use strict";
(function () {
  if (!TT.Game) return;
  const G = TT.Game.prototype;

  const refresh = G.refresh;
  G.refresh = function () {
    refresh.call(this);
    const U = this.U, p = this.p;
    if (!U || !U.breakBtn || !p) return;
    const need = p.need_exp(), ready = p.exp >= need, pct = Math.max(0, Math.min(100, Math.floor(p.exp / need * 100)));
    for (const b of [U.breakBtn, U.dockBreak]) {
      if (!b) continue;
      b.style.setProperty("--p", pct + "%");
      b.classList.toggle("ready", ready);
    }
    U.breakPct.textContent = ready ? "· sẵn sàng" : `· ${pct}%`;
  };

  const autosave = G.autosave;
  G.autosave = function () {
    autosave.call(this);
    if (TT.cloud && TT.cloud.enabled) return;                  // có tài khoản: chỉ báo đồng bộ do js/auth.js đảm nhiệm
    const el = this.U && this.U.save, ls = TT.sec && TT.sec.lastSave;
    if (!el || !ls) return;
    el.classList.toggle("bad", !ls.ok);
    el.textContent = ls.ok ? "Đã lưu " + new Date(ls.t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Chưa lưu được";
  };
})();
