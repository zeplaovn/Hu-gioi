# Kiến trúc v2

## Luồng một yêu cầu

```text
Trình duyệt ──Bearer JWT──▶ Edge Function `api`
                              1. xác minh JWT (supabase.auth.getUser)
                              2. validate đầu vào, giới hạn body 2 KB
                              3. rate limit (bảng game.rate_limits)
                              4. gọi hàm game.* bằng service_role
                           ──▶ pgSQL: khóa life → tính thời gian → quyết định → ghi
```

| Endpoint | Việc | Hàm pgSQL |
|---|---|---|
| `GET /state` | đọc trạng thái, **tính thời gian đã trôi** (kể cả offline) | `get_state` → `settle_life` |
| `POST /life/start` | bắt đầu kiếp (idempotent) | `start_life` |
| `POST /breakthrough/prepare` | bước 1: hiện xác suất tử vong, tạo intent (TTL 120 s) | `breakthrough_prepare` |
| `POST /breakthrough/confirm` | bước 2: server tung xúc xắc, thành công hoặc **death transaction** | `breakthrough_confirm` |
| `POST /tm/stat` | Quán Đỉnh: nâng chỉ số vĩnh viễn | `upgrade_stat` |
| `POST /tm/item` | Thiên Mệnh Các: mua vật phẩm của kiếp | `buy_tm_item` |

## Mô hình bảo mật

- Mọi bảng/hàm nằm trong schema `game`, **không** nằm trong `public`. Bảng bật `ENABLE` + `FORCE ROW LEVEL SECURITY`, không có policy; `anon`/`authenticated` không có `USAGE` trên schema. Chỉ `service_role` (Edge Function) gọi được hàm. `supabase/tests/03_security.test.sql` kiểm các điều này.
- `service_role` key chỉ tồn tại trong môi trường Edge Function, không bao giờ xuống web.
- Mọi hàm đặt `search_path = ''`; số ngẫu nhiên lấy từ `gen_random_uuid()` (không seed được).
- Thời gian luôn là `now()` của server. Các hàm nhận `p_now` chỉ để test; chúng không thể gọi từ client.
- Client không quyết định chết, Thiên Mệnh hay kết quả đột phá. UI chỉ hiển thị.

## Mô hình dữ liệu

- **Account** (`accounts`, `account_stats`, `tm_ledger`): Thiên Mệnh, cấp Quán Đỉnh. Giữ qua trùng sinh.
- **Life** (`lives`, `life_items`, `life_milestones`): kiếp hiện tại. Mỗi account tối đa **một** kiếp `alive` (unique index một phần).
- `life_history`: Bia Thiên Mệnh, giữ vĩnh viễn. `events`: telemetry tối thiểu (death theo nguyên nhân/giai đoạn, TM, mua vật phẩm).
- Khóa luôn theo thứ tự **life trước, account sau** (tránh deadlock).

### Death transaction (`game.end_life`)

Khóa life → ghi nguyên nhân → snapshot vào lịch sử → xóa vật phẩm/ví của kiếp → **không đụng TM/stat** → tăng `life_count` → tạo kiếp mới. Gọi lại trên kiếp đã chết chỉ trả về kiếp đang sống (idempotent).

### Thiên Mệnh

+1 mỗi tầng (9 tầng × 15 cảnh giới = 135 TM/kiếp). Mỗi mốc `(life, stage, tang)` chỉ phát một lần (khóa chính + ràng buộc unique trên `tm_ledger`). Quán Đỉnh tổng 2.280 TM; vật phẩm mất khi chết, không hoàn TM.

### Thời gian

Tiến độ được tính **lười** khi người chơi gọi API, từ mốc `last_settle_at`: 8 giờ đầu 100%, 8–16 giờ 70%, 16–24 giờ 40%, quá 24 giờ không tính. Vì vậy server API ngủ hay Supabase free bị pause không làm sai tiến trình. Tầng 1–8 tự tiến và **không có tử vong**; tới tầng 9 dừng chờ xác nhận đại đột phá.

## Ngoài phạm vi của bản này (chưa làm)

Cửa hàng/kinh tế/đan dược/craft/drop, bí cảnh và boss lethal, tông môn/NPC, chợ, **PvP**, Lục Mệnh/Hỗn Độn, chống chuyển tài sản (mục 3.6 v1.3), dashboard telemetry, Admin Console/wiki mới. Chat, bảng xếp hạng, bảo trì của bản cũ nằm ở `legacy/` và chưa được port.

## Điểm cần chủ dự án duyệt hoặc biết

1. **Tọa hóa khi quay lại.** v1.3 nói offline không gây tử vong, nhưng cũng liệt kê hết thọ nguyên là một nguyên nhân chết. Hiện thực hiện tại: thời gian tính bị chặn ở thọ nguyên còn lại, và nếu đã dùng hết thì kiếp kết thúc (`lifespan`) khi người chơi gọi API lần tới. Nếu muốn "không bao giờ chết lúc vắng mặt", cần đổi thành trạng thái chờ người chơi xác nhận tọa hóa.
2. **Đột phá tầng nhỏ.** Balance Master mô tả xác suất 35–95% và pity cho tầng nhỏ. Bản này theo simulator v1.3: tầng nhỏ chỉ tốn thời gian, **chỉ đại đột phá (tầng 9) có xác suất tử vong**. Công thức `p = base + 0,004×NgộTính + …` và pity chưa được cài.
3. **Xác suất chết và hệ số chỉ số** (`p_death_tang9`, tốc độ/giảm rủi ro mỗi cấp) là **giả định chưa đo** của simulator; bí cảnh/boss lethal chưa có.
4. **Hiệu ứng vật phẩm Thiên Mệnh Các** chưa cài (mua, giữ, mất khi chết thì có).
5. `time_scale` mặc định 1 ở production. Chỉ `seed.sql` (local) đặt 2000.

## Lộ trình PvP (đã chốt hướng)

- **Luận Đạo (xếp hạng, không chết thật): bất đồng bộ.** Đăng ký bản chụp build; thách đấu bản chụp khác (BP ±10%, TM stat tính 50%); server chạy trận tất định một lần, lưu replay.
- **Sinh Tử: lời mời + chấp nhận, cả hai phải đang online.** Server kiểm online (heartbeat) hai lần, yêu cầu xác nhận hai bước từ cả hai bên, khóa trạng thái trong lúc chờ, rồi chạy trận trong một transaction. Không loot xác. Thay đổi so với v1.3: không còn luật "mất kết nối 30 giây thì thua" vì trận không kéo dài.
- Đẩy lời mời tới người chơi online: Supabase Realtime hoặc polling ngắn (cần kiểm tra giới hạn gói).
