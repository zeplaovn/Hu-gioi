# Supabase — Thiên Vân Đại Lục

Thư mục này là **nguồn chuẩn duy nhất** cho schema, RPC và RLS của game + Admin Console. Repo dashboard không giữ một bản schema riêng.

## Cấu trúc

```text
supabase/
  README.md
  migrations/    migration history + migration policy
  tests/         SQL/RLS/RPC regression tests
```

## Migration order

Migration chạy theo timestamp trong tên file:

```text
20261011000000_player_saves.sql
20261012000000_delete_account_and_checks.sql
20261013000000_leaderboard.sql
20261014000000_chat.sql
20261014025908_scale_hot_path_optimization.sql      # production history marker
20261014032941_canonical_sql_names_v2.sql           # production history marker / no-op
20261014041045_remove_canonical_sql_aliases.sql     # production history marker / no-op
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

Ba file `2026101402...` / `2026101403...` / `2026101404...` tồn tại để local history khớp với `supabase_migrations` trên production. Hai migration canonical-name là thay đổi tạm thời đã bị rollback bằng migration kế tiếp, nên fresh database không cần dựng rồi xóa lại compatibility layer đó.

`20261018030000_scale_hot_path_optimization.sql` là bản idempotent dùng cho fresh environment. Production đã nhận cùng nhóm tối ưu trước đó ở version `20261014025908`; chạy lại bản idempotent không được phép làm mất dữ liệu.

## Quy tắc migration

Tên file:

```text
YYYYMMDDHHMMSS_mo_ta_ngan.sql
```

Nguyên tắc:

- migration đã chạy production là **immutable history**: không sửa, không xóa, không đổi timestamp;
- thay đổi production state bằng migration mới, không sửa ngược file cũ;
- trước khi release, gom các patch chưa apply cùng một feature vào một migration hoàn chỉnh;
- migration phải pin `search_path = ''` cho `security definer` function;
- quyền RPC phải `revoke` trước rồi `grant` đúng role;
- không hardcode UUID, email, password, secret hoặc production-only data trong migration;
- destructive change phải kiểm tra dependency, RLS, RPC và có forward-fix path;
- schema/RPC không được copy sang repo dashboard/wiki.

Quy ước chi tiết nằm trong `migrations/README.md`.

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

- game chuyển sang `maintenance.html`;
- `save_game()` bị guard;
- `send_chat()` bị guard.

Admin Console vẫn hoạt động để có thể tắt maintenance. Account `admin`/`owner` đang enabled được backend cho phép bypass maintenance guard để kiểm thử game trong lúc server đóng.

## Chat quản trị

Migration `20261019000000_admin_chat_badge.sql` gom toàn bộ thay đổi identity của admin chat vào một migration:

- `chat_messages.is_admin` do server stamp;
- admin/moderator không thể bị giả mạo bằng display name;
- tin từ `admin_send_message` dùng tên `Thiên Đạo`;
- `private.safe_name()` làm sạch display name;
- `admin_list_chat()` trả luôn `is_admin` cho dashboard.

## Banner và server status

`server_status()` là RPC public-safe cho game client. Nó chỉ trả maintenance state và active banner; không thêm admin metadata/private state vào RPC này.

## Security rules

- browser chỉ dùng anon/publishable key;
- không expose `service_role`, secret key, database password hoặc JWT signing secret;
- player write đi qua RPC scoped/validated;
- admin write đi qua RPC có RBAC và audit;
- RLS là deny-by-default boundary cho bảng dữ liệu;
- Auction/Trade/economy tương lai phải transaction server-side.

Threat model đầy đủ: `../SECURITY.md`.

## Tests

```text
supabase/tests/player_saves.test.sql
supabase/tests/chat.test.sql
supabase/tests/admin.test.sql
```

Khi đổi RPC/RLS hoặc migration behavior, cập nhật regression test tương ứng.
