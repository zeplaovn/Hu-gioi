/* HƯ GIỚI · ĐIỂM VÀO */
(function (root) {
  'use strict';
  const UI = root.HU_UI, H = root.HU_GAME;
  /* Khi engine chưa sẵn sàng, chỉ cho xem các lựa chọn tạo nhân vật, không mở phiên chơi. */
  if (!H || !H.READY) {
    const loading = document.getElementById('loading');
    if (loading) loading.hidden = true;
    const note = document.getElementById('engineNotice');
    if (note) note.hidden = false;
    const rebirth = document.getElementById('welcomeRebirth');
    if (rebirth) rebirth.textContent = 'Bản xem trước · chưa lưu tiến trình';
    const footnote = document.querySelector('#createForm .foot-note');
    if (footnote) footnote.hidden = true;
    const start = document.getElementById('startNew');
    if (start) start.disabled = true;
    if (UI && typeof UI.bootPreview === 'function') {
      UI.bootPreview();
    } else {
      document.querySelectorAll('#createForm input, #createForm button').forEach(control => { control.disabled = true; });
      if (note) note.textContent = 'Giao diện hoặc luật chơi chưa sẵn sàng; hiện chưa thể bắt đầu tu tiên.';
    }
    console.warn('Hư Giới: engine chưa READY. Thiếu:', H && H.MISSING);
    return;
  }
  if (!UI || typeof UI.boot !== 'function') {
    console.error('Hư Giới: thiếu lớp giao diện. Kiểm tra thứ tự thẻ script.');
    return;
  }
  UI.boot();
})(typeof window !== 'undefined' ? window : globalThis);
