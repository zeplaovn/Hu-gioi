/* Xác định người gọi API gameplay: Bearer JWT (Supabase) hoặc cookie phiên của AuthService thử nghiệm.
   Trả { accountId, via } hoặc null. Cookie chỉ được chấp nhận kèm kiểm tra Origin cho mọi yêu cầu ghi (CSRF). */
'use strict';
const { GameError } = require('../errors.js');

function createPrincipalResolver({ jwt = null, legacy = null, verifyConsent = null } = {}) {
  return async function resolve(req) {
    const header = String(req.headers.authorization || '');
    if (header) {
      const m = /^Bearer ([A-Za-z0-9._-]+)$/.exec(header);
      if (!m || !jwt) throw new GameError('UNAUTHENTICATED', 'Thiếu hoặc sai thông tin đăng nhập.');
      const claims = await jwt.verify(m[1]);
      if (verifyConsent) await verifyConsent(m[1], claims.sub);
      return { accountId: claims.sub, via: 'jwt' };
    }
    if (legacy) {
      const account = legacy.session(req);
      if (account) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          try { legacy.verifyMutationOrigin(req); } catch { throw new GameError('FORBIDDEN', 'Nguồn yêu cầu không hợp lệ.'); }
        }
        return { accountId: account.id, via: 'cookie' };
      }
    }
    return null;
  };
}
module.exports = { createPrincipalResolver };
