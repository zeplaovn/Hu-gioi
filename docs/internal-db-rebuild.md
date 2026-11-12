# Dựng lại toàn bộ database Hư Giới — môi trường test nội bộ

> Trạng thái: Hiện hành. Đã áp dụng thành công cho Supabase nội bộ ngày 11/11/2026; **không phải playbook production**.

## Kết quả đã xác nhận

Project Supabase `Hugioi` được kiểm tra qua kết nối project của chủ dự án. Trước khi chạy: **8 bảng `game.*` đều trống**, `auth.users` có **1 tài khoản test**, `public.policy_acceptances` có **2 dòng**. Bộ SQL đầu tiên cố ý dừng do thấy tài khoản phát sinh sau kiểm tra. Bản chính thức đã được sửa thành reset chỉ khi **toàn bộ `game.*` đều rỗng**, giữ Auth và lưu/khôi phục consent.

Đã áp dụng qua một migration duy nhất trong transaction:
- Xóa schema private `game` và bảng `public.policy_acceptances` cũ;
- Dựng lại từ nguyên văn **11 migration đã triển khai** có trong `supabase_migrations.schema_migrations`, theo thứ tự lịch sử;
- Thêm hai chỉ mục `game_player_receipts_player_expires` và `game_creation_tickets_owner_expires` đã có trong Git;
- Khôi phục hai bản ghi consent với thời điểm gốc. **Không DROP hoặc DELETE `auth.users`**, cũng không chạm schema hệ thống `auth`, `storage`, `realtime`.

Đối chiếu sau chạy:
- 9/9 bảng nghiệp vụ tồn tại, 9/9 RLS bật.
- 8 bảng `game.*` hoàn toàn rỗng; **1 tài khoản Auth và 2 consent giữ nguyên**.
- Trigger `game.trg_sync_player_leaderboard` có trên INSERT/UPDATE.
- SQL smoke trong transaction xác minh: thêm người sống → vào bảng xếp hạng; chết → loại khỏi bảng; cập nhật lực chiến sau chết → không xuất hiện lại. Test đã ROLLBACK, không để lại đạo thân.
- Supabase migration history có thêm `20261111073203_internal_test_full_schema_rebuild`.

## Các tệp quan trọng

- [`supabase/sql/rebuild-internal-test.sql`](../supabase/sql/rebuild-internal-test.sql): **reset thủ công có tính phá hủy**, chỉ dùng khi `game.*` trống, tự RAISE EXCEPTION nếu có dữ liệu/những bảng bất thường. Không thêm script reset vào thư mục migration tự động.
- [`supabase/migrations/`](../supabase/migrations): đã bổ sung đủ 5 migration policy v1–v5, đồng bộ timestamp desktop/v7 theo migration history và thêm bản fix tử vong; đồng bộ marker `20261111073203` dạng **NO-OP** cho replay sạch. Khi dựng database mới, chỉ chạy các migration bình thường.
- [`tests/db-full-rebuild.test.cjs`](../tests/db-full-rebuild.test.cjs): kiểm tra dựng từ DB trống bằng PGlite, RLS, consent, trigger tử vong và không đưa destructive reset vào migration chain.

## Bảo đảm an toàn

Script có transaction và kiểm tra **mọi bảng game không có bản ghi** trước khi `DROP`. Không chạy trên môi trường có nhân vật; nếu phát sinh tài khoản thử nghiệm thì được giữ lại. Với dữ liệu đang dùng, sử dụng migration additive/backup/restore thay vì reset. Đừng chạy `supabase db reset --remote` vô điều kiện chỉ vì CLI có tùy chọn đó.

Schema `game` phải không nằm trong Supabase Data API exposed schemas. Không thêm RLS policy client cho game, vì Edge backend truy cập trực tiếp sau xác thực JWT; `public.policy_acceptances` có policy read/insert theo `auth.uid()`.

## Đọc cảnh báo từ Supabase Advisors

- **Security INFO:** 8 bảng `game` bật RLS nhưng không có policy — **cố ý**, vì schema private không cấp quyền cho `anon`/`authenticated`.
- **Security WARN:** tính năng leaked-password protection của Supabase Auth đang tắt; đây là cấu hình dashboard, không phải lỗi schema. Cân nhắc bật trước khi phát hành công khai. [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Performance INFO:** chỉ mục vừa dựng lại chưa có lượt sử dụng vì **không có dữ liệu**. Không tự xóa chúng dựa vào thống kê `idx_scan=0` ngay sau reset.

## Công việc chưa có trong lần reset

Việc dựng lại **không tự triển khai** yêu cầu backend trước đây (`task.txt`, lịch sử Git) mục 11: chat 15 giây/tin, TTL tin 1 giờ, snapshot xếp hạng 12 giờ/lần, receipt retention và giảm write/Edge calls. Những mục này đòi hỏi migration và thay đổi backend mới có kiểm thử riêng. Không đồng nhất “database dựng mới” với “production-ready”.
