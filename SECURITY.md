# Security model

Thiên Vân Đại Lục v3 dùng browser React + Fastify + Supabase.

## Trust boundary

Browser là môi trường không đáng tin. Mọi user id, realm, score hoặc save payload từ browser có thể bị sửa. Fastify chỉ dùng Bearer token để xác minh session; PostgreSQL RLS/RPC tiếp tục là lớp authorization và validation cuối cùng.

## Secrets

Browser chỉ được nhận `SUPABASE_URL`, public anon/publishable key và public hCaptcha site key. Không commit hoặc gửi service-role key, database password, JWT signing secret hay hCaptcha secret xuống frontend.

## Persistence

Gameplay save bền vững chỉ nằm trong `player_saves`. Local storage chỉ giữ Auth session/presence id. `save_game()` và RLS phải tiếp tục kiểm tra owner, revision và plausibility.

## API

Fastify giới hạn body 1 MiB, xác minh Bearer session cho endpoint private, giới hạn chat input và không nhận user id làm authority. CORS được giới hạn bởi `WEB_ORIGINS`.

## Database migrations

Migration production đã áp dụng là lịch sử bất biến. Security/RLS fix phải tạo migration mới và có SQL regression test.
