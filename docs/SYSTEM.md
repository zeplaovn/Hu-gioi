# Hư Giới — Hồ sơ SYSTEM (11/11/2026)

**Phạm vi:** hạ tầng, backend, API, auth, dữ liệu, tối ưu và vận hành. **Trạng thái:** internal test.

## Kiến trúc
- Cloudflare Workers Static Assets phục vụ `dist/`.
- Supabase Auth đăng nhập trực tiếp bằng JWT; một Edge Function `api` (Deno).
- PostgreSQL schema `game` qua Supavisor transaction pooler 6543, RLS và quyền truy cập hạn chế.
- `engine/` và `data/` dùng chung; `server/` xử lý lệnh; Node/SQLite chỉ dành cho dev/test.

## Công việc đã ghi nhận
- Khôi phục consent policy v7 đồng bộ frontend/Edge (hotfix Edge v8 theo PR #76); không bypass xác nhận điều khoản.
- Chat/rank 404 do Edge deployment thiếu route dù source main đã có; hotfix Edge v9 thêm dispatcher và năm route theo PR #78. Chưa có bằng chứng nghiệm thu 200 với JWT người chơi thật.
- Dựng lại schema thử nghiệm, ledger migration, bảng consent và các kiểm tra RLS/permadeath (PR #73). Không áp dụng script rebuild phá hủy vào production.
- Tối ưu UI chat: poll chỉ khi cửa sổ hoạt động, ngắt khi ẩn, cooldown 15 giây; không đồng nghĩa đã xử lý triệt để chi phí Edge.
- Hệ thống receipt/idempotency, optimistic revision, bảo vệ server-authoritative cần giữ nguyên cho tới khi có phương án thay thế đã kiểm chứng.

## Việc tối ưu chưa thể coi là hoàn tất
- Đo Edge calls, p50/p95, SQL round-trips, kích thước state và response.
- Giảm tần suất sync/chat poll, lựa chọn realtime/presence và checkpoint an toàn.
- Giảm ghi JSONB toàn phần, receipt storage/TTL, WAL và leaderboard trigger.
- Chat TTL, snapshot bảng xếp hạng, cache và nén phải có migration/test/rollback riêng.
- Đối chiếu live Edge source, policy version, quota và cấu hình deploy.

## Nguồn vận hành
- [Kiến trúc](architecture.md)
- [Edge deployment](edge-deployment.md)
- [Bảo mật](security.md)
- [Dựng lại database test](internal-db-rebuild.md)
- [Chat/rank hotfix](chat-rank-404-hotfix.md)
- [Production readiness](production-readiness.md)
- [Task tối ưu backend](../task.txt)

**Bảo vệ dữ liệu:** không tự DROP bảng, xóa migration, sửa auth/storage hoặc merge/deploy production. Dọn tài liệu phải phân biệt file nguồn đang được tham chiếu với bản sao lỗi thời.
