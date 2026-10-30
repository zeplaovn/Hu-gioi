# tools/pending-engine

Công cụ và test gắn với **engine cũ** (đã xóa khỏi nhánh này). Giữ lại làm đặc tả tham chiếu cho việc viết lại `engine/`; chưa chạy được.

| File | Cần gì | Dùng để làm gì |
|---|---|---|
| `test-game-integration.mjs` | `shared/game.js`, `server/…PlayerService` cũ | Hành vi cần giữ: tương thích bản lưu V4–V7, luật dữ liệu mới, retry idempotent. Chuyển từng test sang `tools/test-skeleton.mjs` (hoặc file mới) khi miền tương ứng được viết lại. |
| `build-defined-game.py` | `Game`, `catalog`, `adventures` | Sinh/đối chiếu dữ liệu game theo thiết kế. |
| `export-game-data.py` | `Game`, `formulas`, dữ liệu | Xuất bảng tra cứu Excel/JSON trong `media/assets/`. |
| `test-defined-game.py`, `test-game-data.py` | Hai script trên | Kiểm tra kết quả xuất. |

Khi engine mới sẵn sàng: sửa đường dẫn `shared/…` thành `engine/…` / `data/…`, đưa file ra `tools/` và thêm vào `npm test`. Các script Python nhúng đoạn Node và gọi `./shared/…` từ thư mục gốc.
