# Hư Giới — Tổng hợp công việc và trạng thái

> Trạng thái: Hiện hành. Đối chiếu mã nguồn `main` tại `58f7e6f` ngày 13/11/2026. Tài liệu phân biệt **mã đã merge**, **bản ghi triển khai** và **phần chưa được nghiệm thu**.

**Tình trạng phát hành: thử nghiệm nội bộ; chưa xác nhận production-ready.** Đây là đầu mối tổng hợp việc đã làm và còn mở; luật chơi ở [GAME.md](GAME.md), backend ở [SYSTEM.md](SYSTEM.md).

## I. Đã có trên main

| Hệ | Nội dung | Bằng chứng / giới hạn |
|---|---|---|
| Engine | State **V10**, protocol **v4**, **52 lệnh** thuộc **8 miền**; máy chủ giữ đồng hồ, RNG, giá và phần thưởng | `engine/state/player.js`, `engine/protocol/commands.js`, `engine/game.js` |
| Vòng đời | Online-only; tab ẩn/offline không tích lũy; một mạng; chết phải bắt đầu lại, không kế thừa Thiên Tinh/vật phẩm | `server/services/player-service.js`, `docs/gameplay-v9.md` |
| Tạo nhân vật | Ba bước Chọn đạo thân → Thiên Mệnh Các/Quầy Khởi Nguyên → Phân bổ thiên phú; preview/ticket 10 phút, 5 lượt/ngày | PR #77 đã merge, `tests/creation-pavilion-shop.test.cjs`; **giá starter là giá test chưa duyệt** |
| Tu luyện | Bế quan 30 phút/2 giờ/8 giờ có báo cáo server; không tự độ kiếp; lịch luyện 10 phút với tỉ lệ 45% quái · 30% NPC · 25% kỳ duyên; tâm ma 0–100 | `engine/rules/time.js`, `data/adventures.js`; tỉ lệ cân bằng chờ duyệt |
| Nội dung | **497 vật phẩm** trong `H.ITEMS`, 14 vùng, 9 bí cảnh (cao nhất cảnh giới 8), 5 nhiệm vụ, 23 kỳ ngộ, 3 tông môn, 49 ủy thác, 12 sách Tàng Kinh Các, 14 chương Thiên Thư, 10 NPC | `data/`, `engine/game.js`; nội dung cao giới 5–13 vẫn là dự thảo |
| Giao diện | 9 cửa sổ chính: Tu luyện, Bế quan, Tông môn, Nghề phụ, Nhân vật, Thế giới, Nhiệm vụ, Truyền âm, Bảng xếp hạng; Cài đặt ở menu phụ; menu mobile thu gọn thành dropdown | `client/ui/screens/`, `client/ui/shell.js` |
| Chat | 4 kênh Thế giới/Tông môn/Đạo hữu/Đạo lữ, 4 route chat; gửi cách 15 giây; TTL 1 giờ; bảng UNLOGGED; cron xóa vật lý 5 phút | PR #96; migration `20261112030000_chat_unlogged_ttl_5m.sql` |
| Bảng xếp hạng | Top 50 theo Lực chiến/Cảnh giới, đọc bảng live `game.player_leaderboard`; trigger loại nhân vật đã chết | PR #78; **snapshot 12 giờ chưa triển khai** |
| Nhiệm vụ ngày | 3/5 nhiệm vụ theo `SHA-256(ownerId + ngày)`, reset UTC+7; điểm danh 7 ngày; hộp thư 3 mẫu; receipt idempotent | `game.account_state`, `game.account_mail`, `game.account_receipts` |
| Backend | Supabase Edge Function `api`, **23 route**, JWT + consent v7, PostgreSQL schema `game` **13 bảng**, RLS, **6 migration** | `supabase/functions/api/`, `supabase/migrations/` |
| Triển khai | Bản ghi dự án: migration chat đã áp dụng production 12/11/2026; Edge bundle **version 26** đã deploy cùng ngày | Không thể xác minh Dashboard từ repository; xem [edge-deployment.md](edge-deployment.md) |
| Tài liệu | Bộ **21 tài liệu** trong `docs/`; prompt cũ `prompt-story.md` đã được loại bỏ vì sai số liệu 49 lệnh/97 test | [index.md](index.md) |

## II. Chưa hoàn thành hoặc chưa đủ bằng chứng

1. **Benchmark backend:** Edge calls/giờ, SQL round-trips, p50/p95 latency, WAL, dung lượng DB, byte response/egress; mô hình 50/500/5.000 người. Mô phỏng quota không phải đo production.
2. **Authenticated smoke:** chưa có bằng chứng đầy đủ chuỗi JWT/consent → bootstrap → tạo nhân vật → lệnh/replay → sync/pause → chat 4 kênh → ranking → daily/checkin/mail → reset sau tử vong trên thiết bị thật sau Edge v26.
3. **Ranking F1:** snapshot 12 giờ, giảm trigger/ghi DB và tách phụ thuộc `sect_id` chưa triển khai; bảng live vẫn là nguồn hiện hành.
4. **Chat F1:** đã có TTL 1 giờ, UNLOGGED và cleanup 5 phút trong mã; chưa đo WAL/latency sau deploy, chưa có quy trình report/mute/kiểm duyệt hoàn chỉnh.
5. **Gameplay chưa chốt:** luật kinh mạch Z=100, sách nghề vĩnh viễn `learnedRecipes`, nội dung Linh/Tiên Giới và các mục P0/P1 tại [gameplay-decisions.md](gameplay-decisions.md); Kinh Mạch Đồ hiện chỉ là UI tra cứu.
6. **Retention/DB:** chưa đo WAL/bloat/TOAST, chưa xác minh retention `player_receipts`, `pavilion_receipts`, `creation_tickets`, `world_chat_messages` trên production.
7. **Release:** CI trên commit cuối, test mobile 390×844 và desktop, kiểm tra migration/rollback, CSP/origin thực tế, quyền Dashboard và phê duyệt của chủ dự án.

## III. Bản đồ tài liệu

- [GAME.md](GAME.md): luật chơi, UI, chat/ranking, daily/mail, quyết định còn mở.
- [SYSTEM.md](SYSTEM.md): kiến trúc Edge, auth, 23 route, database, đồng bộ, vận hành.
- [index.md](index.md): mục lục đầy đủ 21 tài liệu.
- [release-checklist.md](release-checklist.md): gate phát hành; tất cả vẫn chưa đạt.
- [gameplay-decisions.md](gameplay-decisions.md): sổ quyết định P0/P1/P2 chưa duyệt.
- [edge-deployment.md](edge-deployment.md): runbook triển khai/rollback Edge.

## IV. Lịch sử dọn dẹp — 11/11/2026

Các đợt dọn trước đây đã loại khỏi `main` một số tài liệu tạm (`docs/archive/online-deployment.md`, `docs/gameplay-audit.md`, `docs/frontend-optimization.md`, `docs/chat-rank-404-hotfix.md`, `docs/production-readiness.md`, `docs/REPOSITORY-AUDIT-2026-11-11.md`), logo/forest không còn đường hiển thị, `tools/install-custom-assets.py` và demo sprite độc lập. Nội dung vận hành còn giá trị đã được chuyển vào bộ tài liệu hiện hành; lịch sử vẫn xem được trong Git.

Các tài sản và công cụ còn được dùng đã được giữ lại: `bi_canh.png` làm fallback, `tra_cuu_item.html` cho test item-art, atlas/bảng thiết kế, asset NPC và các adapter dev/test. `task.txt` đã bị xóa khỏi HEAD trong commit `7d9d984`; bản cũ chỉ còn trong lịch sử Git và không còn là nguồn việc hiện hành.

## V. Quy tắc cập nhật

- Mã nguồn là nguồn sự thật; số liệu tài liệu phải đối chiếu lại khi schema, protocol, route hoặc migration thay đổi.
- Không coi việc merge tài liệu là cấp phép chạy migration, deploy Supabase/Cloudflare, reset database hay công bố production.
- Mọi thay đổi DB phải additive, có rollback, chạy staging và được chủ dự án duyệt.