# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên bằng tiếng Việt, chạy trên trình duyệt với giao diện tiên hiệp tông tối. Người chơi tạo đạo thân, tu luyện, lịch luyện, vượt thiên kiếp và tích lũy Thiên mệnh qua nhiều kiếp.

> **Trên nhánh online:** frontend sử dụng `RemoteSession` và **bắt buộc đăng nhập Supabase**; gameplay, thời gian, RNG, tài nguyên và cài đặt được ghi bằng lệnh `/api/v1` lên Node + SQLite. Chế độ khách/offline không còn được phục vụ. **Để chơi thực sự trên internet cần triển khai Node backend HTTPS**; Cloudflare static-only không cung cấp API. Tài liệu triển khai tại [docs/online-deployment.md](docs/online-deployment.md). Xem mục [Backend](#backend) và [kế hoạch](docs/backend-plan.md).

Repository: [zeplaovn/Hugioi](https://github.com/zeplaovn/Hugioi).

## Chạy dự án

Yêu cầu **Node.js 24+**. Không cần `npm install` để chạy Node backend. Cần cấu hình `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` và volume SQLite riêng; xem `.env.example` và `docs/online-deployment.md`.

```sh
npm start        # máy chủ tại http://127.0.0.1:8000 (HOST, PORT tùy chọn)
npm run check    # cú pháp JavaScript, ranh giới engine, thứ tự script
npm test         # test backend /api/v1, RemoteSession, engine và giao diện
```

`npm start` phục vụ giao diện và `/api/v1/*` khi cấu hình Supabase. Auth dùng Supabase JWT và hai bản ghi đồng ý chính sách. Backend từ chối hoạt động online khi thiếu xác thực hoặc quyền consent. Không bật `HU_LEGACY_AUTH` trong production.

`index.html` chỉ chơi được khi phục vụ qua HTTP(S) với API `/api/v1` đang hoạt động và cấu hình Supabase. Mở bằng `file://` chỉ hiển thị thông báo cần máy chủ, **không tạo/sửa bản lưu offline**. Node backend tính bế quan và lưu tiến trình liên tục.

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

- Giao diện **không ghi bản nhân vật vào `localStorage`**. Snapshot chỉ được hiển thị trong bộ nhớ; Node backend lưu dữ liệu trong SQLite trên volume của máy chủ.
- Chuyển thiết bị: đăng nhập lại tài khoản Supabase trên cùng tên miền backend để mở nhân vật.
- **Không tự động nhập các bản lưu offline cũ**. Không lấy JSON phía client làm trạng thái tin cậy; cần một quy trình nhập có xác thực/kiểm toán riêng nếu sẽ hỗ trợ di trú.
- **Tọa hóa:** chỉ khi server xác nhận nhân vật đã chết mới cho xóa nhân vật SQLite để tạo lại. Tài khoản Supabase vẫn tồn tại.
- Cần thực hiện backup/restore database và quy trình xóa dữ liệu theo yêu cầu trước phát hành thương mại.

## Cấu trúc mã nguồn

Phụ thuộc một chiều: `client/` và `server/` → `engine/` → `data/`. Chi tiết: [docs/architecture.md](docs/architecture.md).

```text
index.html                 Điểm vào trình duyệt và thứ tự nạp scripts
data/                      Dữ liệu thiết kế và công thức cân bằng (thuần dữ liệu)
engine/                    Luật chơi dùng chung cho client và server
  game.js                    Ghép data + state + rules; báo READY / MISSING
  state/                     Schema V8, create, normalize V4–V8
  rules/                     9 miền: progression inventory crafting combat world adventures social time creation
  protocol/                  52 lệnh: schema payload, validate, execute
client/
  assets/ platform/          Ảnh, âm thanh, loading, bảo vệ nội dung
  persistence/               RemoteStore (bản LocalStore cũ giữ để kiểm toán)
  session/                   RemoteSession (online) và ChatSession (HTTP/SSE)
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

**Đã có:** `RemoteSession`, máy chủ cấp ticket tạo nhân vật, thực thi 52 lệnh engine, sync, reset sau tọa hóa, đồng bộ cài đặt. **Chưa có:** máy chủ HTTPS đã triển khai, nhập save offline, PvP/chat nhiều người thật (các tính năng này vẫn chỉ là NPC/mô phỏng hoặc khung chưa triển khai), admin API và WebSocket. Nếu game tĩnh chạy ở domain khác với API, cần thêm origin API vào `connect-src` của CSP (`_headers`, `server/http/static.js`) và `HU_ALLOWED_ORIGINS`.

## Tài liệu

- [Kiến trúc](docs/architecture.md): các lớp, thư mục, luồng lệnh, cách nạp module, thêm lệnh.
- [Hợp đồng engine](docs/engine-contract.md): đặc tả UI cần từ engine (51 lệnh, API `HU_GAME`, state, bản lưu).
- [Kế hoạch backend online](docs/backend-plan.md): thiết kế server-authoritative nhiều người chơi.
- [Tích hợp dữ liệu thiết kế](docs/design-integration.md): phạm vi dữ liệu và cách nhập snapshot mới.
- [data/README.md](data/README.md): dữ liệu thiết kế và công thức cân bằng.

## Thiên Thư · Vạn Kiếp Tàng Thư

Vào **Thiên Mệnh → Thiên Thư** để đọc 14 chương qua Hạ Giới, Linh Giới và Tiên Giới. Chương mở theo cảnh giới; trang đã đọc được giữ qua trọng sinh. Ba lựa chọn cốt truyện lưu lời hẹn nhưng không đổi chỉ số hay phần thưởng.

Trong **Thế giới → NPC**, chọn **Trò chuyện** để gặp 10 kỳ nhân qua ba mức thiện cảm (0, 20, 55). Hội thoại nhiều lượt gồm câu đáp của người chơi, chủ đề và lựa chọn lưu qua engine. Bí cảnh và kỳ ngộ có lời dẫn bổ sung trong các bảng hiện có. Nội dung ở `data/story.js`, một lệnh mới `storyMark` thuộc miền `world`; có thể chạy offline bằng `file://`.
