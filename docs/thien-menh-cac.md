# Thiên Mệnh Các — Thiên Tinh xuyên kiếp (protocol v2, state V9)

> Trạng thái: Hiện hành.
## Luật đã triển khai

Đây là **phần thưởng theo tài khoản**, không phải hồi sinh nhân vật. Đạo thân vẫn chỉ có một mạng; khi tọa hóa, chỉ cho phép chủ tài khoản gọi `POST /api/v1/players/{id}/reset-after-death`, rồi gieo ticket và tạo đạo thân mới. Reset không thu phí. Dữ liệu Thiên Mệnh Các nằm ở `pavilion_accounts`, tách biệt bảng `players`; xóa đạo thân không xóa kho, còn xóa dữ liệu tài khoản thì xóa luôn kho và receipt.

Bậc đầu là Luyện Khí (`realm=0`). Sau một **đại đột phá thành công** từ bậc `r-1` lên `r`, thưởng `5 × r` Thiên Tinh (`r=1…13`). Thất bại độ kiếp, tự đột phá tiểu cảnh giới, tạo nhân vật và đọc trạng thái không thưởng. **Mỗi kiếp đều nhận đầy đủ**; việc đã lên Trúc Cơ trong kiếp trước không giảm phần thưởng của kiếp mới.

Máy chủ ghi snapshot nhân vật, receipt lệnh và thưởng Thiên Tinh trong **cùng giao dịch BEGIN IMMEDIATE/COMMIT**. Gửi lại cùng `requestId` chỉ trả receipt, không cộng lần hai. Nếu revision lệch, không tính thưởng; người chơi phải đồng bộ lại.

## Sáu Thiên Phú Vĩnh Hằng

Mỗi thuộc tính cấp 0–20, mỗi cấp thêm 2,5% cho hiệu quả của chính thuộc tính đó; tối đa **+50% tương đối**:

| Thuộc tính | Hiệu quả đang được tính bằng engine |
|---|---|
| Tướng Mạo | Thiện cảm được cộng khi tặng lễ tri kỷ/NPC tăng tương đối |
| Phúc Duyên | Linh thạch và cơ hội linh thảo từ chiến lợi phẩm tăng tương đối |
| Căn Cốt | Sinh lực tối đa và công kích tăng tương đối |
| Ngộ Tính | Tốc độ tu luyện tăng tương đối |
| Vận Khí | Xác suất bạo kích và đột phá tăng tương đối, vẫn bị giới hạn xác suất của engine |
| Cơ Duyên | Xác suất xuất hiện kỳ ngộ tăng tương đối, vẫn bị giới hạn xác suất của engine |

Ví dụ: nếu tỷ lệ bạo kích nền 10%, nâng Vận Khí cấp 20 cho tỷ lệ khoảng 15%, **không phải 60%**. Các giới hạn xác suất cuối cùng của engine vẫn có hiệu lực. Thưởng vĩnh viễn độc lập 8 điểm thiên phú và Thiên mệnh miễn phí được chọn tại Khởi Nguyên.

Giá nâng cấp bậc 1–5: 2 điểm/cấp; bậc 6–10: 4; bậc 11–15: 8; bậc 16–20: 12. Tổng 130 Thiên Tinh để đạt cấp 20 cho một thuộc tính. Không có mua bằng linh thạch, tiền thật hay giao dịch giữa tài khoản.

## Kỳ Trân Dị Bảo

| Tên | Giá | Tác dụng cho **nhân vật mới** | Giới hạn kho |
|---|---:|---|---:|
| Túi Linh Thạch | 20 | +200 linh thạch khởi đầu | 5 |
| Ngộ Đạo Ngọc | 45 | +15% tu vi cần cho tầng đầu | 5 |
| Trường Sinh Ngọc | 35 | +1 năm thọ nguyên | 5 |

Mỗi lần tạo nhân vật mới, máy chủ **tự dùng một món mỗi loại đang tồn kho** và ghi giảm kho cùng giao dịch dùng ticket tạo nhân vật. Chưa có giao diện chọn thủ công món dùng; đây là đánh đổi của bản đầu tiên. Không thể gửi giá, số lượng thưởng hoặc lượng sử dụng từ client.

## Hợp đồng API

`GET /api/v1/bootstrap`, `GET /api/v1/players/{id}/state` và phản hồi đồng bộ/lệnh/tạo nhân vật có thêm trường `pavilion: {version, balance, totalEarned, rebirths, upgrades, relics}`. Không có nhân vật vẫn có thể đọc kho từ bootstrap.

`POST /api/v1/pavilion/purchase` (Bearer JWT + chính sách, rate limit lệnh), request:

```json
{
  "requestId": "6e7d31e1-2897-4710-ae84-5fca3b83ca70",
  "expectedVersion": 3,
  "kind": "upgrade",
  "key": "ngoTinh"
}
```

`kind` = `upgrade` (thuộc tính) hoặc `relic` (Kỳ Trân). Chỉ `kind`/`key` là ý định, **không có giá hoặc số dư trong request**. Mỗi lần mua tăng `pavilion.version`. Trùng `requestId` của cùng giao dịch → `replayed:true`, không trừ lần hai. Khác giao dịch nhưng dùng lại ID → `REQUEST_ID_REUSED`. Phiên bản cũ → `PAVILION_CONFLICT` (409) và phải tải lại bootstrap, không tự mua lại. Thiếu Thiên Tinh → `INSUFFICIENT_TINH` (422). Kho vượt giới hạn hoặc thuộc tính cấp 20 → `GAME_RULE_VIOLATION` (422).

Mua nâng cấp áp dụng ngay cho đạo thân hiện tại: snapshot trên server đổi `state.pavilion` và **tăng revision**, giúp các tab khác buộc đồng bộ khi đang dùng bản cũ. Mua Kỳ Trân chỉ thay đổi kho account, được áp dụng vào lần tạo nhân vật mới.

## Ranh giới và đánh đổi

- Engine/data không truy cập DOM, `Date.now`, mạng hoặc ngẫu nhiên trực tiếp trong luật Thiên Mệnh Các. Đồng hồ, RNG, quyền tài khoản thuộc về PlayerService và repository.
- Tài khoản có thể farm Trúc Cơ qua nhiều kiếp để nhận 5 Thiên Tinh mỗi lần như đã chốt; không áp dụng thuế luân hồi hoặc giảm thưởng. Giới hạn cấp 20 và 5 vật phẩm/kho ngăn vượt trần **sức mạnh và tồn kho**, không giới hạn tổng Thiên Tinh kiếm được. Nếu phát sinh lạm dụng kinh tế, cần chính sách chống bot/tạo nhiều tài khoản bên ngoài hệ thống thưởng.
- Có thể đổi bậc giá/vật phẩm trong `data/character.js` với test hồi quy và quy trình tương thích contentVersion.
- Dữ liệu cá nhân `/api/v1/me/export` phải gồm kho Thiên Mệnh Các; `/api/v1/me/erase` và xóa tài khoản sẽ hủy cả kho và receipt.
- Chỉ một Node process ghi SQLite. Khi lên PostgreSQL cần giữ giao dịch account/player/receipt ở cùng transaction.
