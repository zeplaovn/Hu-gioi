# Bản đồ tài liệu Hư Giới

> Trạng thái: Hiện hành. Bộ tài liệu được đối chiếu mã nguồn `main` tại `58f7e6f` ngày 13/11/2026. GAME/SYSTEM là hồ sơ hiện hành; tài liệu thiết kế/dự thảo ghi rõ trạng thái riêng.

## Đọc trước

- [Tổng hợp công việc](PROJECT-STATUS.md) — việc đã có trên main, việc còn mở và mốc triển khai đã ghi nhận.
- [GAME](GAME.md) — luật chơi, UI, chat/ranking, nhiệm vụ ngày và quyết định còn mở.
- [SYSTEM](SYSTEM.md) — kiến trúc Edge, auth, API, database, đồng bộ và vận hành.
- [Mục lục](index.md) — tệp này.

## Kỹ thuật hiện hành

- [Kiến trúc](architecture.md) — luồng Cloudflare → Supabase Auth/Edge → PostgreSQL.
- [Hợp đồng engine](engine-contract.md) — state V10, protocol v4, 52 lệnh/8 miền.
- [Vòng đời nhân vật](gameplay-v9.md) — một mạng, online-only, bế quan, tâm ma (giữ tên tệp cũ).
- [Thiên Mệnh Các](thien-menh-cac.md) — Thiên Tinh, nâng cấp và Kỳ Trân trong kiếp hiện tại.
- [Shop Khởi Nguyên](creation-pavilion-shop.md) — quầy starter ở bước tạo nhân vật; giá test chưa duyệt.
- [Tích hợp dữ liệu thiết kế](design-integration.md) — ánh xạ snapshot, nội dung đã nối luật và phần chờ duyệt.
- [Bộ nhân vật](player-pack.md) — sprite/nhân vật và quy ước asset.
- [Asset nghề và kinh mạch](asset-pack-crafting-meridians.md) — gói 15 ảnh gốc đã đóng.
- [Edge deploy/rollback](edge-deployment.md) — runbook Supabase Edge + Cloudflare, migration và rollback.
- [Bảo mật](security.md) — JWT, consent v7, RLS, CORS/CSP, rate limit và giới hạn chưa kiểm chứng.
- [Admin Console RPC](admin-console.md) — source contract dashboard; RPC nằm trong baseline.
- [Checklist release](release-checklist.md) — gate phát hành; tất cả vẫn chưa đạt.
- [Dựng lại database test](internal-db-rebuild.md) — hồ sơ lịch sử 11/11/2026, không phải playbook production.

## Thiết kế, dự thảo và bằng chứng

- [Sổ quyết định gameplay](gameplay-decisions.md) — các mục P0/P1/P2 còn chờ chủ dự án duyệt.
- [Kiểm toán độ khó](design-audit.md) — bằng chứng thiết kế lịch sử; không phải cân bằng hiện hành.
- [Cao giới 5–13](content-draft-realms-5-13.md) — dự thảo nội dung, chưa nhập `data/`.
- [Sách nghề](profession-manuals-proposal.md) — cấu trúc 12 quyển đã duyệt; hệ sách học vĩnh viễn chưa triển khai.

## Ghi chú

- Đã loại bỏ `docs/prompt-story.md`: đây là prompt cũ với số liệu sai (49 lệnh, 97/97 test) và ràng buộc offline không còn đúng.
- Tên tệp `gameplay-v9.md` được giữ để không gãy liên kết; nội dung đã cập nhật theo state V10.
- Mọi tài liệu trong `docs/` phải có dòng `> Trạng thái:` và xuất hiện trong mục lục này; test `tests/repo-hygiene.test.cjs` kiểm tra ràng buộc đó.