/* Xác định người gọi API gameplay: Bearer JWT (Supabase).
   Trả { accountId, via } hoặc null. consent:false chỉ dành cho quyền dữ liệu cá nhân (xem/xóa), để người dùng đã rút đồng ý vẫn thực hiện được. */
'use strict';
const { GameError } = require('../errors.js');

function createPrincipalResolver({ jwt = null, verifyConsent = null } = {}) {
  return async function resolve(req, { consent = true } = {}) {
    const header = String(req.headers.authorization || '');
    if (header) {
      const m = /^Bearer ([A-Za-z0-9._-]+)$/.exec(header);
      if (!m || !jwt) throw new GameError('UNAUTHENTICATED', 'Thiếu hoặc sai thông tin đăng nhập.');
      const claims = await jwt.verify(m[1]);
      if (verifyConsent && consent) await verifyConsent(m[1], claims.sub);
      return { accountId: claims.sub, via: 'jwt' };
    }
    return null;
  };
}
module.exports = { createPrincipalResolver };
