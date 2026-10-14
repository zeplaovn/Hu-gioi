/* Database-only consistency guard.
   If another device advances the save revision, the server copy wins and this tab reloads it. */
"use strict";
(function () {
  const cloud = TT.cloud;
  if (!cloud || !cloud.enabled || !cloud.onStatus) return;
  let reloading = false;
  cloud.onStatus(st => {
    if (!st || st.state !== "server-newer" || reloading) return;
    reloading = true;
    TT.sec.stale = true;
    if (TT.ui && TT.ui.toast) TT.ui.toast("Tài khoản vừa được cập nhật từ thiết bị khác. Đang tải lại dữ liệu máy chủ…", "info", 4000);
    setTimeout(() => location.reload(), 250);
  });
})();
