# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên bằng tiếng Việt, chạy trên trình duyệt với giao diện tiên hiệp tông tối. Người chơi tạo đạo thân, tu luyện, lịch luyện, vượt thiên kiếp và tích lũy Thiên mệnh qua nhiều kiếp.

> **Hiện trạng:** engine game chạy offline trong trình duyệt (`LocalSession`) và đã có **backend gameplay server-authoritative** (`/api/v1`, SQLite, `PlayerService`): máy chủ giữ đồng hồ, RNG, tiến trình bế quan và phần thưởng. **Client chưa có `RemoteSession`**, nên bản chơi trên trình duyệt vẫn lưu cục bộ; API sẵn sàng để nối. Xem mục [Backend](#backend) và [kế hoạch](docs/backend-plan.md).

Repository: [zeplaovn/Hu-gioi](https://github.com/zeplaovn/Hu-gioi).

## Chạy dự án

Yêu cầu **Node.js 20+**. Không cần `npm install`.

```sh
npm start        # máy chủ tại http://127.0.0.1:8000 (HOST, PORT tùy chọn)
npm run check    # cú pháp JavaScript, ranh giới engine, thứ tự script
npm test         # test hợp đồng, hành vi 9 miền luật, LocalSession và UI entry
```

`npm start` phục vụ game tĩnh, `GET /api/health` và API **`/api/auth/signup`, `/login`, `/session`, `/logout`**. Mặc định dữ liệu tài khoản thử nghiệm được ghi vào `.hu-gioi/accounts.json` (không công khai, đã gitignore); có thể đổi đường dẫn bằng `HU_AUTH_FILE`. Mật khẩu dùng scrypt và token phiên chỉ được đặt trong cookie HttpOnly. Đây là **auth MVP cho một máy chủ Node**, không phải hệ thống tài khoản production đa instance — cần thay bằng database/AuthProvider trước khi triển khai thực tế.

Có thể mở [index.html](index.html) (`file://`) hoặc dùng máy chủ tĩnh để **Vân du không tài khoản**. Login/Sign up không hoạt động khi không có API Node. Gameplay chạy offline qua `LocalSession`, tự lưu `localStorage` và cộng tiến trình khi mở lại. Nếu engine chưa READY, trang mở bản xem trước giao diện.

## Tính năng thiết kế

Các tính năng sau thuộc bản trước và là phạm vi mà engine mới phải đáp ứng; UI và dữ liệu cho chúng vẫn còn trong repository.

| Nhóm | Nội dung |
|---|---|
| Khởi nguyên | Logo ảnh `logo.webp`; ô Chủng tộc/Linh căn hiện thông số (tốc tu, tinh khiết) và mở bảng so sánh; mục **Kinh mạch** xem trước 12 chính kinh theo hệ, mạch cùng hệ/sinh hệ và tốc độ tích tạp chất (dữ liệu `data/meridians.js`, theo root.txt; chưa là trạng thái engine). Intro cinematic 5 chương; loading tối thiểu 10,9 giây. Tạo đạo hiệu, giới tính, tuổi, chủng tộc, linh căn và phân bổ thiên phú. Nhấn ô chủng tộc hoặc linh căn để xem giải thích. Không còn gieo Âm Dương khi tạo mới; bản lưu cũ vẫn được giữ. |
| Tu luyện | Tự tăng tu vi, bế quan khi vắng mặt, báo cáo tiến trình và giới hạn tu vi tại ngưỡng đột phá. |
| Cảnh giới | Tiểu cảnh giới (tầng) **tự động đột phá** khi đủ tu vi, kể cả nhiều tầng liên tiếp lúc bế quan. Đến tầng cuối (viên mãn) tu vi dừng ở ngưỡng và người chơi phải **bấm tay** đột phá đại cảnh giới: có xác nhận, trang độ kiếp riêng, hiệu ứng và kết quả. VFX đột phá nhỏ và giai đoạn tụ linh quang trên độ kiếp đài kéo dài thêm 5 giây; chế độ giảm chuyển động vẫn được tôn trọng. |
| Lịch luyện | Công kích, kỹ năng, chiến đấu tự động, yêu thú, chiến lợi phẩm, Sinh lực và Linh khí. |
| Nhân vật | Hành trang, trang bị pháp bảo, công pháp chủ động, linh căn ngũ hành và Dị linh căn Băng/Lôi/Phong/Độc. Ngũ hành có cơ hội hóa Hỗn Độn khi vượt lôi kiếp; Dị khắc hệ gốc. |
| Nghề phụ | Luyện đan, rèn pháp bảo, chế phù và linh điền. Hạt trong bộ dữ liệu mới có thời gian, loại đất, độ khó và sản lượng riêng; các hạt còn lại tiếp tục dùng luật cũ. Cây được chăm an toàn khi bế quan. |
| Thế giới | Nhiệm vụ, bí cảnh, kỳ ngộ, tông môn và NPC Hạ Giới có quan hệ, vai trò, sở thích và thiện cảm. |
| Xuyên kiếp | Trọng sinh chủ động trong **Thiên mệnh → Trọng sinh** theo luật gốc. **Tọa hóa vì cạn thọ nguyên** xóa toàn bộ tiến trình, Thiên mệnh và bản lưu dự phòng rồi trở về màn tạo nhân vật mới; không xóa tài khoản. |
| Giao diện idle | Thanh tài nguyên (linh thạch, tu vi/giây, Đạo vận) có số chạy, thanh tu vi + dải chấm tầng, dock nâng cấp nhanh (Tốc tu ×1/×10/Tối đa, Hấp thu, Dùng đan) ngay trên sân khấu, nút lớn Đột phá đại cảnh giới, cầu linh khí bay vào thanh tu vi, chấm thông báo trên tab, popup Bế quan trở về có số đếm lên. Mã: `css/idle.css`, `client/ui/idle-hud.js`. |
| Trải nghiệm | Nhật ký tu tiên chữ lớn, nhạc nền, chuyển cảnh bốn mùa/ngày–đêm, tùy chọn giảm chuyển động, giao diện desktop/mobile. Mỗi menu (Nhân vật, Nghề phụ, Thế giới, Cài đặt…) mở thành một trang riêng phủ vùng màn chơi, có nút ‹ Tu luyện để quay lại; menu thu gọn/mở bằng icon ☰ (nhớ lựa chọn). Lịch luyện vẫn hiện bảng dưới sân khấu để xem trận đánh. |

Menu **Thêm** gồm: **Chat online · Tri kỷ · Đạo hữu · Tông môn · PvP · Bảng xếp hạng**. Giao du, PvP, bảng xếp hạng và đấu giá hiện phục vụ chế độ mô phỏng một người chơi.

Hạ Giới và Linh Giới dùng ảnh `.webp` trong `media/assets/world/bg/<giới>/<day|night>/<xuan|ha|thu|dong>.webp`. Mỗi mùa tự động dài 15 phút tiến trình tu luyện, chia đều ngày/đêm. Tiên Giới dùng duy nhất `tien_gioi/bg.webp`. Có thể chọn mùa cố định tại **Cài đặt → Tứ thời**.

## Lưu và chuyển tiến trình

- Game tự lưu bằng `localStorage`; vào **Cài đặt → Bản lưu** để **Lưu ngay**, **Xuất JSON** hoặc **Nhập JSON**.
- Tệp xuất có tên `hu-gioi-save.json`. Nhập bản lưu hỗ trợ V4, V5, V6, V7 và V8, chuyển về schema **V8**.
- Khách dùng `huGioiWorkspaceV1` và `huGioiWorkspaceV1Backup`. Với tài khoản đã đăng nhập, key được gắn hậu tố `:<accountId>` để người khác đăng nhập trên cùng trình duyệt không nạp nhầm bản lưu. Bản lưu vẫn chỉ tồn tại trong trình duyệt này.
- Dữ liệu gắn với trình duyệt và địa chỉ chạy game. Dùng xuất/nhập JSON khi đổi thiết bị, trình duyệt hoặc chuyển giữa `file://` và HTTP.
- Thiên mệnh được giữ qua **trọng sinh chủ động**, nhưng **khi tọa hóa**, bấm Trở về Khởi Nguyên sẽ xóa tất cả dữ liệu game của người chơi hiện tại (cả chính/dự phòng) và mở lại tạo nhân vật. Tài khoản đăng nhập và tiến trình của các tài khoản khác không bị xóa.

## Cấu trúc mã nguồn

Phụ thuộc một chiều: `client/` và `server/` → `engine/` → `data/`. Chi tiết: [docs/architecture.md](docs/architecture.md).

```text
index.html                 Điểm vào trình duyệt và thứ tự nạp scripts
data/                      Dữ liệu thiết kế và công thức cân bằng (thuần dữ liệu)
engine/                    Luật chơi dùng chung cho client và server
  game.js                    Ghép data + state + rules; báo READY / MISSING
  state/                     Schema V8, create, normalize V4–V8
  rules/                     9 miền: progression inventory crafting combat world adventures social time creation
  protocol/                  51 lệnh: schema payload, validate, execute
client/
  assets/ platform/          Ảnh, âm thanh, loading, bảo vệ nội dung
  persistence/               localStorage, dự phòng, xuất/nhập JSON
  session/                   LocalSession (offline) và ChatSession (HTTP/SSE)
  ui/                        Màn hình, vỏ giao diện, hiệu ứng, tân thủ
  main.js                    Khởi động
server/                    Máy chủ HTTP
  main.js http/              File tĩnh + /api/health + /api/auth/* (thử nghiệm) + /api/v1/*
  auth/ http/ services/ repositories/   JWT, API /api/v1, PlayerService, kho SQLite; chat/ vẫn là khung
css/  media/  _headers     Giao diện, hình ảnh/âm thanh, HTTP headers
tools/                     Kiểm tra, preload, import dữ liệu; pending-engine/ chờ engine mới
docs/                      Tài liệu
```

## Phát triển

- Viết luật và tính thưởng trong `engine/`; giao diện chỉ gửi lệnh bằng `UI.command(type, payload)` và hiển thị state. Cài đặt hiển thị dùng `UI.preference()`.
- `engine/` và `data/` không phụ thuộc DOM, `localStorage`, mạng hay timer; thời gian và RNG do phiên cung cấp.
- Thêm lệnh: khai báo schema trong `engine/protocol/commands.js`, gán cho đúng một miền trong `engine/rules/`, cập nhật [bảng lệnh](docs/engine-contract.md#4-lệnh-51) và test. `engine/game.js` từ chối nạp nếu lệnh thuộc hai miền hoặc không thuộc miền nào.
- Thêm module: cập nhật điểm ghép trong `engine/game.js` **và** thứ tự thẻ `<script>` trong `index.html` để Node lẫn `file://` nạp đúng; `npm test` kiểm tra thứ tự.
- Khi thay ảnh, cập nhật ánh xạ trong `client/assets/` và `client/assets/preload-manifest.js`.
- Thay dữ liệu thiết kế: xem [docs/design-integration.md](docs/design-integration.md).

Engine đã hoàn tất theo thứ tự state → time/creation → progression → inventory/crafting/combat → world/adventures/social. Test nằm trong `tests/`; `HU_GAME.MISSING` rỗng nên UI tự khởi động phiên chơi.

## Backend

`server/` phục vụ file tĩnh, `/api/health` và **API gameplay `/api/v1`**. API chỉ bật khi có cấu hình xác thực; không cấu hình thì chỉ chạy file tĩnh (`/api/v1/*` trả 404). Không cần `npm install`; kho lưu trữ dùng `node:sqlite` có sẵn trong Node.

| Biến môi trường | Ý nghĩa |
|---|---|
| `SUPABASE_URL` | URL project Supabase; suy ra issuer và JWKS để xác minh JWT (ES256/RS256) |
| `SUPABASE_JWT_SECRET` | Tùy chọn, cho project còn dùng HS256 |
| `SUPABASE_PUBLISHABLE_KEY` | Bắt buộc khi dùng Supabase JWT, để máy chủ kiểm tra hai bản ghi chấp thuận chính sách theo RLS |
| `HU_LEGACY_AUTH=1` | Dùng AuthService cookie thử nghiệm thay Supabase (chỉ dev/test) |
| `HU_DB_FILE` | Đường dẫn SQLite, mặc định `.hu-gioi/game.sqlite` (không được nằm trong thư mục công khai) |
| `HU_ALLOWED_ORIGINS` | Origin được gọi API khi game tĩnh ở domain khác (CORS), phân cách bằng dấu phẩy |
| `HU_ONLINE_GRACE_MS` | Quá ngưỡng này kể từ lần thấy gần nhất thì tính offline (cap + hiệu suất offline), mặc định 300000 |

| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/v1/bootstrap` | Phiên bản giao thức/nội dung, giờ máy chủ, nhân vật của tài khoản |
| POST | `/api/v1/creation/preview` | Máy chủ gieo tuổi, chủng tộc, linh căn; trả ticket 10 phút (5 lần/ngày) |
| POST | `/api/v1/players` | Tạo nhân vật từ ticket + đạo hiệu/giới tính/thiên phú |
| GET | `/api/v1/players/{id}/state` | Snapshot hiện tại, không catch-up |
| POST | `/api/v1/players/{id}/sync` | Catch-up bế quan theo đồng hồ máy chủ, trả snapshot |
| POST | `/api/v1/players/{id}/commands` | Một lệnh `{ protocolVersion, requestId, expectedRevision, type, payload }` |

Đảm bảo: API JWT chỉ hoạt động khi máy chủ xác minh được cả hai bản chấp thuận chính sách `privacy` và `release_terms` phiên bản `2026-11-09`. Không thể vượt qua bằng cách bỏ qua checkbox frontend; Supabase gián đoạn thì API từ chối tạm thời. `HU_LEGACY_AUTH=1` chỉ dùng phát triển, bị chặn khi `NODE_ENV=production`. Đặt thư mục SQLite quyền `0700` và tệp DB quyền `0600`; API không thể hoạt động trên Cloudflare static-only khi chưa triển khai Node riêng.

Đảm bảo: client không gửi state/thời gian/RNG/giá; `requestId` idempotent (retry trả `replayed: true`, không trừ tiền hai lần); `expectedRevision` lệch trả `REVISION_CONFLICT`; lệnh bị luật từ chối không ghi state; snapshot không chứa seed bí cảnh; mỗi người chơi có chuỗi RNG riêng (HMAC) lưu ở máy chủ; giới hạn tốc độ, body ≤ 64 KB, envelope lỗi `{ error: { code, message, requestId, retryable } }`. Chạy một instance (SQLite ghi một process); nhiều instance cần chuyển sang PostgreSQL theo cùng hợp đồng `server/repositories/player-repository.js`.

**Chưa có:** `RemoteSession` ở client, batch lệnh, nhập save offline, bảng xếp hạng, chat/PvP/tông môn dùng chung, admin API, WebSocket. Nếu game tĩnh chạy ở domain khác với API, cần thêm origin API vào `connect-src` của CSP (`_headers`, `server/http/static.js`) và `HU_ALLOWED_ORIGINS`.

## Tài liệu

- [Kiến trúc](docs/architecture.md): các lớp, thư mục, luồng lệnh, cách nạp module, thêm lệnh.
- [Hợp đồng engine](docs/engine-contract.md): đặc tả UI cần từ engine (51 lệnh, API `HU_GAME`, state, bản lưu).
- [Kế hoạch backend online](docs/backend-plan.md): thiết kế server-authoritative nhiều người chơi.
- [Tích hợp dữ liệu thiết kế](docs/design-integration.md): phạm vi dữ liệu và cách nhập snapshot mới.
- [data/README.md](data/README.md): dữ liệu thiết kế và công thức cân bằng.

## Thiên Thư · Vạn Kiếp Tàng Thư

Vào **Thiên Mệnh → Thiên Thư** để đọc 14 chương qua Hạ Giới, Linh Giới và Tiên Giới. Chương mở theo cảnh giới; trang đã đọc được giữ qua trọng sinh. Ba lựa chọn cốt truyện lưu lời hẹn nhưng không đổi chỉ số hay phần thưởng.

Trong **Thế giới → NPC**, chọn **Trò chuyện** để gặp 10 kỳ nhân qua ba mức thiện cảm (0, 20, 55). Hội thoại nhiều lượt gồm câu đáp của người chơi, chủ đề và lựa chọn lưu qua engine. Bí cảnh và kỳ ngộ có lời dẫn bổ sung trong các bảng hiện có. Nội dung ở `data/story.js`, một lệnh mới `storyMark` thuộc miền `world`; có thể chạy offline bằng `file://`.
