/* Lỗi có mã ổn định cho API gameplay (docs/backend-plan.md §6.7). Không bao giờ đưa state, SQL hay stack ra ngoài. */
'use strict';

const STATUS = Object.freeze({
  INVALID_REQUEST: 400, INVALID_COMMAND: 400, INVALID_PROFILE: 400,
  UNAUTHENTICATED: 401, FORBIDDEN: 403, PLAYER_NOT_FOUND: 404, NOT_FOUND: 404,
  PLAYER_EXISTS: 409, NAME_TAKEN: 409, PLAYER_DEAD: 409, REVISION_CONFLICT: 409, REQUEST_ID_REUSED: 409,
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

module.exports = { GameError, toEnvelope, STATUS };
