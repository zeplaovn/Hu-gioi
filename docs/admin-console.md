# Hư Giới · Admin RPC (migration chưa áp dụng)

> Trạng thái: Hiện hành. Source contract cho [Hugioi-dashboard](https://github.com/zeplaovn/Hugioi-dashboard). **Chưa tự triển khai DB.**

## An toàn
- Bộ RPC `public.hu_admin_*` cho dashboard dùng cùng Supabase Auth nhưng **chỉ cho UUID được whitelist** trong `game.admin_users`; không dựa email hoặc user_metadata. Mặc định không có admin nào và `enabled=false`.
- Bảng `game.admin_users` và `game.admin_audit_log` vẫn ở private schema, có RLS và không cấp select cho anon/authenticated. RPC dùng SECURITY DEFINER với search_path cố định; chỉ cấp EXECUTE cho authenticated, đồng thời kiểm tra `auth.uid()` + role ở từng request.
- Viewer đọc tổng quan, người chơi, rank, audit và **chat công khai**. Moderator/admin/owner được xóa tin công khai, có lý do và audit; tin `sect:* ` không được lấy hoặc xóa từ dashboard.
- API chỉ trả tên, cảnh giới, lực chiến, hoạt động và chat công khai; **không trả player.state, RNG seed, JWT, email**. Tin nhắn cũ hơn 1 giờ không trả từ admin API.
- Không có RPC chỉnh tài sản, sửa player, khóa tài khoản, gửi chat mang danh QTV hoặc bật bảo trì vì engine Hư Giới chưa có hợp đồng backend tương ứng.

## RPC

`hu_admin_me()`, `hu_admin_overview()`, `hu_admin_players(p_query,p_status,p_limit)`, `hu_admin_ranking(p_mode,p_limit)`, `hu_admin_chat(p_channel,p_limit)`, `hu_admin_audit(p_limit)`, `hu_admin_delete_chat(p_message_id,p_reason)`.

## Thiết lập staging (sau khi đã duyệt migration)
1. Sao lưu và chạy **migration bổ sung** `supabase/migrations/20261111110000_hugioi_admin_console.sql` trên staging; xác minh functions/privileges/RLS bằng SQL.
2. Tạo **tài khoản Supabase Auth riêng** cho admin; dùng SQL Editor với đặc quyền owner để thêm: `INSERT INTO game.admin_users(user_id,role,enabled) VALUES ('UUID_CUA_ADMIN','owner',true) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role, enabled=true,updated_at=now();`
3. Kết nối Vercel public `SUPABASE_URL` (đúng project Hư Giới) và `SUPABASE_ANON_KEY` / publishable key; **không** đưa service role hoặc SQL credentials vào frontend.
4. Thử guest/normal account gọi tất cả RPC → 401/403; viewer không xóa chat; moderator xóa public chat có audit; tất cả role không xem chat `sect`.
5. Chạy browser E2E, CI, backup/rollback; chủ dự án duyệt trước môi trường dùng thật.

**Rollback:** thu hồi quyền EXECUTE các RPC vừa thêm và ngừng dashboard. Không DROP bảng mới trước khi lưu/kiểm tra audit; không chạm bảng người chơi.
