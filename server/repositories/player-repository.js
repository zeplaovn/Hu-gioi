/* PlayerRepository — CHƯA VIẾT LẠI. Hợp đồng kho lưu trữ người chơi (bản đầu có thể là bộ nhớ, bản bền là PostgreSQL):
     transact(playerId, fn)   chạy fn(record) trong giao dịch độc quyền theo playerId; fn trả record mới hoặc ném lỗi để hoàn tác
     get(playerId)            đọc record hoặc null
     create(playerId, record) tạo mới, lỗi nếu đã tồn tại
   record = { state, revision, receipts }  (receipts: lịch sử requestId → kết quả để xử lý retry). */
'use strict';
class PlayerRepository {
  async transact() { throw Object.assign(Error('Chưa cài đặt: PlayerRepository.transact'), { code: 'NOT_IMPLEMENTED' }); }
  async get() { throw Object.assign(Error('Chưa cài đặt: PlayerRepository.get'), { code: 'NOT_IMPLEMENTED' }); }
  async create() { throw Object.assign(Error('Chưa cài đặt: PlayerRepository.create'), { code: 'NOT_IMPLEMENTED' }); }
}
module.exports = { PlayerRepository };
