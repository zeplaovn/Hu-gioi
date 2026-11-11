# Gói giao diện nghề phụ và Kinh Mạch Đồ (11/11/2026)

> Trạng thái: Hiện hành. Đã đóng gói đủ 15 ảnh gốc trong repository.

## Tính năng

- **Luyện đan:** nền Đan Các, hoạt cảnh 8 frame theo giới tính nhân vật, nút **Xem riêng lò đan**.
- **Luyện khí:** nền Lò Rèn và hoạt cảnh rèn kiếm 8 frame theo giới tính, tuân thủ khóa mở theo cảnh giới.
- **Linh căn:** bổ sung **Kinh Mạch Đồ** tra cứu 12 Chính Kinh, 8 Kỳ Kinh bằng điểm đánh dấu trên đạo thể; hai bảng màu Thanh quang / Kim quang.
- **Giảm chuyển động:** dùng 4 ảnh WebP tĩnh thay vì phát hoạt cảnh.

## Quan trọng: không sửa luật game

Kinh Mạch Đồ hiện là **bản tra cứu thiết kế**. Không tạo huyệt vị thật, không sửa chỉ số và không bổ sung lệnh máy chủ. Các hiệu ứng ghi trong bảng kinh mạch **chưa được kích hoạt**. Tiến trình nghề phụ vẫn theo thời gian online và do máy chủ ghi nhận.

## Bộ ảnh gốc đã được cài

Tất cả 15 tệp WebP nằm trực tiếp trong repository tại `media/assets/custom/2026-11/`; biến `HU_CUSTOM_MEDIA.installed` được bật. **Không cần giải nén hay cài ZIP thủ công.** Trên môi trường triển khai mới, các tệp được lấy từ commit Git và có mặt sau bước build/deploy.

- Bốn ảnh tu sĩ ngồi thiền được **chuyển trực tiếp từ PNG gốc** trong `asset.zip` sang WebP chất lượng cao, giữ kích thước **1312 × 1199**, nền alpha trong suốt, giới tính nam/nữ, hai màu Thanh quang/Kim quang.
- Hai nền Đan Các, Lò Rèn và một ảnh lò đan lấy từ PNG gốc.
- Bốn hoạt cảnh nghề phụ xuất phát từ GIF gốc, giữ tám khung hình mỗi hoạt cảnh; thêm bốn ảnh tĩnh khi bật Giảm chuyển động.
- Mã điều khiển `client/assets/custom-media.js` trỏ đúng những đường dẫn này, cả hai màn Kinh Mạch Đồ và Nghề phụ đều sử dụng ảnh thật.

Có thể chạy `npm test` và `npm run build:min` để kiểm tra đủ ảnh trước khi triển khai. Khi xem bản production, cần xác nhận commit có chứa 15 file ảnh đã được build/deploy; merge vào `main` thôi chưa chắc website đã dùng bản mới.
