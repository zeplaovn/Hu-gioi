# Supabase migrations

Thư mục này bắt đầu lại từ một **baseline sạch cho database mới**.

## Baseline hiện tại

```text
20261014000000_baseline.sql
```

Baseline tạo toàn bộ schema game hiện tại trong một lần:

- bảng dữ liệu;
- index và cấu hình hot-table;
- RLS/policy/grant;
- RPC player/server/admin;
- trigger leaderboard/chat;
- trusted game-time và anti-cheat validation;
- presence, banner, audit và economy ledger.

Không cần chạy lại các migration `fix`, `cleanup`, `bypass` cũ. Chúng đã được squash vào baseline và bị xóa khỏi repo vì database mục tiêu sẽ được tạo mới từ đầu.

## Quy tắc từ baseline này trở đi

1. Không sửa `20261014000000_baseline.sql` sau khi baseline đã được apply lên database mới.
2. Mỗi thay đổi schema sau đó tạo migration mới theo dạng `YYYYMMDDHHMMSS_mo_ta.sql`.
3. Trước khi release, gộp các patch chưa deploy vào cùng một migration thay vì tạo chuỗi `fix_fix2_cleanup`.
4. RPC exposed phải `revoke` trước rồi `grant execute` đúng role cần thiết.
5. Hàm `security definer` phải pin `search_path = ''`.
6. Không hardcode user/admin UUID trong migration schema.
7. Destructive change phải kiểm tra dependency, RLS và rollback/forward-fix path trước khi deploy.
