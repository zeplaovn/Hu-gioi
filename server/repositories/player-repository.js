/* PlayerRepository — hợp đồng kho lưu trữ người chơi. Cài đặt bền: sqlite-players.js (node:sqlite, không cần gói ngoài).
   PostgreSQL (docs/backend-plan.md) là bản thay thế cho nhiều instance; phải giữ đúng hợp đồng dưới đây.

   record = { id, ownerId, name, state, revision, schemaVersion, contentVersion, rngSeed, rngCounter, lastSeenAt, createdAt }

     getByOwner(ownerId)                      → record | null
     get(playerId)                            → record | null
     issueTicket(ownerId, preview, opts)      → ticket | null   (null khi vượt giới hạn gieo trong 24 giờ)
     createWithTicket({ ownerId, ticketId, now, build })
                                              Trong MỘT giao dịch: kiểm ticket (đúng chủ, chưa dùng, chưa hết hạn), chưa có nhân vật,
                                              build(preview) → record mới, tên chưa bị dùng, ghi record và đánh dấu ticket đã dùng.
     transact(playerId, fn)                   Giao dịch độc quyền theo người chơi. fn(tx) chạy ĐỒNG BỘ, tx = { record, receipt(requestId, now) }.
                                              fn trả { value, save?, touch?, receipt? }:
                                                save    { state, revision, rngCounter, lastSeenAt, schemaVersion, contentVersion } thay state
                                                touch   { rngCounter, lastSeenAt } chỉ cập nhật metadata, giữ nguyên state
                                                receipt { requestId, fingerprint, revision, response, expiresAt }
                                              fn ném lỗi → hoàn tác toàn bộ. Trả value của fn.
     purgeExpired(now)                        Xóa receipt/ticket quá hạn.
     close() */
'use strict';
class PlayerRepository {
  getByOwner() { throw notImplemented('getByOwner'); }
  get() { throw notImplemented('get'); }
  issueTicket() { throw notImplemented('issueTicket'); }
  createWithTicket() { throw notImplemented('createWithTicket'); }
  transact() { throw notImplemented('transact'); }
  purgeExpired() { throw notImplemented('purgeExpired'); }
  close() {}
}
function notImplemented(name) { return Object.assign(Error('Chưa cài đặt: PlayerRepository.' + name), { code: 'NOT_IMPLEMENTED' }); }
module.exports = { PlayerRepository };
