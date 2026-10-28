/* HƯ GIỚI · ĐIỂM VÀO */
(function (root) {
  'use strict';
  const UI = root.HU_UI;
  if (!UI || typeof UI.boot !== 'function') {
    console.error('Hư Giới: thiếu lớp giao diện. Kiểm tra thứ tự thẻ script.');
    return;
  }
  UI.boot();
})(typeof window !== 'undefined' ? window : globalThis);
