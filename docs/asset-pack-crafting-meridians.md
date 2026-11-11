# Gói giao diện nghề phụ và Kinh Mạch Đồ (11/11/2026)

> Trạng thái: Mã giao diện đã có trên `main`. 15 ảnh WebP được chuẩn bị trong gói ZIP phát hành riêng; chưa đưa ảnh nhị phân vào GitHub. **Giữ `installed: false` cho tới khi sao chép đủ ảnh.**

## Tính năng

- **Luyện đan:** nền Đan Các, hoạt cảnh 8 frame theo giới tính nhân vật, nút **Xem riêng lò đan**.
- **Luyện khí:** nền Lò Rèn và hoạt cảnh rèn kiếm 8 frame theo giới tính, tuân thủ khóa mở theo cảnh giới.
- **Linh căn:** bổ sung **Kinh Mạch Đồ** tra cứu 12 Chính Kinh, 8 Kỳ Kinh bằng điểm đánh dấu trên đạo thể; hai bảng màu Thanh quang / Kim quang.
- **Giảm chuyển động:** dùng 4 ảnh WebP tĩnh thay vì phát hoạt cảnh.

## Quan trọng: không sửa luật game

Kinh Mạch Đồ hiện là **bản tra cứu thiết kế**. Không tạo huyệt vị thật, không sửa chỉ số và không bổ sung lệnh máy chủ. Các hiệu ứng ghi trong bảng kinh mạch **chưa được kích hoạt**. Tiến trình nghề phụ vẫn theo thời gian online và do máy chủ ghi nhận.

## Cài bộ ảnh từ ZIP đã chuẩn bị

Gói `hugioi-custom-assets-2026-11.zip` (tạo từ tệp bàn giao `asset.zip`) chứa **15 tệp WebP**, `asset-manifest.json` (SHA-256 + kích thước từng ảnh), và `README.md`. Các hình nguồn gồm 3 nền PNG, 4 ảnh PNG kinh mạch, 4 GIF động. Mỗi GIF tạo một WebP động (8 frame) và một WebP tĩnh.

Từ thư mục repository đã checkout, chạy:

```sh
python3 tools/install-custom-assets.py /duong/dan/hugioi-custom-assets-2026-11.zip
npm test
npm run build:min
git status
```

Installer chỉ nhận đúng bộ 15 đường dẫn dưới `media/assets/custom/2026-11/`, kiểm SHA-256 và chữ ký WebP cho **mọi** tệp trước khi ghi. Khi đủ ảnh mới đổi `installed: false` thành `installed: true` trong `client/assets/custom-media.js`.

> **Lưu ý phát hành:** cài đặt trong bản clone chỉ thay đổi file local. Để phát hành trên GitHub, cần `git add media/assets/custom/2026-11 client/assets/custom-media.js`, commit và push. Các file ZIP bị `.gitignore` bỏ qua; không cần commit ZIP. Chưa cài đủ ảnh thì giữ `installed: false` để giao diện cũ tiếp tục hoạt động.

## Cấu trúc asset đích

```text
media/assets/custom/2026-11/
  workshops/dan-cac.webp
  workshops/lo-ren.webp
  workshops/lo-dan.webp
  meridians/nam-xanh.webp
  meridians/nam-vang.webp
  meridians/nu-xanh.webp
  meridians/nu-vang.webp
  animations/nam/luyen-dan.webp
  animations/nam/luyen-dan-still.webp
  animations/nam/ren-vu-khi.webp
  animations/nam/ren-vu-khi-still.webp
  animations/nu/luyen-dan.webp
  animations/nu/luyen-dan-still.webp
  animations/nu/ren-vu-khi.webp
  animations/nu/ren-vu-khi-still.webp
```
