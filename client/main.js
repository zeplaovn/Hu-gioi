/* HƯ GIỚI · ĐIỂM VÀO */
(function (root) {
  'use strict';
  const UI = root.HU_UI, H = root.HU_GAME;
  if (!UI || typeof UI.boot !== 'function') {
    console.error('Hư Giới: thiếu lớp giao diện. Kiểm tra thứ tự thẻ script.');
    return;
  }
  /* Engine đang được viết lại: không khởi động UI trên nền thiếu luật, chỉ báo rõ phần còn thiếu. */
  if (!H || !H.READY) {
    const loading = document.getElementById('loading');
    if (loading) loading.hidden = true;
    const note = document.createElement('main');
    note.setAttribute('role', 'status');
    note.style.cssText = 'max-width:34rem;margin:20vh auto;padding:1.5rem;color:#e8dcc0;font:1rem/1.6 system-ui,sans-serif';
    note.innerHTML = '<h1 style="font-size:1.4rem">Hư Giới · Đang viết lại backend</h1>' +
      '<p>Phần luật chơi (<code>engine/</code>) chưa hoàn thành nên game chưa thể chạy. Giao diện, dữ liệu thiết kế và tài nguyên vẫn giữ nguyên.</p>' +
      '<p>Còn thiếu ' + (H ? H.MISSING.length : '?') + ' mục. Xem <code>docs/engine-contract.md</code>.</p>';
    document.body.appendChild(note);
    console.warn('Hư Giới: engine chưa READY. Thiếu:', H && H.MISSING);
    return;
  }
  UI.boot();
})(typeof window !== 'undefined' ? window : globalThis);
