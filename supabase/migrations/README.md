# Supabase migrations

`supabase/migrations` là **lịch sử migration production**, không phải nơi để squash baseline sau khi migration đã được apply.

## Lịch sử hiện tại

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

Các version trên phải khớp với `supabase_migrations.schema_migrations` của production. Một số file là marker/no-op lịch sử; vẫn phải giữ nguyên vì version đã được remote ghi nhận.

Không dùng `migration repair`, xóa row lịch sử, hoặc viết lại production history chỉ để làm check xanh. Nếu repo lệch remote, sửa repo để phản ánh lịch sử đã thực sự chạy.

## Quy tắc

1. Không sửa, xóa, squash hoặc đổi timestamp migration đã apply.
2. Mỗi thay đổi schema/RPC/RLS mới dùng timestamp mới.
3. Chỉ được gom/squash patch khi chắc chắn chúng **chưa từng được apply** vào bất kỳ environment được quản lý nào.
4. RPC exposed phải `revoke` trước rồi `grant execute` đúng role.
5. Hàm `security definer` phải pin `search_path = ''`.
6. Không hardcode user/admin UUID trong migration schema.
7. Destructive change phải kiểm tra dependency, RLS và forward-fix path trước khi deploy.
8. Trước khi merge, Supabase Preview phải đối chiếu migration history thành công.
