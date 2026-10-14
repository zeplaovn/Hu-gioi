# Node.js authoritative rewrite

Nhánh `rewrite/node-authoritative` là nhánh rewrite toàn bộ game theo mô hình server-authoritative. Không merge vào `main` cho đến khi đạt gameplay parity.

## Kiến trúc đích

- `packages/domain`: luật game thuần, không DOM, không Supabase, chạy được ở server và test.
- `apps/server`: Node.js/Fastify API; mọi RNG và mutation quan trọng phải chạy ở đây.
- `apps/web` (phase kế): client chỉ render, nhận input và gọi API; không tự quyết định roll, loot, combat, save hay progression.
- Supabase PostgreSQL: persistence/auth; Node server là lớp duy nhất được phép ghi gameplay state sau khi rewrite hoàn tất.

## Trạng thái migration

Milestone 1 đã đưa sang Node:
- 5 chỉ số gốc và bonus chủng tộc;
- toàn bộ Linh căn 1-5 thuộc tính + Dị Linh Căn;
- derived stats cơ bản;
- dữ liệu world/region/site tối thiểu cho Hạ Giới;
- authoritative endpoints tạo nhân vật, roll Linh căn và validate travel.

Chưa được coi là hoàn tất cho tới khi farm, crafting, sect, idle, combat, boss, quest, inventory, save/load, auth, chat/admin và toàn bộ map content đều chạy qua server.

## Quy tắc rewrite

1. Không sửa production Supabase trong quá trình rewrite nếu chưa có phê duyệt riêng.
2. Mỗi subsystem chỉ được xóa khỏi legacy client sau khi endpoint server + regression test tương ứng đã tồn tại.
3. Client không được truyền kết quả RNG; chỉ truyền hành động người chơi.
4. Mọi giá trị numeric từ request phải được validate và server tự tính lại.
5. Migration history Supabase hiện tại là immutable.
