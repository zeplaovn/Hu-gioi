# Dựng lại database Hư Giới — hồ sơ môi trường test nội bộ

> Trạng thái: Lịch sử. Ghi lại lần dựng lại schema `game` ngày 11/11/2026 trên Supabase nội bộ. **Không phải playbook production và không phản ánh đầy đủ schema hiện hành.**

## 1. Bối cảnh và kết quả lần dựng 11/11/2026

Project Supabase `Hugioi` được kiểm tra qua kết nối của chủ dự án. Trước khi chạy: **8 bảng `game.*` đều trống**, `auth.users` có **1 tài khoản test**, `public.policy_acceptances` có **2 dòng**. Bộ SQL đầu tiên cố ý dừng khi phát hiện tài khoản phát sinh sau kiểm tra. Bản chính thức chỉ reset khi **toàn bộ `game.*` đều rỗng**, giữ Auth và sao lưu/khôi phục consent.

Đã áp dụng trong một transaction:

- Xóa schema private `game` và bảng `public.policy_acceptances` cũ.
- Dựng lại từ **11 migration đã triển khai** có trong `supabase_migrations.schema_migrations`, theo thứ tự lịch sử.
- Thêm hai chỉ mục `game_player_receipts_player_expires` và `game_creation_tickets_owner_expires`.
- Khôi phục hai bản ghi consent với thời điểm gốc. **Không DROP hoặc DELETE `auth.users`**, không chạm schema hệ thống `auth`, `storage`, `realtime`.

Đối chiếu sau chạy:

- **9/9 bảng nghiệp vụ** tồn tại và bật RLS: 8 bảng `game.*` cộng `public.policy_acceptances`.
- 8 bảng `game.*` rỗng; 1 tài khoản Auth và 2 consent giữ nguyên.
- Trigger `game.trg_sync_player_leaderboard` có trên INSERT/UPDATE.
- SQL smoke trong transaction xác minh: thêm người sống → vào bảng xếp hạng; chết → loại khỏi bảng; cập nhật lực chiến sau chết → không xuất hiện lại. Test đã ROLLBACK.
- Supabase migration history có thêm `20261111073203_internal_test_full_schema_rebuild`.

## 2. Liên hệ với schema hiện hành

Từ sau lần dựng trên, `main` đã bổ sung:

- **3 bảng tài khoản** cho nhiệm vụ ngày/điểm danh/hộp thư: `account_state`, `account_mail`, `account_receipts`.
- **2 bảng admin**: `admin_users`, `admin_audit_log`.
- Chat chuyển sang bảng **UNLOGGED**, TTL **1 giờ**, cron xóa vật lý **5 phút**.

Hiện hành schema `game` có **13 bảng** và `supabase/migrations/` có **6 migration**; migration cũ đã được hợp nhất vào baseline `20261112001142_unified_baseline.sql`. Chi tiết và danh sách bảng ở [SYSTEM](SYSTEM.md), quy trình triển khai ở [edge-deployment](edge-deployment.md). Hồ sơ này **không** dùng để suy ra số bảng, số migration hoặc trạng thái production hiện tại.

## 3. Tệp liên quan

- [`supabase/sql/rebuild-internal-test.sql`](../supabase/sql/rebuild-internal-test.sql): reset thủ công **có tính phá hủy**, chỉ dùng khi `game.*` trống, tự `RAISE EXCEPTION` nếu có dữ liệu/bảng bất thường. Không thêm script reset vào thư mục migration tự động và **không chạy trên production**.
- [`supabase/migrations/`](../supabase/migrations): nguồn schema hiện hành; database mới chỉ chạy migration bình thường.
- [`tests/db-full-rebuild.test.cjs`](../tests/db-full-rebuild.test.cjs): kiểm tra dựng từ DB trống bằng PGlite, RLS, consent, trigger tử vong và việc không đưa destructive reset vào migration chain.

## 4. Cảnh báo an toàn

- Script có transaction và kiểm tra **mọi bảng game không có bản ghi** trước khi `DROP`. Không chạy trên môi trường có nhân vật.
- Với dữ liệu đang dùng, chỉ dùng migration additive/backup/restore. Không chạy `supabase db reset --remote` vô điều kiện.
- Schema `game` không nằm trong Supabase Data API exposed schemas; không cấp quyền trực tiếp cho `anon`/`authenticated`.
- `public.policy_acceptances` có policy read/insert theo `auth.uid()`.

## 5. Ghi chú từ Supabase Advisors tại thời điểm dựng

- **Security INFO:** các bảng `game` bật RLS nhưng không có policy — **cố ý**, vì schema private không cấp quyền cho client.
- **Security WARN:** leaked-password protection đang tắt; đây là cấu hình Dashboard, cần cân nhắc bật trước phát hành công khai.
- **Performance INFO:** chỉ mục chưa có lượt sử dụng vì database không có dữ liệu; không xóa dựa vào `idx_scan=0` ngay sau reset.

Các cảnh báo trên là ảnh chụp lịch sử, không phải trạng thái Dashboard hiện tại. Việc dựng lại database **không** triển khai chat TTL, snapshot xếp hạng, retention receipt hay các tối ưu backend khác; những phần đó có migration và mã riêng trong bộ tài liệu hiện hành.