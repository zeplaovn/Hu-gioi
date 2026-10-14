# Supabase — Thiên Vân Đại Lục

Thư mục này là **nguồn chuẩn duy nhất** cho schema, RPC và RLS của game + Admin Console.

Repo dashboard không giữ một bản schema riêng.

## Cấu trúc

```text
supabase/
  README.md
  migrations/    lịch sử thay đổi schema/RPC/RLS
  tests/         SQL/RLS/RPC regression tests
```

## Migration order

Migration chạy theo thứ tự tên file:

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
20261018000000_gameplay_hardening.sql
20261018010000_game_clock_volatility.sql
20261018020000_trusted_game_time.sql
20261018030000_scale_hot_path_optimization.sql
20261019000000_admin_chat_badge.sql
```

Dùng Supabase CLI thì để migration system chạy theo timestamp. Nếu chạy thủ công trong SQL Editor, vẫn chạy theo thứ tự trên.

## Quy tắc migration

Tên file:

```text
YYYYMMDDHHMMSS_mo_ta_ngan.sql
```

Phần timestamp quyết định order; phần mô tả giúp con người đọc.

Quan trọng:

- migration đã từng chạy production là **lịch sử**, không xóa chỉ vì tên cũ hoặc đã có migration fix sau đó;
- không sửa migration cũ để thay đổi production state; tạo migration mới;
- migration compatibility/cleanup được phép tồn tại nếu database cũ thực sự cần nó;
- không copy SQL sang repo dashboard/wiki;
- trước destructive change phải xem dependency, RLS, RPC và rollback/forward-fix path.

## Admin bootstrap

Admin là một Supabase Auth account riêng. Sau khi tạo account, whitelist UUID:

```sql
insert into public.admin_users(user_id, role, enabled)
values ('AUTH_USER_UUID', 'owner', true)
on conflict (user_id) do update
set role = 'owner',
    enabled = true,
    updated_at = now();
```

Role hợp lệ:

```text
viewer
moderator
admin
owner
```

`admin_users` chỉ cấp role cho Auth user; password/email vẫn do Supabase Auth quản lý.

## Maintenance

`admin_set_maintenance(true, reason)` bật maintenance.

Player thường:

- thấy maintenance gate trong game;
- `save_game()` bị guard;
- `send_chat()` bị guard.

Admin Console vẫn hoạt động để có thể tắt maintenance.

Migration `20261017000000_maintenance_admin_bypass.sql` cho account `admin`/`owner` đang enabled bypass backend maintenance guard để thử game trong lúc server đóng. Client UI vẫn không phải security boundary; quyền thật nằm trong RPC/helper database.

Migration `20261019000000_admin_chat_badge.sql`: tin chat của admin/moderator có cột `is_admin` (do trigger đặt, client không tự đặt được) và hiện huy hiệu QTV + tên vàng; tin từ `admin_send_message` mang tên `Thiên Đạo`. `private.safe_name()` bỏ `[ ] < >` và ký tự vô hình, đổi tên giống admin/GM/quản trị/hệ thống thành `Vô danh` cho bảng xếp hạng và chat của người chơi thường.

## Banner và server status

`server_status()` là RPC public-safe cho game client. Nó chỉ trả dữ liệu cần cho player UI như maintenance state và active banner.

Không thêm admin metadata/private state vào RPC public này.

## Security rules

- browser chỉ dùng public anon/publishable key;
- không expose `service_role`, Supabase secret key, database password hoặc JWT signing secret;
- player write đi qua RPC scoped/validated;
- admin write đi qua RPC có RBAC và audit;
- RLS là deny-by-default boundary cho bảng dữ liệu;
- Auction/Trade/economy tương lai phải transaction server-side.

Threat model đầy đủ: `../SECURITY.md`.

## Tests

SQL tests:

```text
supabase/tests/player_saves.test.sql
supabase/tests/chat.test.sql
supabase/tests/admin.test.sql
```

Khi thay đổi RPC/RLS có behavior quan trọng, cập nhật regression test tương ứng nếu môi trường test hỗ trợ.
