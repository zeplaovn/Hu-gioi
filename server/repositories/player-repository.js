/* PlayerRepository — hợp đồng kho lưu trữ người chơi. Cài đặt bền: sqlite-players.js (node:sqlite, không cần gói ngoài).
   PostgreSQL (backend-plan cũ @1bd987b) là bản thay thế cho nhiều instance; phải giữ đúng hợp đồng dưới đây.

   record = { id, ownerId, name, state, revision, schemaVersion, contentVersion, rngSeed, rngCounter, lastSeenAt, createdAt }

     getByOwner(ownerId)                      → Promise<record | null>
     get(playerId)                            → Promise<record | null>
     issueTicket(ownerId, preview, opts)      → Promise<ticket>   ({ limited, retryAfterMs } khi hết lượt gieo mới trong 24 giờ;
                                                 opts.fresh=false trả lại phiếu chưa dùng gần nhất thay vì gieo mới)
     createWithTicket({ ownerId, ticketId, now, build })
                                              Trong MỘT giao dịch: kiểm ticket (đúng chủ, chưa dùng, chưa hết hạn), chưa có nhân vật,
                                              await build(preview) → record mới, tên chưa bị dùng, ghi record và đánh dấu ticket đã dùng.
     getPavilion(ownerId)                     → { balance, totalEarned, upgrades, relics, rebirths, version }
     purchasePavilion(ownerId, intent)        → giao dịch account + receipt + cập nhật snapshot (nếu có)
     transact(playerId, async fn)             Promise; giao dịch độc quyền theo người chơi. fn(tx) chạy async, có thể await tx.receipt, tx = { record, receipt(requestId, now) }.
                                              fn trả { value, save?, touch?, receipt? }:
                                                save    { state, revision, rngCounter, lastSeenAt, schemaVersion, contentVersion } thay state
                                                touch   { rngCounter, lastSeenAt } chỉ cập nhật metadata, giữ nguyên state
                                                receipt { requestId, fingerprint, revision, response, expiresAt }
                                              fn ném lỗi → hoàn tác toàn bộ. Trả value của fn.
     accountTransact(ownerId, async fn, { now })
                                              Giao dịch cấp tài khoản (nhiệm vụ ngày/điểm danh/hộp thư). Khóa advisory owner
                                              → account_state → player. fn(tx) chạy async với tx = {
                                                doc, player, receipt(requestId), mail: { list(), insert(rows), claim(id, at) }
                                              }.
                                              fn trả { value, doc?, save?, receipt? }:
                                                doc     JSON tài khoản (nhiệm vụ ngày, baseline, điểm danh); tối đa 16 KiB
                                                save    { state, revision, rngCounter, schemaVersion, contentVersion }; lastSeenAt được giữ nguyên
                                                receipt { requestId, fingerprint, revision, response, expiresAt }
                                              fn ném lỗi → hoàn tác toàn bộ. Trả value của fn.
     exportOwnerData(ownerId)                 → { player, tickets, account, mail } | null  Dữ liệu gameplay của tài khoản (không gồm seed RNG).
     deleteOwnerData(ownerId)                 → { players, tickets, receipts, accountMail, accountState }  Xóa toàn bộ dữ liệu gameplay của tài khoản (quyền xóa dữ liệu).
     purgeExpired(now)                        Xóa receipt/ticket quá hạn.
     close() */
/* Tất cả phương thức lưu trữ, ngoại trừ close(), trả Promise. SQLite thực hiện bằng mutex FIFO; Postgres dùng SELECT FOR UPDATE. */
'use strict';
class PlayerRepository {
  getByOwner() { throw notImplemented('getByOwner'); }
  get() { throw notImplemented('get'); }
  issueTicket() { throw notImplemented('issueTicket'); }
  createWithTicket() { throw notImplemented('createWithTicket'); }
  transact() { throw notImplemented('transact'); }
  getPavilion() { throw notImplemented('getPavilion'); }
  purchasePavilion() { throw notImplemented('purchasePavilion'); }
  accountTransact() { throw notImplemented('accountTransact'); }
  deletePlayer() { throw notImplemented('deletePlayer'); }
  exportOwnerData() { throw notImplemented('exportOwnerData'); }
  deleteOwnerData() { throw notImplemented('deleteOwnerData'); }
  purgeExpired() { throw notImplemented('purgeExpired'); }
  close() {}
}
function notImplemented(name) { return Object.assign(Error('Chưa cài đặt: PlayerRepository.' + name), { code: 'NOT_IMPLEMENTED' }); }
module.exports = { PlayerRepository };
