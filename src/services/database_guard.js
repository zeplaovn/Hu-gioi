/* Database-only consistency guard.
   - If another device advances the save revision, the server copy wins and this tab reloads it.
   - Legacy local-save data controls are removed from Thiên Đạo Các. */
"use strict";
(function () {
  const cloud = TT.cloud;
  if (!cloud || !cloud.enabled || !cloud.onStatus) return;

  /* DB-only: export/import/wipe local save is no longer a supported gameplay path. */
  if (TT.meta) {
    delete TT.meta.exportText;
    delete TT.meta.importText;
    delete TT.meta.importInfo;
    delete TT.meta.wipe;
  }

  /* meta.js is shared gameplay code and may still contain the old "Dữ liệu" renderer.
     Hide that route centrally in DB-only mode, including after internal tab re-renders. */
  const G = TT.Game && TT.Game.prototype;
  if (G && typeof G.openHub === "function") {
    const openHub = G.openHub;
    G.openHub = function (tab = "up") {
      const result = openHub.call(this, tab === "data" ? "up" : tab);
      const hub = this.hub, box = hub && hub.box;
      if (!box || typeof MutationObserver === "undefined") return result;

      const clean = () => {
        if (!box.isConnected) return false;
        for (const btn of box.querySelectorAll(".hub-tab")) {
          if (btn.textContent.trim() === "Dữ liệu") btn.remove();
        }
        return true;
      };

      clean();
      const observer = new MutationObserver(() => {
        if (!clean()) observer.disconnect();
      });
      observer.observe(box, { childList: true, subtree: true });
      return result;
    };
  }

  let reloading = false;
  cloud.onStatus(st => {
    if (!st || st.state !== "server-newer" || reloading) return;
    reloading = true;
    TT.sec.stale = true;
    if (TT.ui && TT.ui.toast) TT.ui.toast("Tài khoản vừa được cập nhật từ thiết bị khác. Đang tải lại dữ liệu máy chủ…", "info", 4000);
    setTimeout(() => location.reload(), 250);
  });
})();
