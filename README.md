# Thiên Vân Đại Lục – bản Web

Bản port của game Python/tkinter `tu_tien` sang HTML + CSS + JavaScript thuần (không framework, không cần build).

## Chạy
- **Cách nhanh:** mở file `index.html` bằng trình duyệt (Chrome/Edge/Firefox).
- **Hoặc chạy server cục bộ** (khuyến nghị khi đưa lên host): `python3 -m http.server 8000` rồi vào `http://localhost:8000`.
- Đưa lên GitHub Pages / Netlify / bất kỳ static hosting nào: chỉ cần upload nguyên thư mục.

Dữ liệu lưu bằng `localStorage` (khóa `tu_tien_save_v2`) – tự lưu sau mỗi hành động, nút "Lưu game" để lưu thủ công.
Phím tắt: **T** tu luyện · **L** lịch luyện · **N** nghỉ ngơi · **D** đột phá. Minigame: **Space** hoặc chuột/chạm.

## Cấu trúc
```
index.html            trang chính
css/style.css         giao diện (responsive: máy tính / máy tính bảng / điện thoại)
css/extras.css        giao diện Thiên Đạo Các
js/data.js            dữ liệu thế giới + nghề phụ + tiện ích  (world.py, crafting.py)
js/assets.js          nạp ảnh + bảng ánh xạ icon (kể cả asset mới)
js/player.js          nhân vật + save/load                    (player.py)
js/ui.js              helper DOM, modal, thanh tiến độ        (widgets.py)
js/scene.js           cảnh canvas: parallax, sprite, VFX      (scene.py)
js/minigames.js       giữ lửa / bấm nhịp / kéo phù văn         (minigames.py)
js/game.js            lõi: hành động, chiến đấu, đột phá, túi đồ, cửa hàng, công pháp, tông môn
js/screens.js         màn tạo nhân vật, màn chính, hộp thoại   (ui/*.py)
js/farm.js            linh điền                                (systems/farm.py)
js/crafts.js          luyện đan / vẽ phù / luyện khí           (systems/crafts.py)
js/auto.js            tu luyện tự động + hộp thoại đột phá     (systems/auto_cultivate.py)
js/meta.js            Thiên Mệnh, thành tựu, lịch sử các kiếp, xuất/nhập save
js/security.js        chữ ký save, kiểm tra tính hợp lý (chống sửa save)
tools/build.mjs       build bản phát hành (gộp + nén + làm rối) -> dist/
assets/               toàn bộ ảnh (cũ + mới)
assets_src/           3 ảnh sheet gốc của bản cập nhật asset
tools/slice_sheets.py cắt sheet -> sprite lẻ (cần pillow, numpy, scipy)
```

## Asset mới (cập nhật)
| Sheet | Thư mục | Dùng ở đâu |
|---|---|---|
| `plants_sheet.png` (12 linh thảo) | `assets/plants/` | Biểu tượng **Linh Thảo** theo phẩm chất (cỏ → nhân sâm → linh chi → sen băng), Trường Thọ Quả, huy hiệu phẩm chất dự kiến trên ô đất chín |
| `farm_sheet.png` (12 ô đất / đồ trang trí) | `assets/farm/` | **Linh điền**: ô trống → hạt → mầm → lớn → chín → héo; hiệu ứng tưới nước / bón thổ; bù nhìn, bia đá, hàng rào, máng nước trang trí |
| `skills_sheet.png` (12 huy hiệu) | `assets/skills/` | Biểu tượng **công pháp** (5 huy hiệu), **tông môn** (sách xanh/đỏ/lục), nhiệm vụ tông môn, nút Công pháp, Luyện đan/Vẽ phù/Luyện khí |

Thay ảnh trong `assets_src/` (giữ bố cục lưới 4×3) rồi chạy `python tools/slice_sheets.py` để cập nhật.

## Tính năng bản nâng cấp
- **Thiên Kiếp:** đại đột phá lên Kim Đan trở lên phải chịu nhiều đạo lôi (3 + cảnh giới/2 đạo). Khí huyết về 0 là chết; Hộ Thân Phù và chiến lực giúp giảm sát thương. Vượt kiếp được +1 chỉ số ngẫu nhiên. Game cảnh báo nếu khí huyết quá thấp.
- **Thiên Mệnh (xuyên kiếp):** chết hoặc phi thăng sẽ nhận điểm Thiên Mệnh, dùng để nâng cấp vĩnh viễn: Thiên Tư (+điểm chỉ số), Túi Càn Khôn (+linh thạch), Trường Sinh (+thọ nguyên), Đạo Tâm (+% tu luyện), Thiên Vận (+Vận Khí). Trùng sinh giữa chừng chỉ nhận một nửa điểm.
- **Thành tựu:** 29 thành tựu (cảnh giới, săn yêu thú, lịch luyện, chế tác, Thiên Kiếp...), mỗi cái thưởng điểm Thiên Mệnh.
- **Kiếp trước:** bảng lịch sử 20 kiếp gần nhất.
- **Dữ liệu:** sao chép / tải file / nhập / xóa save ngay trong game (mục "Thiên Đạo Các" > "Dữ liệu").
- Dữ liệu xuyên kiếp lưu ở khóa `tu_tien_meta_v1` (tách khỏi `tu_tien_save_v2`, save cũ vẫn dùng được).

## Bảo mật & phát hành
- Save, Thiên Mệnh và file xuất đều có chữ ký HMAC; save bị sửa hoặc vô lý sẽ bị từ chối. Chi tiết và giới hạn: xem [SECURITY.md](SECURITY.md).
- Build bản phát hành: `npm i && npm run build`, rồi deploy thư mục `dist/` (kèm `_headers` / `vercel.json`).
