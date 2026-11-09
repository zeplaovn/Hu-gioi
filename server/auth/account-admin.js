/* Xóa người dùng Supabase bằng khóa quản trị giữ ở máy chủ (SUPABASE_SERVICE_ROLE_KEY hoặc khóa sb_secret_...).
   Khóa này TUYỆT ĐỐI không đưa vào trình duyệt, Git hay log. Chỉ bật khi biến môi trường được đặt. */
'use strict';
const { GameError } = require('../errors.js');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createAccountAdmin({ url, secretKey, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  let project;
  try { project = new URL(url); } catch { throw Error('SUPABASE_URL chưa được cấu hình hợp lệ.'); }
  if (project.protocol !== 'https:' || !project.hostname.endsWith('.supabase.co') || project.pathname !== '/')
    throw Error('SUPABASE_URL phải là HTTPS origin của dự án Supabase.');
  if (typeof secretKey !== 'string' || secretKey.length < 20 || /\s/.test(secretKey))
    throw Error('SUPABASE_SERVICE_ROLE_KEY không hợp lệ.');

  async function deleteUser(userId) {
    if (!UUID.test(String(userId))) throw new GameError('INVALID_REQUEST', 'Mã tài khoản không hợp lệ.');
    const headers = { apikey: secretKey, Accept: 'application/json' };
    if (secretKey.startsWith('eyJ')) headers.Authorization = 'Bearer ' + secretKey; // khóa service_role dạng JWT cũ
    let response;
    try {
      response = await fetchImpl(new URL('/auth/v1/admin/users/' + userId.toLowerCase(), project).toString(), {
        method: 'DELETE', headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeoutMs)
      });
    } catch { throw new GameError('MAINTENANCE', 'Không kết nối được dịch vụ tài khoản. Hãy thử lại.'); }
    if (response.status === 404) return { deleted: false }; // đã bị xóa trước đó: coi như thành công
    if (!response.ok) throw new GameError('MAINTENANCE', 'Chưa xóa được tài khoản. Hãy thử lại sau.');
    return { deleted: true };
  }
  return { deleteUser };
}
module.exports = { createAccountAdmin };
