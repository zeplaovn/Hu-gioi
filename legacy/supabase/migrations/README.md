# Supabase migration history

`supabase/migrations` phải khớp với `supabase_migrations.schema_migrations` của production.

Quy tắc:
- migration đã apply là immutable: không xóa, squash, đổi timestamp hoặc đổi tên file;
- thay đổi schema mới luôn dùng migration timestamp mới;
- các migration chưa được duyệt để deploy production đặt ở `supabase/pending_migrations/`, không đặt trong `supabase/migrations`;
- chỉ chuyển migration từ `pending_migrations` sang `migrations` khi chủ động chuẩn bị deploy database.

Production hiện đã ghi nhận 18 version, từ `20261011000000` đến `20261019000000`. Các file trong thư mục này phản ánh đúng 18 version đó để Supabase CLI/GitHub integration không còn báo `Remote migration versions not found in local migrations directory`.
