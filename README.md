# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên tiếng Việt, **đang thử nghiệm nội bộ, chưa phát hành production**.

## Phiên bản hiện tại
- Cloudflare Workers Static Assets phục vụ `dist/`; Supabase Auth (JWT, direct) và Edge Function `api` (Deno); PostgreSQL private schema `game` qua transaction pooler 6543.
- State **V10**, protocol **v3**, **52 lệnh**. Game **online-only**; nhân vật một mạng, chết bắt đầu lại **không kế thừa** Thiên Tinh hoặc vật phẩm.
- **Thiên Mệnh Các** ở màn tạo nhân vật là shop starter (PR #77 đã merge; giá vẫn là giá thử nghiệm).
- Chat thật gồm **Thế giới, Tông môn, Đạo hữu, Đạo lữ**; bảng xếp hạng **Lực chiến/Cảnh giới** (PR #78 đã merge). Bản Edge test đã hotfix route, cần nghiệm thu JWT/máy thật.
- Tri kỷ, Luận kiếm, Đấu giá và tương tác NPC vẫn là mô phỏng. Kinh Mạch Đồ 12 chính kinh xanh / 8 kỳ kinh vàng hiện là **UI tra cứu**, chưa có luật vận hành kinh mạch.

## Kiểm thử (Node.js 24+)

```sh
npm ci
npm run check
npm test
npm run build:min
npm run build:edge
npm run edge:budget
```

`npm start` dùng Node/SQLite **dev/test**; không phải backend production. `npm run edge:budget` chỉ mô phỏng.

## Hồ sơ nguồn sự thật
- [Tổng hợp công việc](docs/PROJECT-STATUS.md)
- [GAME — Gameplay/UI](docs/GAME.md)
- [SYSTEM — Backend/DB/API](docs/SYSTEM.md)
- [Mục lục tài liệu chuyên môn](docs/index.md)
- [Checklist trước release](docs/release-checklist.md)
- [Task backend](task.txt) — §11 ưu tiên.

**Merge mã/tài liệu không đồng nghĩa deploy, migrate database hoặc chứng nhận production-ready.**
# Supabase migration baseline

`supabase/migrations/20261112001142_unified_baseline.sql` là baseline của
project Hư Giới trước khi public. Migration này **xóa toàn bộ dữ liệu trong
schema `game` khi được áp dụng**, đồng thời giữ tài khoản Auth và lịch sử chấp
thuận chính sách. Chỉ dùng cho project mới hoặc môi trường đã chấp nhận reset;
không áp dụng lên một môi trường có dữ liệu cần giữ.

Các migration cũ nằm trong `supabase/sql/archive/pre-baseline/` để đối chiếu,
không thuộc đường chạy migration tự động. Các thay đổi schema mới phải được
tạo thành migration mới sau baseline. Dashboard dùng chung schema từ repo này.

