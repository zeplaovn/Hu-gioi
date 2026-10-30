/* Trạng thái người chơi (schema V7) — CHƯA VIẾT LẠI.
   Cần cung cấp:
     VERSION            số phiên bản schema hiện hành (7)
     SUPPORTED_VERSIONS các bản lưu cũ còn đọc được ([4, 5, 6, 7])
     create(now)        state mới chưa tạo nhân vật
     normalize(raw, now) làm sạch + nâng cấp bản lưu về VERSION, trả null nếu không hợp lệ
   Danh sách trường state mà UI đang đọc: docs/engine-contract.md §3. */
(function (root) {
  'use strict';
  const VERSION = 7;
  const SUPPORTED_VERSIONS = Object.freeze([4, 5, 6, 7]);
  const todo = name => { const e = Error('Chưa cài đặt: state.' + name); e.code = 'NOT_IMPLEMENTED'; throw e; };
  const API = {
    VERSION,
    SUPPORTED_VERSIONS,
    implemented: false,
    create: () => todo('create'),
    normalize: () => todo('normalize')
  };
  root.HU_PLAYER_STATE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
