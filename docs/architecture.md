# Kiến trúc

Repository chia thành bốn lớp với một chiều phụ thuộc duy nhất. Mỗi lớp chỉ được dùng lớp bên phải của nó.

```text
client/  ──►  engine/  ──►  data/
server/  ──►  engine/  ──►  data/
```

| Lớp | Vai trò | Được dùng | Không được dùng |
|---|---|---|---|
| `data/` | Dữ liệu thiết kế và mô hình cân bằng thuần (bảng, hằng số, công thức). Không có state. | — | `engine/`, `client/`, `server/`, DOM, mạng |
| `engine/` | Luật chơi và hợp đồng lệnh. Một nguồn luật duy nhất cho client và server. | `data/` | DOM, `localStorage`, mạng, timer, `Date.now()`, `Math.random()` trực tiếp |
| `client/` | Giao diện, tài nguyên, lưu cục bộ, phiên chơi. | `engine/`, `data/` | `server/` |
| `server/` | Máy chủ HTTP: file tĩnh và API. | `engine/`, `data/` | `client/` |

`tools/check.mjs` và `tools/test-skeleton.mjs` kiểm tra các điều này ở mức cú pháp, thứ tự script và việc không đưa `server/` vào trình duyệt.

## 1. Thư mục

```text
index.html                 Điểm vào trình duyệt và thứ tự nạp scripts
data/                      Dữ liệu thiết kế + công thức cân bằng
  balance.js  formulas.js  Bảng cân bằng và mô hình số học (F)
  items.js design-raw.js design.js catalog.js    Vật phẩm, snapshot thiết kế, lớp ánh xạ, tra cứu
  roots.js character.js    Linh căn, chủng tộc, thiên phú, thiên mệnh, thành tựu
  social.js adventures.js  Giao du/NPC; bí cảnh, kỳ ngộ, tông môn, tôi luyện
engine/
  game.js                  Ghép data + state + rules; báo READY/MISSING
  state/player.js          Schema V7, create, normalize V4–V7
  rules/                   Chín miền luật (mỗi lệnh thuộc đúng một miền)
    progression inventory crafting combat world adventures social time creation
  protocol/commands.js     46 lệnh: schema payload, validate, execute
client/
  assets/ platform/        Ảnh, âm thanh, loading, bảo vệ nội dung
  persistence/             localStorage, dự phòng, xuất/nhập JSON
  session/                 LocalSession (phiên offline) và ChatSession (HTTP/SSE)
  ui/                      Màn hình, vỏ giao diện, hiệu ứng, tân thủ
  main.js                  Khởi động; hiển thị thông báo khi engine chưa READY
server/
  main.js                  Điểm vào (npm start)
  http/                    router.js, static.js
  services/                player-service.js   (khung, chưa cài đặt)
  repositories/            player-repository.js (khung, chưa cài đặt)
  chat/                    chat-service.js      (khung, chưa cài đặt)
css/  media/  _headers     Giao diện, tài nguyên, HTTP headers
tools/                     Kiểm tra, sinh preload, import dữ liệu; pending-engine/ chờ engine mới
docs/                      Tài liệu
```

## 2. Luồng lệnh

```text
UI → UI.command(type, payload) → LocalStore.dispatch → LocalSession.dispatch
   → protocol.validate → game.advance(now) → protocol.execute → game[type](payload, now)
   → game.checkMeta() → thành tựu / log / cập nhật UI
```

Phiên (client hoặc server) là bên sở hữu đồng hồ và RNG và truyền `now` vào engine. Payload không bao giờ chứa `now`, RNG, giá, phần thưởng hay state.

Bản online (chưa có) giữ nguyên engine: `API → xác thực → PlayerService → repository.transact(playerId) → cùng protocol + rules → revision + kết quả + snapshot`. Chi tiết ở [backend-plan.md](backend-plan.md).

## 3. Nạp module

Mọi file trong `data/` và `engine/` dùng mẫu hai môi trường:

```js
(function (root) {
  const node = typeof module !== 'undefined' && module.exports;
  const X = node ? require('./x.js') : root.HU_X;   // Node: require; trình duyệt: biến toàn cục
  // …
  root.HU_Y = API; if (node) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
```

Trình duyệt dùng classic script để chạy được cả `file://` không cần bundler, nên **thứ tự thẻ `<script>` trong `index.html` là một phần của mã**: `data/` → `engine/state` → `engine/rules` → `engine/protocol` → `engine/game.js` → `client/…`. `tools/test-skeleton.mjs` kiểm tra thứ tự này.

## 4. Thêm hoặc đổi một lệnh

1. Khai báo schema trong `engine/protocol/commands.js` (`SCHEMAS`).
2. Thêm tên lệnh vào `commands` của đúng một module trong `engine/rules/` và cài phương thức `API.Game.prototype[tên] = function (payload, now) {…}` trong `install`.
3. Gọi từ UI bằng `UI.command('tên', payload)`; hiển thị kết quả từ state, không tự cấp thưởng ở UI.
4. Cập nhật bảng lệnh trong [engine-contract.md](engine-contract.md) và thêm test.
5. `npm run check && npm test`.

`engine/game.js` từ chối nạp nếu một lệnh thuộc hai miền, thuộc không miền nào, hoặc có trong module nhưng không có trong protocol.

## 5. Máy chủ

`npm start` chạy `server/main.js`: phục vụ file tĩnh (chặn `server/`, `tools/`, file ẩn, `package.json`, `_headers` và mọi đường dẫn thoát thư mục) và `GET /api/health`. Route mới thêm vào bảng `ROUTES` trong `server/http/router.js`. Dịch vụ người chơi, kho lưu trữ và chat mới là khung giao diện, mô tả trong từng file và trong [backend-plan.md](backend-plan.md).

## 6. Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| `data/` | Giữ nguyên dữ liệu và công thức cũ |
| `client/ui`, `css/`, `media/` | Giữ nguyên |
| `engine/` | Khung; chưa cài đặt luật, state, tạo nhân vật (xem [engine-contract.md](engine-contract.md)) |
| `server/` | Chạy file tĩnh và `/api/health`; còn lại là khung |
| Game chơi được | Chưa, cho tới khi `HU_GAME.MISSING` rỗng |

Cài đặt cũ vẫn xem được tại commit `5f6b9bc`, ví dụ `git show 5f6b9bc:shared/rules/combat.js`.
