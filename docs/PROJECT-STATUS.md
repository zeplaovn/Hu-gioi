# Hư Giới — Tổng hợp công việc (11/11/2026)

**Môi trường:** thử nghiệm nội bộ; chưa công bố, chưa đạt chuẩn production. **Nguồn đối chiếu:** main tại commit `82da14cd`, lịch sử PR/commit và các tài liệu hiện hành. Trạng thái “đã làm” chỉ xác nhận thay đổi được ghi nhận trong GitHub, **không đồng nghĩa đã nghiệm thu trên thiết bị thật**.

## Phân loại
- [GAME.md](GAME.md): gameplay, giao diện, tài sản, trải nghiệm.
- [SYSTEM.md](SYSTEM.md): kiến trúc, backend, cơ sở dữ liệu, API, xác thực, hiệu năng.
- [task.txt](../task.txt): yêu cầu tối ưu còn mở; mục 11 ưu tiên khi xung đột.
- [docs/index.md](index.md): liên kết tài liệu kỹ thuật chi tiết.

## Các nhóm công việc đã ghi nhận
1. Engine V9, protocol v2/49 lệnh, online-only, tử vong và tạo lại nhân vật không kế thừa; hệ thống Thiên Tinh, Thiên Mệnh Các.
2. Lịch luyện có sự kiện quái/NPC/kỳ duyên và Tâm Ma; giao diện tông xanh, bản đồ, kinh mạch, asset, desktop windows, chat responsive.
3. Chat bốn kênh, xếp hạng Lực chiến/Cảnh giới; khắc phục lệch route Edge gây 404 (PR #78 đã merge main).
4. Supabase Auth/JWT, consent v7; hotfix drift Edge v8 (PR #76), Edge chat/rank v9 (PR #78).
5. Dựng lại schema test và migration ledger (PR #73); các bảo đảm RLS, leaderboard loại người chết, idempotency.
6. Nghiên cứu giảm lượt Edge, write amplification, receipt, latency, payload, chat polling và TTL; các phương án trong task.txt **chưa mặc nhiên được triển khai**.

## Trạng thái cần kiểm tra trước release
- Chạy `npm ci && npm run check && npm test && npm run build:min && npm run build:edge`.
- Nghiệm thu browser trên desktop/mobile: tạo nhân vật, chat connect/send, rank, consent và tử vong.
- Kiểm tra Edge deployment thực tế so với source, migration ledger, quota, rollback, security.
- Xác nhận các PR/nhánh chức năng khác đã merge hay chưa trước khi tuyên bố tính năng hoàn tất.
- Đo thực tế p50/p95, số query/round-trip, Edge calls, state/receipt size; tránh dùng số ước tính làm benchmark.
- Chủ dự án duyệt giá Thiên Mệnh Các, quyết định cân bằng gameplay và release gates.

## Quy tắc tài liệu
Tài liệu này là **bảng tổng hợp**, không thay thế code, migration, runbook vận hành, hợp đồng API, test hoặc sổ quyết định gameplay. Những tài liệu cũ chỉ xóa khi đã đối chiếu toàn bộ tham chiếu và có bằng chứng không còn được dùng. Không xóa migration đã chạy, dữ liệu test, tài liệu bảo mật hoặc tài liệu rollback chỉ vì tên cũ.
