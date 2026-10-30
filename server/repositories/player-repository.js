/* Hợp đồng PlayerRepository. Mọi bản cài đặt (bộ nhớ, PostgreSQL…) phải qua bộ test hợp đồng tools/lib/repository-contract.mjs.

   record = {
     state,        // trạng thái người chơi (JSON thuần)
     revision,     // số nguyên tăng khi lệnh được áp dụng
     receipts,     // { [requestId]: { fingerprint, result, at } } — idempotency
     createdAt, updatedAt, createRequestId
   }

   create(playerId, record)      Tạo mới; lỗi PLAYER_EXISTS (409) nếu đã có.
   get(playerId)                 Bản sao record hoặc null. Không bao giờ trả tham chiếu nội bộ.
   transact(playerId, fn)        Chạy fn(draft) độc quyền theo playerId: các transact của CÙNG một người chơi xếp hàng tuần tự.
                                 - draft là bản sao; fn sửa draft rồi trả kết quả → commit nguyên khối.
                                 - fn ném lỗi (hoặc reject) → bỏ draft, không ghi gì, lỗi được ném lại nguyên vẹn.
                                 - draft.events.push({ type, payload }) → ghi vào outbox TRONG CÙNG giao dịch với state.
                                 - Không có người chơi → PLAYER_NOT_FOUND (404).
   drainOutbox(limit)            Tối đa `limit` sự kiện chưa xác nhận, theo thứ tự tạo. Không xóa.
   ackOutbox(ids)                Xác nhận đã xử lý; sự kiện bị xóa. Giao ít nhất một lần → handler phải idempotent theo event.id.

   Bản PostgreSQL: transact = BEGIN + SELECT … FOR UPDATE; outbox = bảng + FOR UPDATE SKIP LOCKED. */
'use strict';

class PlayerRepository {
  async create() { throw notImplemented('create'); }
  async get() { throw notImplemented('get'); }
  async transact() { throw notImplemented('transact'); }
  async drainOutbox() { throw notImplemented('drainOutbox'); }
  async ackOutbox() { throw notImplemented('ackOutbox'); }
}
function notImplemented(name) { return Object.assign(Error('Chưa cài đặt: PlayerRepository.' + name), { code: 'NOT_IMPLEMENTED' }); }

module.exports = { PlayerRepository };
