# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên tiếng Việt, chơi online trên trình duyệt. Mỗi tài khoản có một đạo thân; đạo thân chỉ có một mạng, chết thì bắt đầu lại.

## Tính năng
- **Tạo nhân vật:** gieo linh căn bằng phiếu khởi nguyên, phân bổ 8 điểm thiên phú, chọn Thiên mệnh. Quầy **Thiên Mệnh Các** ngay ở màn này: đổi Thiên Tinh lấy hành trang khởi nguyên và **nâng cấp vĩnh viễn** sáu thuộc tính.
- **Tu luyện:** hấp thu linh thạch, tu vi tự tăng khi online, đột phá cảnh giới (lôi kiếp, có thể tử vong), bế quan.
- **Nhân vật:** năm tab Đạo thể, Công pháp, Thiên phú, Kinh mạch, Hành trang. Bấm ô pháp bảo/công pháp hoặc vật phẩm để mở cửa sổ nổi.
- **Vật phẩm:** mua, bán, trang bị, lĩnh ngộ và vận hành công pháp, dùng đan dược.
- **Chế tạo:** luyện đan, rèn pháp bảo, linh điền.
- **Chiến đấu:** đánh quái, đổi vùng, thám hiểm có lựa chọn, bí cảnh.
- **Tông môn:** gia nhập, ủy thác, cống hiến, Tàng Bảo Các.
- **Nhiệm vụ:** nhiệm vụ hằng ngày và hành trình trong một tab, điểm danh, hộp thư. Danh sách chỉ hiện tên, bấm để xem chi tiết.
- **Giao du:** chat thật và bảng xếp hạng. Tri kỷ, Luận kiếm, Đấu giá là NPC mô phỏng.
- **Linh Hồ:** linh thú đồng hành nói chuyện, giục nhiệm vụ, cảnh báo và gợi ý bằng chữ nổi trên đầu; hiểu câu hỏi về tình hình nhân vật.

## Luật cốt lõi
- Máy chủ quyết định mọi thứ: đồng hồ, ngẫu nhiên, giá và phần thưởng. Client chỉ gửi ý định.
- Mỗi lệnh có `requestId` (gửi lại không áp dụng hai lần) và `expectedRevision` (lệch thì phải đồng bộ lại).
- Tu vi chỉ tăng khi online; offline không tích lũy.
- **Thiên Tinh và nâng cấp thuộc tính thuộc về tài khoản.** Nhân vật chết hoặc bị xóa vẫn giữ; chỉ xóa khi xóa dữ liệu hoặc tài khoản. Vật phẩm và tiến trình thì không kế thừa.

## Cấu trúc
| Thư mục | Vai trò |
|---|---|
| `engine/` | Luật game thuần (không DOM, không mạng, không `Date.now`/`Math.random`). |
| `data/` | Dữ liệu và công thức cân bằng. |
| `server/` | `PlayerService` (luồng lệnh, giao dịch) và kho Postgres. |
| `supabase/` | Edge Function `api` (Deno) và migration. |
| `client/`, `css/`, `index.html` | Giao diện web (script thường, không bundler). |
| `tools/` | Build, kiểm tra, server CI cục bộ. |
| `tests/` | Test `node:test`, mỗi file một mảng tính năng. |

Production: Cloudflare Workers phục vụ `dist/`; Supabase Auth + Edge Function + PostgreSQL (schema `game`). Test dùng kho in-memory (`tests/helpers/memory-players.js`) và PGlite.

## Lệnh
```sh
npm ci
npm test            # toàn bộ test
npm run check       # kiểm tra cú pháp và ranh giới engine
npm run build:min   # build dist, gộp và xác thực CSS
npm run build:edge  # bundle Edge Function
```
Cần Node.js 24+. Merge mã không đồng nghĩa deploy hay migrate database.
