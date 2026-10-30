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

`tools/check.mjs`, `tools/test-skeleton.mjs` và `tools/test-backend.mjs` kiểm tra các điều này ở mức cú pháp, thứ tự script và việc không đưa `server/` vào trình duyệt.

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
  main.js app.js config.js   Điểm vào, ghép ứng dụng, cấu hình từ biến môi trường
  http/                      router (vòng đời yêu cầu), errors, json, rate-limit, static
  api/routes.js              Bảng route: auth, players, sync, commands, health
  auth/                      passwords (scrypt), sessions (cookie), accounts
  services/player-service.js createPlayer / sync / command: idempotency, revision, hoàn tác
  repositories/              Hợp đồng PlayerRepository + bản bộ nhớ (transact, outbox)
  workers/outbox-worker.js   Giao sự kiện ít nhất một lần
  lib/                       util (JSON ổn định, che seed), logger
  chat/chat-service.js       Khung, chưa cài đặt
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

`npm start` chạy `server/main.js`. Vòng đời một yêu cầu `/api/*` (`server/http/router.js`): `requestId` → xô token theo IP → kiểm tra Origin (CSRF) → xác thực phiên → xô token riêng (`auth`, `command`) → handler → lỗi chuẩn `{ error: { code, message, requestId } }`. Ngoài `/api/*` là file tĩnh (chặn `server/`, `tools/`, file ẩn, `package.json`, `_headers`, thoát thư mục).

| Endpoint | Auth | Việc |
|---|---|---|
| `GET /api/health` | — | Tình trạng và số mục engine còn thiếu |
| `POST /api/auth/register` · `login` · `logout` | — / — / phiên | Tài khoản và phiên cookie |
| `GET /api/me` | phiên | Tài khoản hiện tại |
| `POST /api/players` | phiên | Tạo nhân vật `{ requestId, profile }` |
| `POST /api/sync` | phiên | Đẩy tiến trình theo đồng hồ server, trả snapshot (không tăng revision) |
| `POST /api/commands` | phiên | `{ requestId, expectedRevision, type, payload }` |

Lỗi gameplay: `REVISION_CONFLICT` (409, kèm `currentRevision`), `IDEMPOTENCY_KEY_REUSED` (409), `GAME_RULE_VIOLATION` / `INVALID_COMMAND` (422), `ENGINE_NOT_READY` (501), `RATE_LIMITED` (429, `Retry-After`).

Cơ chế, nguồn tham khảo và những điểm chưa kiểm chứng: [backend-knowledge.md](backend-knowledge.md). Thêm endpoint: thêm một mục vào `ROUTES` trong `server/api/routes.js`.

Giới hạn của khung: kho tài khoản, phiên, người chơi và outbox đều **trong bộ nhớ** (mất khi khởi động lại, chỉ một tiến trình); chưa có PostgreSQL, WebSocket/SSE chat, email/khôi phục mật khẩu, tin cậy `X-Forwarded-For` sau proxy.

## 6. Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| `data/` | Giữ nguyên dữ liệu và công thức cũ |
| `client/ui`, `css/`, `media/` | Giữ nguyên |
| `engine/` | Khung; chưa cài đặt luật, state, tạo nhân vật (xem [engine-contract.md](engine-contract.md)) |
| `server/` | Khung chạy được: auth, phiên, API, service, outbox, giới hạn tốc độ (kho trong bộ nhớ); gameplay trả 501 tới khi engine READY |
| Game chơi được | Chưa, cho tới khi `HU_GAME.MISSING` rỗng |

Cài đặt cũ vẫn xem được tại commit `5f6b9bc`, ví dụ `git show 5f6b9bc:shared/rules/combat.js`.
