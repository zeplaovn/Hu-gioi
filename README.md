# Thiên Vân Đại Lục – bản Web

Bản port của game Python/tkinter `tu_tien` sang HTML + CSS + JavaScript thuần (không framework, không cần build).

## Chạy
- **Cách nhanh:** mở file `index.html` bằng trình duyệt (Chrome/Edge/Firefox).
- **Hoặc chạy server cục bộ** (khuyến nghị khi đưa lên host): `python3 -m http.server 8000` rồi vào `http://localhost:8000`.
- Đưa lên GitHub Pages / Netlify / bất kỳ static hosting nào: chỉ cần upload nguyên thư mục.

Dữ liệu lưu bằng `localStorage` (khóa `tu_tien_save_v2`) – tự lưu sau mỗi hành động, nút "Lưu game" để lưu thủ công.
Phím tắt: **T** tu luyện · **L** lịch luyện · **N** nghỉ ngơi · **D** đột phá. Minigame: **Space** hoặc chuột/chạm.

## Bản idle
- **Nhập định (idle):** tu vi tự tăng mỗi giây (10 giây = 1 tháng trong game), có thể **Tạm dừng / Tiếp tục**. Tu vi dừng ở mức viên mãn để bạn tự quyết định đột phá hoặc áp chế thêm. Game không còn chế độ "Tu luyện tự động" (bế quan tua nhanh) và nút tương ứng; các hành động thủ công Tu luyện / Lịch luyện / Nghỉ ngơi vẫn dùng bình thường.
- **Vắng mặt vẫn tu luyện:** 2 phút đầu tính đủ, sau đó 50%, tối đa 2 giờ mỗi lần; mở lại game sẽ có bảng báo cáo. Nếu thọ nguyên sắp cạn, bế quan tự dừng để không tọa hóa khi vắng mặt.
- **Đạo hiệu:** đặt tên khi tạo nhân vật (tối đa 20 ký tự, tự lọc ký tự nguy hiểm) hoặc gieo xúc xắc ra tên ngẫu nhiên.
- **Linh căn nguyên tố:** gieo khi tạo nhân vật. Thiên / Song / Tam / Tứ / Ngũ Linh Căn từ Kim, Mộc, Thủy, Hỏa, Thổ (càng ít nguyên tố càng tu nhanh nhưng đủ nguyên tố thì mạnh toàn diện), và 3% ra **Dị Linh Căn** (Lôi, Băng, Phong). Mỗi nguyên tố cho chỉ số riêng; dùng **Tinh Hoa** để tôi luyện (tối đa cấp 10, +8% hiệu quả mỗi cấp).
- **Bí cảnh:** 8 bí cảnh theo nguyên tố, mở dần theo cảnh giới. Thám hiểm chạy theo thời gian thật (cả khi đóng game), địch mạnh dần theo tầng, hạ Thủ Lĩnh được Tinh Hoa và vật phẩm. Ngũ hành tương khắc ảnh hưởng sát thương: Kim > Mộc > Thổ > Thủy > Hỏa > Kim.
- **Kỳ ngộ:** mỗi tháng có cơ hội gặp 1 trong 23 sự kiện (Thường / Hiếm / Cực hiếm / Thiên cơ, gồm cả vài tai ương nhỏ). Phúc Duyên và Vận Khí càng cao càng dễ gặp kỳ ngộ hiếm.
- **Linh điền theo thời gian thực:** 1 tháng linh điền = 1 phút thật, Linh Thảo chín sau 6 phút và đồng hồ đếm ngược hiện trên từng ô. Cây vẫn lớn khi đóng game hoặc tạm dừng nhập định; lúc vắng mặt cây chỉ lớn đến khi chín rồi chờ bạn (không sâu bệnh, khô hạn hay héo). Khi bạn có mặt vẫn cần tưới nước, bón thổ, trừ sâu. Luyện đan / vẽ phù / luyện khí vẫn là minigame hoàn thành ngay.
- **Chỉ số:** nút "Chỉ số nhân vật" hiện đủ thông tin, chỉ số gốc, chiến đấu (công, thủ, khí huyết, chí mạng, né tránh, hồi phục) và nguồn tăng tốc độ tu luyện.
- **Nhiệm vụ tông môn (thời gian thực):** bảng nhiệm vụ theo bậc (1-5) cho 3 tông môn, mỗi nhiệm vụ chạy vài chục giây đến vài phút thật, kể cả khi đóng game; có tỉ lệ thành công / "xuất sắc" (thưởng x2), mỗi ngày có 1 nhiệm vụ nổi bật (thưởng x1,5) và nút tự nhận lại. Hoàn thành nhận linh thạch, tu vi, vật phẩm và **cống hiến**. Cống hiến tổng cộng quyết định **chức vị** (Ngoại Môn → Thái Thượng Trưởng Lão: mở nhiệm vụ bậc cao, tăng tốc độ tu luyện và lương năm); cống hiến còn lại đổi vật phẩm ở **Kho tông môn**.
- **Thành tựu:** hơn 85 thành tựu chia 9 nhóm (Thiên Đạo Các). Khi mở khóa có thông báo trượt vào, tăng hiệu ứng theo bậc (mới / hiếm / huyền thoại): vòng sáng, pháo hạt và chữ nổi trong cảnh, kèm điểm Thiên Mệnh. Thành tựu chưa đạt có thanh tiến độ.
- Save cũ vẫn đọc được: nhân vật được gán tên "Đạo Hữu" và một linh căn ngẫu nhiên.

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
js/game.js            lõi: hành động, chiến đấu, đột phá, túi đồ, cửa hàng, công pháp, gia nhập / rời tông môn
js/screens.js         màn tạo nhân vật, màn chính, hộp thoại   (ui/*.py)
js/farm.js            linh điền                                (systems/farm.py)
js/crafts.js          luyện đan / vẽ phù / luyện khí           (systems/crafts.py)
js/train.js           công thức tu vi mỗi tháng của nhập định, hộp thoại đạt điều kiện đột phá
js/idle_data.js       dữ liệu + công thức idle: nguyên tố, linh căn, tên, bí cảnh (không đụng DOM)
js/idle.js            nhập định, kỳ ngộ, bí cảnh, bảng Chỉ số / Linh căn / Bí cảnh / Kỳ ngộ
js/sect.js            tông môn nâng cao: nhiệm vụ thời gian thật, chức vị, cống hiến, kho tông môn
js/meta.js            Thiên Mệnh, thành tựu (+ hiệu ứng mở khóa), lịch sử các kiếp, xuất/nhập save
js/security.js        chữ ký save, kiểm tra tính hợp lý (chống sửa save)
tools/sim_balance.mjs mô phỏng cân bằng bí cảnh bằng node (node tools/sim_balance.mjs)
tools/build.mjs       build bản phát hành (gộp + nén + làm rối) -> dist/
assets/               toàn bộ ảnh (cũ + mới)
assets_src/           3 ảnh sheet gốc của bản cập nhật asset
tools/slice_sheets.py cắt sheet -> sprite lẻ (cần pillow, numpy, scipy)
tools/make_frames.py   cắt assets_src/frames_sheet.png -> assets/ui/frame/* (góc, cạnh, ngọc của khung họa tiết)
```

## Asset mới (cập nhật)
| Sheet | Thư mục | Dùng ở đâu |
|---|---|---|
| `frames_sheet.png` (khung dọc + khung ngang) | `assets/ui/frame/` | **Khung họa tiết** hoa sen / mây / ngọc: viền mọi hộp thoại, khung cảnh và cột nhân vật (CSS trong `css/extras.css`, xếp bằng nhiều lớp nền nên co giãn theo mọi kích thước). Chạy lại `python3 tools/make_frames.py` nếu đổi ảnh gốc |
| `plants_sheet.png` (12 linh thảo) | `assets/plants/` | Biểu tượng **Linh Thảo** theo phẩm chất (cỏ → nhân sâm → linh chi → sen băng), Trường Thọ Quả, huy hiệu phẩm chất dự kiến trên ô đất chín |
| `farm_sheet.png` (12 ô đất / đồ trang trí) | `assets/farm/` | **Linh điền**: ô trống → hạt → mầm → lớn → chín → héo; hiệu ứng tưới nước / bón thổ; bù nhìn, bia đá, hàng rào, máng nước trang trí |
| `skills_sheet.png` (12 huy hiệu) | `assets/skills/` | Biểu tượng **công pháp** (5 huy hiệu), **tông môn** (sách xanh/đỏ/lục), nhiệm vụ tông môn, nút Công pháp, Luyện đan/Vẽ phù/Luyện khí |

Thay ảnh trong `assets_src/` (giữ bố cục lưới 4×3) rồi chạy `python tools/slice_sheets.py` để cập nhật.

## Tính năng bản nâng cấp
- **Thiên Kiếp:** đại đột phá lên Kim Đan trở lên phải chịu nhiều đạo lôi (3 + cảnh giới/2 đạo). Khí huyết về 0 là chết; Hộ Thân Phù và chiến lực giúp giảm sát thương. Vượt kiếp được +1 chỉ số ngẫu nhiên. Game cảnh báo nếu khí huyết quá thấp.
- **Thiên Mệnh (xuyên kiếp):** chết hoặc phi thăng sẽ nhận điểm Thiên Mệnh, dùng để nâng cấp vĩnh viễn: Thiên Tư (+điểm chỉ số), Túi Càn Khôn (+linh thạch), Trường Sinh (+thọ nguyên), Đạo Tâm (+% tu luyện), Thiên Vận (+Vận Khí). Trùng sinh giữa chừng chỉ nhận một nửa điểm.
- **Thành tựu:** hơn 85 thành tựu chia 9 nhóm (cảnh giới, chiến đấu, kỳ ngộ, bí cảnh, linh căn, tông môn, nghề phụ...), mỗi cái thưởng điểm Thiên Mệnh (xem mục Bản idle).
- **Kiếp trước:** bảng lịch sử 20 kiếp gần nhất.
- **Dữ liệu:** sao chép / tải file / nhập / xóa save ngay trong game (mục "Thiên Đạo Các" > "Dữ liệu").
- Dữ liệu xuyên kiếp lưu ở khóa `tu_tien_meta_v1` (tách khỏi `tu_tien_save_v2`, save cũ vẫn dùng được).

## Bảo mật & phát hành
- Save, Thiên Mệnh và file xuất đều có chữ ký HMAC; save bị sửa hoặc vô lý sẽ bị từ chối. Chi tiết và giới hạn: xem [SECURITY.md](SECURITY.md).
- Build bản phát hành: `npm i && npm run build`, rồi deploy thư mục `dist/` (kèm `_headers` / `vercel.json`).
