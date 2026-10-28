# Hư Giới

Game idle tu tiên, đang được tổ chức lại để phát triển bản online nhiều người chơi.

## Chạy game

Mở `index.html` trực tiếp bằng trình duyệt, kể cả `file://`. Không cần cài dependency hoặc build.

## Cấu trúc

```text
client/
  assets/          Đường dẫn ảnh, chỉ mục animation, danh sách preload
  platform/        Loading, âm thanh, bảo vệ nội dung trình duyệt
  persistence/     localStorage, dự phòng, xuất/nhập JSON offline
  session/         Phiên offline và điểm nhận lệnh từ giao diện
  ui/              Shell, bootstrap, VFX và các màn hình
shared/
  data/            Cân bằng, vật phẩm, nhân vật, giao du, bí cảnh/tông môn
  state/           Schema V7 và chuyển bản lưu V4–V7
  rules/           Tu luyện, chiến đấu, đồ đạc, chế tạo, thế giới, thời gian
  protocol/        Danh sách lệnh và kiểm tra payload
  game.js          Điểm vào luật game cho browser và Node
server/
  services/        PlayerService: xử lý tiến trình theo từng người chơi
  repositories/    Kho thử nghiệm trong bộ nhớ, giao dịch theo playerId
tests/             Gameplay, bản lưu, cô lập người chơi và lệnh đồng thời
tools/             Kiểm tra source và sinh preload manifest
css/               Giao diện responsive
media/             Tài nguyên hình ảnh, âm thanh
```

## Kiểm tra

Node.js 20 trở lên, không cần `npm install`:

```sh
npm run check
npm test
```

Sau khi thêm hoặc đổi tên ảnh: `npm run preload`.

## Chuẩn bị online

Giao diện gửi `UI.command(type, payload)`; luật dùng chung kiểm tra điều kiện, tính phí và phần thưởng. `PlayerService` chạy cùng bộ luật với đồng hồ/RNG của máy chủ, revision và chống xử lý lặp. Bản web hiện dùng `LocalSession`.

Chi tiết luồng dữ liệu, ví dụ dịch vụ và các bước nối đăng nhập/API/database: [docs/architecture.md](docs/architecture.md). Kế hoạch backend online đầy đủ (stack, schema, API, bảo mật, lộ trình): [docs/backend-plan.md](docs/backend-plan.md).
