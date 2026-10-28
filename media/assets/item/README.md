# Tra cứu item theo atlas

Mở `../tra_cuu_item.html` để xem hình, mã, tên và số ô cạnh nhau (dùng được với `file://`).
`../vat_pham.xlsx` có bảng **Vật phẩm** và bảng tổng hợp **Atlas**.

- Mỗi ô **128×128 px**, đọc **trái → phải, trên → dưới**.
- **Ô, hàng, cột bắt đầu từ 1**, đánh số lại từ 1 ở mỗi atlas.
- Tọa độ pixel: `x = (cột - 1) × 128`, `y = (hàng - 1) × 128`.
- Mã item là định danh; số ô là vị trí ảnh. Ví dụ `MAT-018` ở ô 17,
  `GFT-HG-002` ở ô 1, `SEED-HERB-067` ở ô 66, `BT-DKQ-001` ở ô 80.
- `pack_pill.png`: `PILL-001`–`PILL-025`, ô 1–25.
  `single_pill.png`: `PILL-026`–`PILL-061`, ô 1–36.
- Ô trong suốt cuối atlas không được gán item. Ảnh riêng có `slot`, `row`, `column` bằng `null`.

## Nguồn dữ liệu và đồng bộ

`../bang_tra_cuu.json` chứa tên theo hình; bảng Excel chứa nhóm và đường dẫn atlas/ảnh riêng.
Tên mô tả biểu tượng nhìn thấy, không xác định tác dụng gameplay. Tên hạt giống theo linh thảo cùng mã.
Cột **Tên trước đồng bộ** trong Excel lưu tên được thay thế để đối chiếu.

Chạy từ thư mục gốc dự án, với Python có `Pillow` và `openpyxl`:

```sh
python3 tools/cut-item-atlases.py
```

Công cụ kiểm tra đủ mã, kích thước ảnh và ô có nội dung, rồi đồng bộ:

- `../vat_pham.xlsx`: tên, đường dẫn, số ô, hàng/cột, tọa độ pixel.
- `atlas.json`: tra cứu theo mã với tên, nhóm, đường dẫn, ô, hàng và cột.
- `../tra_cuu_item.html`: bảng đối chiếu trực quan theo đúng bố cục atlas.
- `client/assets/item-index.js`: chỉ mục game, `indexBase: 1`; `#1` là ô đầu tiên.
