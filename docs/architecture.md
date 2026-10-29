# Kiến trúc chuẩn bị online

## 1. Luồng và quyền sở hữu

```text
Giao diện → UI.command(type, payload)
              ↓ hiện tại
         LocalSession → shared/protocol/commands → shared/rules → state
              ↓
         local-store → localStorage / JSON

API online (bước tiếp theo) → xác thực → PlayerService
                                         ↓
                               repository.transact(playerId)
                                         ↓
                           đồng hồ/RNG server → cùng bộ lệnh/luật
                                         ↓
                              revision + kết quả + snapshot
```

- `shared` không truy cập DOM, localStorage, mạng hay timer. `Game` giữ state/RNG riêng cho từng instance; các module luật chỉ cài phương thức, không giữ nhân vật toàn cục.
- Giao diện đọc `UI.s()` và các phép tra cứu từ `UI.g()`. Handler gameplay gọi `UI.command()`; thưởng nhiệm vụ, kỳ ngộ, quà giao du, luận đạo, đối thủ, khởi tạo và chuyển thế nằm trong luật.
- Cài đặt hiển thị/âm thanh đi qua `UI.preference()`. Vị trí cửa sổ, bộ lọc, hiệu ứng và trạng thái modal thuộc client.
- Thành tựu được xét sau tick/lệnh. Render chỉ lấy thông báo đã tạo; không tự cấp điểm.
- Log dùng subscription của phiên, không sửa `Game.prototype` từ giao diện.
- Luật nhận thời gian do bên sở hữu phiên cung cấp. Payload lệnh không chứa `now`, RNG, giá mua, phần thưởng hoặc state.
- Chat demo chạy độc lập: `screens/chat.js → ChatSession → /api/chat/* → server/chat/demo-server.js`. Tin nhắn không sửa state gameplay.
- Cảnh sắc thuộc `client/ui/environment.js`: đọc `state.tick`, đổi mùa mỗi 900 giây và ngày/đêm mỗi 450 giây. `HU_ASSETS.zoneBg(zone, season, phase)` chọn ảnh; `hu:scene-change` phát khi cảnh sắc thay đổi. `shared/data/catalog.js` chỉ giữ dữ liệu địa danh.

## 2. Các file cũ được chuyển tới đâu?

| Trước đây | Hiện tại |
|---|---|
| `js/engine.js` | `shared/game.js`, `shared/data/{catalog,character,social}.js`, `shared/state/player.js`, `shared/rules/*.js` |
| `js/{balance,items,adventure}-data.js` | `shared/data/{balance,items,adventures}.js` |
| `js/formulas.js`, `js/adventures.js` | `shared/rules/formulas.js`, `shared/rules/adventures.js` |
| `js/ui-core.js` | `client/ui/core.js`, `client/session/local-session.js`, `client/persistence/local-store.js` |
| `js/ui-shell.js`, `js/ui-boot.js` | `client/ui/shell.js`, `client/ui/boot.js` |
| `js/screens-*.js` | `client/ui/screens/*.js` |
| `js/assets.js`, `js/asset-index.js`, `js/preload-manifest.js` | `client/assets/` |
| `js/audio.js`, `js/content-guard.js`, `js/loader.js` | `client/platform/` |
| `js/vfx.js`, `js/main.js` | `client/ui/vfx.js`, `client/main.js` |

`index.html` liệt kê thứ tự classic scripts. Node dùng `require('./shared/game.js')`. Cả hai dùng cùng source, không có bản sao engine. CSS và đường dẫn `media/` vẫn tính từ trang gốc.

## 3. Hợp đồng lệnh

Danh sách đầy đủ: `shared/protocol/commands.js` (`types`, `validate`, `execute`). Ví dụ UI:

```js
UI.command('buy', { code: 'HERB-001' });
UI.command('giftFriend', { id: 'trieu-nguyet' });
UI.command('setAuto', { enabled: true });
UI.command('garden', { slot: 0, action: 'water' });
```

Payload có khóa lạ, kiểu sai, số âm/phân số ngoài phạm vi hoặc mã vật phẩm không hợp lệ bị từ chối. Các điều kiện theo nhân vật như tiền, cấp, hồi chiêu và nhiệm vụ đã nhận được kiểm tra trong luật. `reincarnate` chỉ hợp lệ khi đã tọa hóa; không có lệnh từ client để gọi `prestige(true)`.

Gói gửi tới service:

```json
{
  "protocolVersion": 1,
  "requestId": "request-001",
  "expectedRevision": 0,
  "type": "buy",
  "payload": { "code": "HERB-001" }
}
```

Service trả `revision`, `serverTime`, `state`, `result`, `report`, `logs`, `achievements`, `died`, `replayed`. Snapshot không chứa seed bí cảnh. Không dùng snapshot client gửi lại làm nguồn state của server.

## 4. Dịch vụ người chơi

Ví dụ chạy trong Node:

```js
const { MemoryPlayers } = require('./server/repositories/memory-players.js');
const { PlayerService } = require('./server/services/player-service.js');

const repository = new MemoryPlayers();
const service = new PlayerService({ repository });
// Adapter xác thực trên server tạo principal này từ phiên đăng nhập.
const principal = { playerId: 'user-001' };

async function demo() {
  await service.createPlayer(principal, {
    name: 'Bạch Thanh Vân', gender: 'nu', talent: { ngoTinh: 8 }
  });
  const result = await service.execute(principal, {
    protocolVersion: 1, requestId: 'request-001', expectedRevision: 0,
    type: 'buy', payload: { code: 'HERB-001' }
  });
  console.log(result.revision, result.state.bag['HERB-001']);
}
demo();
```

- `createPlayer` chỉ nhận tên, giới tính, điểm thiên phú; server gieo tuổi, chủng tộc và linh căn. Luồng gieo lại có vé phiên có thể bổ sung khi thiết kế màn tạo nhân vật online.
- `execute` chạy catch-up rồi lệnh trong một giao dịch. Nếu lỗi, toàn bộ thay đổi giao dịch bị bỏ; lần sau tính lại catch-up.
- `sync` tính tiến trình bằng đồng hồ server và tăng revision. Khi có `REVISION_CONFLICT`, client cần đồng bộ và quyết định gửi lệnh lại với revision mới.
- Hai lệnh cùng revision chỉ một lệnh được ghi. Hai người chơi có hàng đợi và state riêng.
- 32 mã lệnh gần nhất được lưu cùng state. Retry cùng ID/nội dung trả kết quả đã ghi và snapshot mới nhất, không trừ tiền/cấp thưởng lại. ID trùng nhưng nội dung khác trả `REQUEST_ID_REUSED`. Receipt hết hạn vẫn được bảo vệ khỏi retry cũ bằng revision; không tự đổi revision cho một request đang retry.
- `MemoryPlayers` là adapter phát triển/test, mất dữ liệu khi process dừng và chỉ khóa trong một process. Adapter database phải thực hiện `transact(playerId, update)` nguyên tử trên cả revision, state và receipts, kể cả khi nhiều server cùng ghi.

## 5. Bản lưu và các tính năng hiện có

Schema tiếp tục là V7. Hai khóa vẫn là `huGioiWorkspaceV1` và `huGioiWorkspaceV1Backup`; bản V4/V5/V6/V7 được chuyển qua `shared/state/player.js`. Backup, import và export thuộc adapter offline. Việc đưa save offline sang tài khoản online cần một luồng chuyển dữ liệu riêng ở server.

Linh điền bổ sung `slot`, `plantedAt`, `water`, `soil`, `pest`, `steps`, `good`, `dry`, `wilt` vào từng ô. Bản V7 chỉ có `herb/end` được bổ sung mặc định khi nạp. Ô có số cố định 0–3, thu hoạch không dịch chuyển ô khác. Luật `crafting.js` xử lý 6 giai đoạn lớn, RNG sâu bệnh, dưỡng chất, héo, phẩm chất và thu hoạch; lệnh `garden` chỉ nhận `slot` và `action` (`water/soil/pest/harvest`). Khi offline, cây lớn an toàn đến lúc chín và chờ thu hoạch thủ công. Không cấp vật phẩm từ render.

Màn loading/preload, báo cáo bế quan, tọa hóa, nhạc, nhật ký, đột phá nhỏ trực tiếp và trang độ kiếp lớn tiếp tục sử dụng các module đã tách. Bản web chạy `file://` bằng classic scripts và giữ CSP/bảo vệ nội dung hiện tại.

## 6. Bước nối online

Kế hoạch thiết kế backend chi tiết (stack, schema, API, bảo mật, lộ trình): [backend-plan.md](backend-plan.md).

Nền tảng `PlayerService` chưa mở cổng mạng. Chat demo đã có máy chủ độc lập (mục 8). Các phần gameplay online cần triển khai tiếp:

1. Chọn tài khoản/đăng nhập và API HTTP hoặc WebSocket; API lấy `principal` từ xác thực server.
2. Thay `MemoryPlayers` bằng database có transaction/revision và lưu receipt bền vững.
3. Tạo adapter phiên remote bất đồng bộ. `UI.command` hiện trả kết quả đồng bộ của `LocalSession`; runner, callback modal, độ kiếp và vòng tick cần chờ Promise, xử lý mất kết nối và đồng bộ snapshot. Chuyển phần cài đặt trình duyệt sang kho local riêng khi dùng snapshot server.
4. Chỉ server tính tick, offline, RNG và phần thưởng. Client có thể dự đoán số hiển thị nhưng phải nhận lại snapshot chính thức; không gọi `Game.advance()` để ghi tiến trình online.
5. Nâng chat demo lên tài khoản thật và lưu bền vững; xây PvP thật, tông môn chung, đấu giá và bảng xếp hạng. Giao du/PvP/đấu giá hiện tại vẫn là luật mô phỏng theo từng nhân vật.
6. Khi có endpoint cụ thể, cập nhật `connect-src` trong `index.html` và `_headers`; cấu hình static hosting phục vụ `index.html`, `client/`, `shared/`, `css/`, `media/`, còn service chạy ở backend riêng.

## 7. Kiểm tra

`npm run check`: kiểm tra cú pháp JavaScript trong `client/`, `shared/`, `server/`, `tools/` và đường dẫn script trong `index.html`.

## 8. Chat online demo

Chạy `npm run demo` với Node 20+, mặc định `127.0.0.1:8000`; `HOST` và `PORT` tùy chỉnh địa chỉ nghe. Máy chủ dùng thư viện chuẩn Node, phục vụ `/index.html`, `client/`, `shared/`, `css/`, `media/` và ba endpoint:

| Endpoint | Nội dung |
|---|---|
| `POST /api/chat/join` | Nhận `{ name }`, tạo/cập nhật phiên demo và cookie HttpOnly/SameSite=Strict. Trả `self`. |
| `GET /api/chat/events` | SSE với `snapshot` (100 tin gần nhất), `message`, `presence`; heartbeat mỗi 15 giây. |
| `POST /api/chat/messages` | Nhận `{ requestId, text }`, xác thực phiên, giới hạn 400 ký tự và một tin/2 giây. Retry cùng ID/nội dung trả lại tin đã gửi trong cửa sổ 100 receipt/phiên. |

Tên và tin nhắn hiển thị qua `textContent`. Server tạo ID/thời gian/tên người gửi từ phiên, giới hạn body 4 KiB và chỉ nhận POST cùng origin. Có tối đa 100 kết nối SSE, 3 kết nối/phiên; phiên hết hạn sau 24 giờ. Phiên, lịch sử, receipt đều trong RAM. Đây là danh tính demo bằng đạo hiệu, chưa xác thực tài khoản gameplay.

`ChatSession` kết nối lại với backoff, giữ bản nháp tại UI và tái sử dụng requestId khi người chơi gửi lại cùng bản nháp bị lỗi. `connect-src 'self'` trong HTML/`_headers` cho phép API cùng origin. Trên `file://`, chat chỉ hiển thị hướng dẫn khởi chạy HTTP.
