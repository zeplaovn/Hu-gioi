# Supabase — Thiên Vân Đại Lục

Thư mục này là **nguồn chuẩn duy nhất** cho schema, RPC và RLS của game + Admin Console. Repo dashboard không giữ một bản schema riêng.

## Cấu trúc

```text
supabase/
  README.md
  migrations/    baseline + các migration mới sau baseline
  tests/         SQL/RLS/RPC regression tests
```

## Database mới

Project Supabase mới chỉ cần chạy:

```text
20261014000000_baseline.sql
```

Baseline đã squash toàn bộ lịch sử cũ gồm player save, leaderboard, chat, admin, maintenance, gameplay hardening, trusted game-time, scale optimization và admin chat identity.

Các migration cũ dạng `fix`, `cleanup`, `bypass` đã bị xóa khỏi repo vì database mục tiêu sẽ được tạo lại từ đầu. Sau khi baseline đã apply lên database mới, baseline trở thành immutable và mọi thay đổi tiếp theo phải dùng migration timestamp mới.

## Quy tắc migration

Tên file mới:

```text
YYYYMMDDHHMMSS_mo_ta_ngan.sql
```

Nguyên tắc:

- không sửa `20261014000000_baseline.sql` sau khi database mới đã apply;
- thay đổi production state bằng migration mới;
- trước release, gom các patch chưa apply của cùng một feature vào một migration hoàn chỉnh;
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

Baseline gồm toàn bộ identity hardening của admin chat:

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

Cả ba test đều dựng database từ baseline duy nhất. Khi đổi RPC/RLS hoặc migration behavior, cập nhật regression test tương ứng.
