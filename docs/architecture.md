# Kiến trúc Hư Giới — online-only

> Nguồn sự thật là mã chạy trong `engine/`, `server/` và [hợp đồng engine](engine-contract.md).
> Kể từ gameplay V9, **không có phiên chơi offline**. Code `LocalSession`/`LocalStore` được giữ trong repository cho kiểm thử và đối chiếu bản lưu, **không được nạp ở `index.html` hoặc đưa vào `dist/`**.

## 1. Ranh giới phụ thuộc

```text
client/ ───► engine/ ───► data/
    │           ▲
    └─── HTTPS /api/v1 ───► server/ ───► engine/ ───► data/
```

| Lớp | Trách nhiệm | Không được |
|---|---|---|
| `data/` | Nội dung, catalog, chỉ số, công thức thuần; dùng chung trong Node/browser. | Gọi DOM, mạng, timer; luật mới phải nhận RNG thay vì sinh từ môi trường. |
| `engine/` | Một nguồn luật gameplay, state, kiểm schema và thực thi lệnh. | DOM, localStorage, fetch, timer, `Date.now()`, `Math.random()` trực tiếp. |
| `client/` | UI, tải ảnh, xác thực Supabase, `RemoteSession`, hiển thị snapshot. | Tự cấp tu vi/đồ/linh thạch hoặc tự ghi state tin cậy. |
| `server/` | JWT/chấp thuận chính sách, `PlayerService`, giờ/RNG, SQLite, idempotency, HTTP tĩnh/API. | Tin payload client về state, thời gian, giá, kết quả RNG. |

Giữ Node.js **>=24**, dùng `node:sqlite`, không yêu cầu thêm dependency chạy gameplay. `npm run check` và `npm test` kiểm cú pháp, giao kèo lệnh, luật và API; một số luồng UI có workflow riêng.

## 2. Bố cục chính

```text
index.html                  Thứ tự classic scripts, UI entry
data/                       Bảng cân bằng, thiết kế, linh căn, kinh mạch, Thiên Thư
engine/
  game.js                   Ghép state/data/9 miền; READY và MISSING
  state/player.js           State V9; normalize V4–V9
  protocol/commands.js      Protocol V2; 48 lệnh có schema
  rules/                    progression inventory crafting combat world
                            adventures social time creation
client/
  auth/                     Supabase, chính sách
  session/remote-session.js  Phiên online (JWT, retry, revision, heartbeat)
  session/chat-session.js    Giao diện vận chuyển chat, chưa có chat backend dùng chung
  persistence/remote-store.js Giao diện state không lưu save local
  ui/                       Màn hình, các action gửi command
  assets/ platform/         Âm thanh, ảnh, preload
server/
  main.js                   Khởi động HTTP; cấu hình JWT và database
  http/                     Router, API V1, static allowlist, rate limits
  auth/                     Xác thực quyền/chấp thuận, quản trị tài khoản
  services/player-service.js Luật phiên online và giao dịch gameplay
  repositories/sqlite-players.js SQLite, receipt, bảng theo tài khoản
css/  media/                UI và tài nguyên được phục vụ có allowlist
tools/build-dist.cjs        Xuất `dist/` tĩnh, không chứa server/ hay adapter offline
tests/                      Node test và hồi quy gameplay/API/UI
docs/                       Đặc tả và quyết định thiết kế
```

`client/session/local-session.js` và `client/persistence/local-store.js` là code lịch sử **không thuộc đường chạy phát hành**. Không xóa vội vì test/migration có thể còn cần.

## 3. Luồng lệnh và thời gian

```text
UI.command(type, payload)
  → RemoteStore / RemoteSession (JWT, requestId, expectedRevision)
  → POST /api/v1/players/{id}/commands
  → PlayerService → repository.transact
    → kiểm receipt và revision → game.advance(now, offline)
    → protocol.validate/execute → đúng một miền engine/rules/
    → lưu state + receipt + thưởng trong một SQLite transaction
  → {revision, state, result, report, logs, pavilion}
  → RemoteSession phát sự kiện → UI hiển thị
```

Chỉ máy chủ có quyền xác định `now`, RNG, kết quả gameplay, giá và phần thưởng. Client không gửi bản lưu JSON để thay thế state. Một `requestId` phát lại chỉ nhận kết quả của giao dịch đã ghi, không nhân đôi thưởng.

`RemoteSession` đồng bộ khi tab hiện. Khi ẩn tab/ngắt heartbeat quá grace, tiến trình **đóng băng**: không tăng tu vi, tuổi, linh thạch, không chạy RNG/chiến đấu. Kết nối lại không có thưởng offline. Đọc [gameplay-v9.md](gameplay-v9.md).

**Thiên Mệnh Các** là dữ liệu riêng theo tài khoản trong SQLite; thưởng đại cảnh giới và mua hàng qua giao dịch server. Chỉ xóa đạo thân đã chết khi reset; kho Thiên Tinh/nâng cấp không bị xóa, trừ khi chủ tài khoản yêu cầu xóa toàn bộ dữ liệu. Xem [thien-menh-cac.md](thien-menh-cac.md).

## 4. Nạp module

`data/` và `engine/` dùng wrapper hỗ trợ CommonJS trong Node và classic scripts trong trình duyệt. Trong `index.html`, thứ tự là `data/` → `engine/state/` → `engine/rules/` → `engine/protocol/` → `engine/game.js` → `client/`.

Có thể nạp **tệp JavaScript** qua đường dẫn trực tiếp để kiểm giao diện/luật, nhưng **không thể chơi và lưu tiến trình bằng `file://`**: gameplay thực tế cần Node API, Supabase và kết nối online. `tools/build-dist.cjs` loại bỏ adapter offline và các tệp máy chủ khỏi gói web.

## 5. Thêm lệnh hoặc module

1. Định nghĩa và kiểm payload ở `engine/protocol/commands.js`; không cho client gửi `now`, RNG, giá hoặc state.
2. Gán **đúng một miền** trong `engine/rules/*.js`; triển khai method engine nhận `(payload, now)`. `engine/game.js` bắt thiếu hoặc trùng owner.
3. Nếu thêm file luật, cập nhật `engine/game.js` và thứ tự `<script>` trong `index.html`.
4. Đưa nút tương ứng vào UI qua `UI.command`, kiểm giới hạn trên server. Cập nhật [bảng 48 lệnh hiện có](engine-contract.md) và tài liệu liên quan.
5. Thêm unit/regression, migration nếu state đổi (V9 hiện hành; bản tiếp theo phải tăng schema), kiểm state JSON-safe ≤64 KB và chạy `npm run check && npm test`.

## 6. API, triển khai và tình trạng

`npm start` khởi động server HTTP `127.0.0.1:8000` mặc định: file tĩnh, `GET /api/health`, Supabase login gateway và gameplay `/api/v1` **chỉ khi đã cấu hình xác thực**. Không cấu hình xác thực thì API gameplay tắt, không có chế độ guest thay thế. Bảo mật đường dẫn tĩnh nằm ở `server/http/static.js`.

Chat nhiều người, leaderboard thật, PvP người thật, tông môn chung và market escrow **chưa phải tính năng đã hoàn tất**; UI NPC/bảng minh họa không được hiểu là dữ liệu giữa nhiều tài khoản. Xem [sổ quyết định trước phát hành](gameplay-decisions.md) và [triển khai online](online-deployment.md).

Kế hoạch backend ban đầu lưu tại [backend-plan.md](backend-plan.md) chỉ để tham khảo lịch sử; những phần mô tả LocalSession, offline progress hoặc lệnh prestige/reincarnate không còn là luật V9.
