/* Lỗi có mã ổn định cho API gameplay (docs/backend-plan.md §6.7). Không bao giờ đưa state, SQL hay stack ra ngoài. */
'use strict';

const STATUS = Object.freeze({
  INVALID_REQUEST: 400, INVALID_COMMAND: 400, INVALID_PROFILE: 400,
  UNAUTHENTICATED: 401, FORBIDDEN: 403, CONSENT_REQUIRED: 403, PLAYER_NOT_FOUND: 404, NOT_FOUND: 404,
  PLAYER_EXISTS: 409, NAME_TAKEN: 409, PLAYER_DEAD: 409, REVISION_CONFLICT: 409, PAVILION_CONFLICT: 409, REQUEST_ID_REUSED: 409, INSUFFICIENT_TINH: 422,
  TICKET_INVALID: 404, TICKET_EXPIRED: 410, PAYLOAD_TOO_LARGE: 413, UNSUPPORTED_MEDIA_TYPE: 415,
  GAME_RULE_VIOLATION: 422, RATE_LIMITED: 429, STATE_CORRUPT: 500, INTERNAL: 500,
  NOT_IMPLEMENTED: 501, MAINTENANCE: 503
});
const RETRYABLE = new Set(['REVISION_CONFLICT', 'RATE_LIMITED', 'MAINTENANCE', 'INTERNAL']);

class GameError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.status = STATUS[code] || 500;
    this.retryable = RETRYABLE.has(code);
    if (details !== undefined) this.details = details;
  }
}

/* Hình dạng lỗi gửi cho client. Lỗi không phải GameError luôn bị che thành INTERNAL. */
function toEnvelope(err, requestId) {
  const known = err instanceof GameError;
  const e = known ? err : new GameError('INTERNAL', 'Máy chủ đang gặp lỗi.');
  return {
    status: e.status,
    body: { error: { code: e.code, message: e.message, requestId, retryable: e.retryable, ...(e.details ? { details: e.details } : {}) } }
  };
}

/* SQLSTATE 55P03 (lock_not_available) và 57014 (statement canceled)
 * là tranh chấp/timeout có thể thử lại. 08xxx là lỗi kết nối PostgreSQL.
 * Không đưa SQL, thông điệp driver hoặc giá trị bí mật ra response. */
const TRANSIENT_PG = new Set(['55P03', '57014', '40P01', '40001', '53300', '57P01', '57P02', '57P03']);
function pgSqlState(err) {
  let current = err;
  for (let depth = 0; current && depth < 3; depth++, current = current.cause) {
    if (typeof current.code === 'string' && /^[A-Z0-9]{5}$/.test(current.code))
      return current.code;
  }
  return '';
}
function mapPostgresError(err) {
  if (err instanceof GameError) return err;
  const sqlstate = pgSqlState(err);
  if (!TRANSIENT_PG.has(sqlstate) && !/^08[A-Z0-9]{3}$/.test(sqlstate)) return err;
  const wrapped = new GameError('MAINTENANCE', 'Cơ sở dữ liệu tạm thời bận. Hãy thử lại.', { retryAfterMs: 1000 });
  wrapped.cause = err; // chỉ nội bộ, không tuần tự hóa vào envelope
  wrapped.expectedPgContention = ['55P03', '57014', '40P01', '40001'].includes(sqlstate);
  return wrapped;
}
function shouldLogApiError(err, status) {
  return status >= 500 && err?.expectedPgContention !== true;
}

module.exports = { GameError, toEnvelope, STATUS, mapPostgresError, shouldLogApiError };
