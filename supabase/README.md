# Supabase — Thiên Vân Đại Lục

Thư mục này là **nguồn chuẩn duy nhất** cho schema/RPC/RLS của game và Admin Console.

## Migration order

Chạy theo thứ tự tên file (hoặc dùng `supabase db push`):

```text
20261011000000_player_saves.sql
20261012000000_delete_account_and_checks.sql
20261013000000_leaderboard.sql
20261014000000_chat.sql
20261015000000_leaderboard_fix.sql
20261016000000_admin_console.sql
20261016010000_admin_console_fixes.sql
20261016020000_maintenance_guard.sql
20261016030000_admin_cleanup.sql
20261017000000_maintenance_admin_bypass.sql
```

Không copy schema sang repo dashboard. Dashboard chỉ là client quản trị; mọi quyền thật nằm ở PostgreSQL/RPC/RLS trong repo này.

## Admin bootstrap

Sau khi chạy các migration admin, tạo một Supabase Auth account riêng cho quản trị rồi whitelist UUID:

```sql
insert into public.admin_users(user_id, role, enabled)
values ('AUTH_USER_UUID', 'owner', true)
on conflict (user_id) do update
set role = 'owner', enabled = true, updated_at = now();
```

Role hợp lệ: `viewer`, `moderator`, `admin`, `owner`.

## Maintenance

`admin_set_maintenance(true, reason)` bật maintenance. Khi bật:

- game client hiển thị maintenance gate;
- `save_game()` trả `maintenance_mode`;
- `send_chat()` trả `maintenance_mode`;
- dashboard admin vẫn hoạt động để có thể tắt maintenance;
- tài khoản có vai trò `admin` hoặc `owner` (đang bật) vẫn vào game, lưu và chat được trong lúc bảo trì để thử bản mới (migration `20261017…`). Trên màn hình bảo trì có nút **Quản trị viên đăng nhập**; người chơi thường đăng nhập vẫn bị chặn và vẫn thấy màn hình bảo trì.

`server_status()` vẫn public cho `anon/authenticated` nhưng chỉ trả trạng thái maintenance và banner đang active.

## Security

- Không đưa `service_role`/secret key vào browser.
- Player write đi qua RPC server-authoritative.
- Admin action đi qua RPC có RBAC và audit.
- RLS vẫn là lớp bảo vệ mặc định cho bảng dữ liệu.
