# Hư Giới · Admin RPC

> Trạng thái: Hiện hành. Source contract cho [Hugioi-dashboard](https://github.com/zeplaovn/Hugioi-dashboard). Các RPC đã nằm trong migration baseline của repository; **chưa xác minh dashboard hoặc quyền admin trên môi trường thật**.

## An toàn

- Bộ RPC `public.hu_admin_*` dùng cùng Supabase Auth nhưng **chỉ cho UUID được whitelist** trong `game.admin_users`; không dựa email hoặc `user_metadata`. Mặc định không có admin và `enabled=false`.
- `game.admin_users` và `game.admin_audit_log` nằm trong schema private, bật RLS, không cấp quyền trực tiếp cho `anon`/`authenticated`. RPC dùng `SECURITY DEFINER` với `search_path` cố định; chỉ cấp `EXECUTE` cho `authenticated`, đồng thời kiểm tra `auth.uid()` + role ở từng request.
- Viewer đọc tổng quan, người chơi, rank, audit và **chat công khai**. Moderator/admin/owner được gửi hoặc xóa tin công khai, có lý do và audit; tin `sect:*` không được lấy hoặc xóa từ dashboard.
- API chỉ trả tên, cảnh giới, lực chiến, hoạt động và chat công khai; **không trả `player.state`, RNG seed, JWT hoặc email**. Tin nhắn cũ hơn 1 giờ không trả từ admin API.
- Không có RPC chỉnh tài sản, sửa player, khóa tài khoản hoặc bật bảo trì vì engine chưa có hợp đồng backend tương ứng.

## RPC hiện có

| RPC | Nguồn migration | Vai trò |
|---|---|---|
| `hu_admin_role()` | `20261112001142_unified_baseline.sql` | Trả role admin hiện tại |
| `hu_admin_me()` | baseline | Hồ sơ admin đang đăng nhập |
| `hu_admin_overview()` | baseline | Tổng quan |
| `hu_admin_players(p_query,p_status,p_limit)` | baseline | Danh sách người chơi |
| `hu_admin_ranking(p_mode,p_limit)` | baseline | Bảng xếp hạng |
| `hu_admin_chat(p_channel,p_limit)` | baseline | Chat công khai |
| `hu_admin_audit(p_limit)` | baseline | Audit |
| `hu_admin_delete_chat(p_message_id,p_reason)` | baseline | Xóa tin công khai |
| `hu_admin_send_chat(p_channel,p_text,p_request_id)` | `20261112013428_admin_chat_send.sql`, định nghĩa lại trong `20261112030000_chat_unlogged_ttl_5m.sql` | Gửi tin admin có idempotency |

**Không còn migration riêng `20261111110000_hugioi_admin_console.sql`.** Các function/table admin đã được hợp nhất vào baseline `20261112001142_unified_baseline.sql`; không chạy lại baseline hoặc tạo migration trùng.

## Thiết lập staging

1. Đối chiếu `supabase migration list --remote` và chạy migration theo quy trình chung ở [edge-deployment.md](edge-deployment.md). Nếu baseline đã áp dụng, chỉ xác minh function/privilege/RLS bằng SQL, **không chạy lại**.
2. Tạo tài khoản Supabase Auth riêng cho admin; dùng SQL Editor với đặc quyền owner để thêm:
   ```sql
   INSERT INTO game.admin_users(user_id, role, enabled)
   VALUES ('UUID_CUA_ADMIN', 'owner', true)
   ON CONFLICT(user_id) DO UPDATE
   SET role = excluded.role, enabled = true, updated_at = now();
   ```
3. Kết nối Vercel public với `SUPABASE_URL` đúng project và `SUPABASE_ANON_KEY`/publishable key; **không** đưa service role hoặc SQL credentials vào frontend.
4. Thử guest/normal account gọi tất cả RPC → 401/403; viewer không xóa chat; moderator xóa public chat có audit; tất cả role không xem chat `sect`.
5. Chạy browser E2E, CI, backup/rollback; chủ dự án duyệt trước khi dùng với dữ liệu thật.

**Rollback:** thu hồi `EXECUTE` các RPC vừa cấp và ngừng dashboard. Không DROP `game.admin_audit_log` trước khi lưu/kiểm tra audit; không chạm bảng người chơi. Xem [SYSTEM](SYSTEM.md) và [bảo mật](security.md).