/* Lỗi chuẩn của API. Mọi lỗi trả về client có dạng { error: { code, message, requestId, details? } }. */
'use strict';

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
const unauthenticated = (message = 'Cần đăng nhập.') => new AppError(401, 'UNAUTHENTICATED', message);
const forbidden = (code, message) => new AppError(403, code, message);
const notFound = (message = 'Không tìm thấy.') => new AppError(404, 'NOT_FOUND', message);
const conflict = (code, message, details) => new AppError(409, code, message, details);
const unprocessable = (code, message, details) => new AppError(422, code, message, details);
const tooMany = retryAfterSeconds => new AppError(429, 'RATE_LIMITED', 'Thao tác quá nhanh, hãy thử lại sau.', { retryAfterSeconds });
const engineNotReady = missing => new AppError(501, 'ENGINE_NOT_READY', 'Luật chơi chưa sẵn sàng trên máy chủ.', { missing });

/* Chuyển lỗi bất kỳ thành phản hồi. Lỗi không phải AppError là lỗi hệ thống: không lộ nội dung ra ngoài. */
function toResponse(error, requestId) {
  const app = error instanceof AppError;
  const status = app ? error.status : 500;
  const body = { error: { code: app ? error.code : 'INTERNAL', message: app ? error.message : 'Lỗi máy chủ.', requestId } };
  if (app && error.details !== undefined) body.error.details = error.details;
  const headers = {};
  if (status === 429 && error.details?.retryAfterSeconds) headers['Retry-After'] = String(error.details.retryAfterSeconds);
  if (status === 413) headers.Connection = 'close';
  return { status, body, headers };
}

module.exports = { AppError, badRequest, unauthenticated, forbidden, notFound, conflict, unprocessable, tooMany, engineNotReady, toResponse };
