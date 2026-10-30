/* Đọc body JSON với giới hạn kích thước. Không có body → {}. Có body thì phải là application/json và là đối tượng thuần. */
'use strict';
const { AppError, badRequest } = require('./errors.js');

async function readJson(req, maxBytes) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > maxBytes) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Nội dung gửi lên quá lớn.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Nội dung gửi lên quá lớn.');
    chunks.push(chunk);
  }
  if (!size) return {};
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Chỉ nhận application/json.');
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw badRequest('JSON không hợp lệ.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest('Nội dung phải là một đối tượng JSON.');
  return value;
}

module.exports = { readJson };
