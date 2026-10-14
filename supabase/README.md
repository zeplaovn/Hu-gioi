# Supabase — Thiên Vân Đại Lục

Thư mục này là **nguồn chuẩn duy nhất** cho schema, RPC và RLS của game + Admin Console. Repo dashboard không giữ một bản schema riêng.

## Cấu trúc

```text
supabase/
  README.md
  migrations/    lịch sử migration production, bất biến sau khi đã apply
  tests/         SQL/RLS/RPC regression tests
```

## Migration history

`supabase/migrations` phải khớp với `supabase_migrations.schema_migrations` của production. Migration đã chạy production là **immutable history**: không xóa, không squash, không đổi timestamp, không thay nội dung để “làm sạch” repo.

Lịch sử production hiện tại:

```text
20261011000000_player_saves.sql
20261012000000_delete_account_and_checks.sql
20261013000000_leaderboard.sql
20261014000000_chat.sql
20261014025908_scale_hot_path_optimization.sql
20261014032941_canonical_sql_names_v2.sql
20261014041045_remove_canonical_sql_aliases.sql
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
20261020000000_review_fixes.sql
20261020010000_maintenance_grace_and_windows.sql
```

Ba migration `20261014025908`, `20261014032941`, `20261014041045` là marker/lịch sử thật đã từng được production ghi nhận. Chúng phải tồn tại trong repo để Supabase Preview và CLI có thể đối chiếu migration history chính xác.

## Quy tắc migration

Tên file mới:

```text
YYYYMMDDHHMMSS_mo_ta_ngan.sql
```

Nguyên tắc:

- không sửa, xóa, squash hoặc renumber migration đã apply;
- thay đổi production state bằng migration timestamp mới;
- trước release, gom patch **chưa deploy** của cùng một feature vào một migration hoàn chỉnh;
- `security definer` function phải pin `search_path = ''`;
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

Migration `20261019000000_admin_chat_badge.sql` gồm identity hardening của admin chat:

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

Các test phải dựng database trống theo đúng thứ tự migration production ở trên. Khi đổi RPC/RLS hoặc migration behavior, cập nhật regression test tương ứng.
