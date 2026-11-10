# Gói giao diện nghề phụ và Kinh Mạch Đồ (11/11/2026)

## Tính năng

- **Luyện đan:** bối cảnh Đan Các, hoạt cảnh 8 khung theo giới tính nhân vật, nút **Xem riêng lò đan**.
- **Luyện khí:** bối cảnh Lò Rèn và hoạt cảnh rèn kiếm 8 khung theo giới tính, tuân thủ khóa mở theo cảnh giới.
- **Linh căn:** bổ sung **Kinh Mạch Đồ** tra cứu 12 Chính Kinh, 8 Kỳ Kinh bằng điểm đánh dấu trên đạo thể; hai bảng màu Thanh quang / Kim quang.
- Tôn trọng tùy chọn **Giảm chuyển động** bằng cách dùng ảnh tĩnh thay cho hoạt ảnh.

## Quan trọng: không sửa luật game

Kinh Mạch Đồ hiện là **bản tra cứu thiết kế**. Không tạo huyệt vị thật, không sửa chỉ số và không bổ sung lệnh máy chủ. Các hiệu ứng ghi trong bảng kinh mạch **chưa được kích hoạt**. Tiến trình nghề phụ vẫn theo thời gian online và do máy chủ ghi nhận.

## Cài đặt gói ảnh

Mã giao diện có mặt trên nhánh này. 15 file ảnh WebP thuộc gói ZIP bàn giao riêng và **chưa được đẩy lên GitHub trong PR**.

Sau khi checkout nhánh hoặc merge PR, giải nén gói `hugioi_asset_package.zip`, chạy:

```sh
python3 install_assets.py /duong/dan/toi/repository/Hugioi
npm test
npm run build:min
```

Script cài đặt sao chép các tệp vào `media/assets/custom/2026-11/` và đổi `installed: false` thành `installed: true` trong `client/assets/custom-media.js`.

Để đưa ảnh lên repository sau khi cài đặt, kiểm tra file và commit/push qua git như bình thường. Đừng bật `installed` nếu chưa chép đầy đủ 15 ảnh.

Khi chưa cài ảnh, giao diện cũ tiếp tục chạy; sơ đồ kinh mạch vẫn dùng nền đơn giản và các nút tra cứu.
