# Supabase migrations

Database mới được dựng từ **10 migration nền tảng theo domain**, thay vì một file baseline hơn 1.000 dòng.

## Thứ tự hiện tại

```text
20261014000000_01_core.sql
20261014000100_02_admin_core.sql
20261014000200_03_server.sql
20261014000300_04_leaderboard.sql
20261014000400_05_gameplay.sql
20261014000500_06_chat.sql
20261014000600_07_economy.sql
20261014000700_08_admin_rpc.sql
20261014000800_09_security.sql
20261014000900_10_performance.sql
```

Mỗi file có một trách nhiệm rõ ràng:

- `01_core`: `player_saves` và private schema;
- `02_admin_core`: admin identity, moderation, audit, RBAC helpers;
- `03_server`: maintenance, banner, presence, server clock/status;
- `04_leaderboard`: leaderboard projection, plausibility, trigger;
- `05_gameplay`: `save_game`, trusted game-time, account deletion;
- `06_chat`: chat, admin badge, throttle, housekeeping;
- `07_economy`: economy ledger;
- `08_admin_rpc`: Admin Console RPCs;
- `09_security`: RLS, policies, table/RPC grants;
- `10_performance`: indexes, fillfactor, autovacuum tuning.

Không tạo chuỗi `*_fix.sql`, `*_cleanup.sql`, `*_bypass.sql` cho trạng thái ban đầu. Khi database mới đã apply các file trên, chúng trở thành immutable history.

## Quy tắc từ đây trở đi

1. Không sửa migration đã apply trên database mới.
2. Mỗi thay đổi schema mới tạo migration timestamp mới.
3. Trước release, gom patch chưa deploy của cùng một feature vào một migration hoàn chỉnh.
4. RPC exposed phải `revoke` trước rồi `grant execute` đúng role.
5. Hàm `security definer` phải pin `search_path = ''`.
6. Không hardcode user/admin UUID trong migration schema.
7. Destructive change phải kiểm tra dependency, RLS và forward-fix path trước khi deploy.
