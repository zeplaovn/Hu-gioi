# Rewrite status

Branch này đã chuyển runtime từ JavaScript/DOM namespace `TT` sang React/Vite/Fastify. Cây runtime legacy đã bị xóa khỏi branch rewrite; assets và Supabase database history được giữ.

Đây là rewrite lớn ưu tiên kiến trúc mới và khả năng tiếp tục phát triển. Gameplay parity chi tiết, balance và migration các field hiếm từ save cũ sẽ được sửa qua regression/QA sau.

## Đã chuyển

- React-owned UI/state/game loop.
- Domain reducers cho cultivation/world/farm/crafting/sect/economy/meta.
- Fastify auth boundary, save, chat, leaderboard, presence, server status.
- Supabase database-only persistence.
- Vite production asset packaging.
- Vercel API adapter.

## Cần QA tiếp

- parity công thức toàn bộ feature cũ;
- save migration cho các field legacy hiếm;
- minigame tương tác nghề phụ;
- admin/staff workflow end-to-end với dashboard repo;
- mobile UX và performance;
- SQL/RLS integration test trên Supabase test instance.
