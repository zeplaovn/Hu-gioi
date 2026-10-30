/* PlayerService — CHƯA VIẾT LẠI. Giao diện cần có (chi tiết: docs/backend-plan.md §3.3, §7.2):
     createPlayer({ playerId, profile, requestId })
     sync(playerId)                                  → snapshot + revision, tính tiến trình bế quan theo đồng hồ server
     command(playerId, { type, payload, requestId, expectedRevision })
   Yêu cầu: dùng engine/ (cùng luật với client), đồng hồ và RNG do server cấp, giao dịch theo playerId qua repository,
   requestId idempotent (retry không cấp thưởng/trừ tiền hai lần), expectedRevision phát hiện cập nhật đồng thời,
   snapshot không chứa seed bí cảnh. */
'use strict';
class PlayerService {
  constructor({ repository, clock = Date.now, rng = Math.random } = {}) {
    this.repository = repository; this.clock = clock; this.rng = rng;
  }
  createPlayer() { throw notImplemented('createPlayer'); }
  sync() { throw notImplemented('sync'); }
  command() { throw notImplemented('command'); }
}
function notImplemented(name) { return Object.assign(Error('Chưa cài đặt: PlayerService.' + name), { code: 'NOT_IMPLEMENTED' }); }
module.exports = { PlayerService };
