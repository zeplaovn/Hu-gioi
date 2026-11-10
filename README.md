# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên online bằng tiếng Việt: mỗi nhân vật chỉ có một mạng. Người chơi chọn một Thiên mệnh khi tạo nhân vật, tu luyện và vượt thiên kiếp. Tọa hóa kết thúc nhân vật hiện tại, nhưng **Thiên Tinh và nâng cấp Thiên Mệnh Các thuộc tài khoản** được giữ để bước vào kiếp mới.

> **Trạng thái mã nguồn:** frontend sử dụng `RemoteSession` và **bắt buộc đăng nhập Supabase**; gameplay, thời gian, RNG, tài nguyên và cài đặt được ghi bằng lệnh `/api/v1` lên Node + SQLite. Chế độ khách/offline không còn được phục vụ. **Để chơi thực sự trên internet cần triển khai Node backend HTTPS**; Cloudflare static-only không cung cấp API. Tài liệu triển khai tại [docs/online-deployment.md](docs/online-deployment.md). Xem mục [Backend](#backend) và [kế hoạch](docs/backend-plan.md).

Repository: [zeplaovn/Hugioi](https://github.com/zeplaovn/Hugioi).

## Chạy dự án

Yêu cầu **Node.js 24+**. Không cần `npm install` để chạy Node backend. Cần cấu hình `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` và volume SQLite riêng; xem `.env.example` và `docs/online-deployment.md`.

```sh
npm start        # máy chủ tại http://127.0.0.1:8000 (HOST, PORT tùy chọn)
npm run check    # cú pháp JavaScript, ranh giới engine, thứ tự script
npm test         # test backend /api/v1, RemoteSession, engine và giao diện
```

`npm start` phục vụ giao diện và `/api/v1/*` khi cấu hình Supabase. Auth dùng Supabase JWT và hai bản ghi đồng ý chính sách. Backend từ chối hoạt động online khi thiếu xác thực hoặc quyền consent. Không bật `HU_LEGACY_AUTH` trong production.

**Đăng nhập an toàn (chính sách v4):** email đúng cú pháp và xác minh qua Supabase; Node API `/api/auth/supabase-login` giới hạn 10 lượt thử trong 15 phút trên mỗi IP. Static-only không phục vụ gateway; cần Node API HTTPS cùng origin hoặc tách origin bằng HU_API_ORIGIN/HU_ALLOWED_ORIGINS và bật thêm giới hạn Supabase Auth/WAF để chống truy cập thẳng tới GoTrue. Liên hệ vận hành ghi trong dự thảo: RedEye Studio — zeplaovn@proton.me.\n\n`index.html` chỉ chơi được khi phục vụ qua HTTP(S) với API `/api/v1` đang hoạt động và cấu hình Supabase. Mở bằng `file://` chỉ hiển thị thông báo cần máy chủ, **không tạo/sửa bản lưu offline**. Node backend chỉ tính tiến trình khi phiên online hoạt động; offline và tab ẩn sẽ dừng tu luyện, tuổi tác và mọi hoạt động có hẹn giờ. Sự kiện tử vong không phát sinh khi offline.

## Tính năng thiết kế

Các tính năng sau thuộc bản trước và là phạm vi mà engine mới phải đáp ứng; UI và dữ liệu cho chúng vẫn còn trong repository.

| Nhóm | Nội dung |
|---|---|
| Khởi nguyên | Logo ảnh `logo.webp`; ô Chủng tộc/Linh căn hiện thông số (tốc tu, tinh khiết) và mở bảng so sánh; mục **Kinh mạch** xem trước 12 chính kinh theo hệ, mạch cùng hệ/sinh hệ và tốc độ tích tạp chất (dữ liệu `data/meridians.js`, theo root.txt; chưa là trạng thái engine). Intro cinematic 5 chương; loading tối thiểu 10,9 giây. Tạo đạo hiệu, giới tính, tuổi, chủng tộc, linh căn, chọn một Thiên mệnh miễn phí và phân bổ thiên phú. Nhấn ô chủng tộc hoặc linh căn để xem giải thích. Không còn gieo Âm Dương khi tạo mới; bản lưu cũ vẫn được giữ. |
| Tu luyện | Tự tăng tu vi **khi online**; khi offline hoặc tab ẩn, dừng tu luyện, tuổi tác, chiến đấu và tất cả tiến trình có hẹn giờ. |
| Cảnh giới | Tiểu cảnh giới (tầng) **tự động đột phá** khi đủ tu vi, kể cả nhiều tầng liên tiếp khi còn online. Đến tầng cuối (viên mãn) tu vi dừng ở ngưỡng và người chơi phải **bấm tay** đột phá đại cảnh giới: có xác nhận, trang độ kiếp riêng, hiệu ứng và kết quả. VFX đột phá nhỏ và giai đoạn tụ linh quang trên độ kiếp đài kéo dài thêm 5 giây; chế độ giảm chuyển động vẫn được tôn trọng. |
| Lịch luyện | Công kích, kỹ năng, chiến đấu tự động, yêu thú, chiến lợi phẩm, Sinh lực và Linh khí. |
| Nhân vật | Hành trang, trang bị pháp bảo, công pháp chủ động, linh căn ngũ hành và Dị linh căn Băng/Lôi/Phong/Độc. Ngũ hành có cơ hội hóa Hỗn Độn khi vượt lôi kiếp; Dị khắc hệ gốc. |
| Nghề phụ | Luyện đan, rèn pháp bảo, chế phù và linh điền. Công đoạn chế tạo, chăm cây và mọi thời hạn được tạm dừng khi offline; không có thưởng bế quan. |
| Thế giới | Nhiệm vụ, bí cảnh, kỳ ngộ, tông môn và NPC Hạ Giới có quan hệ, vai trò, sở thích và thiện cảm. |
| Tọa hóa vĩnh viễn | Thất bại thiên kiếp, thua PvP NPC, HP bằng 0 hoặc thọ nguyên cạn kết thúc nhân vật. Chỉ xóa đạo thân đã chết trên máy chủ rồi tạo mới; **không hồi sinh đạo thân cũ**. Thiên Tinh và nâng cấp Thiên Mệnh Các giữ theo tài khoản. |
| Giao diện idle | Thanh tài nguyên (linh thạch, tu vi/giây, Thiên mệnh đã chọn) có số chạy, thanh tu vi + dải chấm tầng, dock nâng cấp nhanh (Tốc tu ×1/×10/Tối đa, Hấp thu, Dùng đan) ngay trên sân khấu, nút lớn Đột phá đại cảnh giới, cầu linh khí bay vào thanh tu vi, chấm thông báo trên tab. Mã: `css/idle.css`, `client/ui/idle-hud.js`. |
| Trải nghiệm | Nhật ký tu tiên chữ lớn, nhạc nền, chuyển cảnh bốn mùa/ngày–đêm, tùy chọn giảm chuyển động, giao diện desktop/mobile. Mỗi menu (Nhân vật, Nghề phụ, Thế giới, Cài đặt…) mở thành một trang riêng phủ vùng màn chơi, có nút ‹ Tu luyện để quay lại; menu thu gọn/mở bằng icon ☰ (nhớ lựa chọn). Lịch luyện vẫn hiện bảng dưới sân khấu để xem trận đánh. |

Menu **Thêm** gồm: **Chat online · Tri kỷ · Đạo hữu · Tông môn · PvP · Bảng xếp hạng**. Giao du, PvP, bảng xếp hạng và đấu giá hiện phục vụ chế độ mô phỏng một người chơi.

Hạ Giới và Linh Giới dùng ảnh `.webp` trong `media/assets/world/bg/<giới>/<day|night>/<xuan|ha|thu|dong>.webp`. Mỗi mùa tự động dài 15 phút tiến trình tu luyện, chia đều ngày/đêm. Tiên Giới dùng duy nhất `tien_gioi/bg.webp`. Có thể chọn mùa cố định tại **Cài đặt → Tứ thời**.

## Lưu và chuyển tiến trình

- Giao diện **không ghi bản nhân vật vào `localStorage`**. Snapshot chỉ được hiển thị trong bộ nhớ; Node backend lưu dữ liệu trong SQLite trên volume của máy chủ.
- Chuyển thiết bị: đăng nhập lại tài khoản Supabase trên cùng tên miền backend để mở nhân vật.
- **Không tự động nhập các bản lưu offline cũ**. Không lấy JSON phía client làm trạng thái tin cậy; cần một quy trình nhập có xác thực/kiểm toán riêng nếu sẽ hỗ trợ di trú.
- **Tọa hóa:** chỉ khi server xác nhận nhân vật đã chết mới cho xóa nhân vật SQLite để tạo lại. Tài khoản Supabase và kho Thiên Mệnh Các vẫn tồn tại, không thu phí tạo kiếp mới. Khi xóa *toàn bộ dữ liệu tài khoản* theo quyền riêng tư thì kho này cũng bị xóa.
- Cần thực hiện backup/restore database và quy trình xóa dữ liệu theo yêu cầu trước phát hành thương mại.

## Thiên Mệnh Các · Thiên Tinh xuyên kiếp

- Mỗi lần vượt **đại** cảnh giới thành công, nhận Thiên Tinh bằng **5 × bậc cảnh giới mới**: lên Trúc Cơ +5, Kim Đan +10, Nguyên Anh +15… Mỗi kiếp đều nhận đầy đủ, không khấu trừ vì đã đạt ở kiếp cũ.
- Thiên Tinh không mất khi tọa hóa; tạo kiếp mới **miễn phí**. Sáu thuộc tính Tướng Mạo, Phúc Duyên, Căn Cốt, Ngộ Tính, Vận Khí và Cơ Duyên nâng tối đa 20 cấp. Mỗi cấp tăng 2,5% tương đối cho hiệu ứng tương ứng (tối đa +50%).
- Giá mỗi cấp: 1–5 tốn 2, 6–10 tốn 4, 11–15 tốn 8, 16–20 tốn 12 Thiên Tinh; nâng đủ một thuộc tính tốn tổng 130.
- Kỳ Trân: Túi Linh Thạch (20 Thiên Tinh, +200 linh thạch khi tạo kiếp mới), Ngộ Đạo Ngọc (45, +15% tu vi tầng đầu), Trường Sinh Ngọc (35, +1 năm thọ nguyên). Giữ tối đa 5 mỗi loại; tự sử dụng một món mỗi loại khi tạo nhân vật mới.
- Mọi khoản thưởng, tiêu Thiên Tinh, tồn kho và giao dịch idempotent đều ghi **trực tiếp trong SQLite** theo tài khoản Supabase; client chỉ gửi mã hành động và yêu cầu mua, không gửi giá hoặc trạng thái. Xem [hợp đồng và cân bằng Thiên Mệnh Các](docs/thien-menh-cac.md).

## Cấu trúc mã nguồn

Phụ thuộc một chiều: `client/` và `server/` → `engine/` → `data/`. Chi tiết: [docs/architecture.md](docs/architecture.md).

```text
index.html                 Điểm vào trình duyệt và thứ tự nạp scripts
data/                      Dữ liệu thiết kế và công thức cân bằng (thuần dữ liệu)
engine/                    Luật chơi dùng chung cho client và server
  game.js                    Ghép data + state + rules; báo READY / MISSING
  state/                     Schema V9, create, normalize V4–V9
  rules/                     9 miền: progression inventory crafting combat world adventures social time creation
  protocol/                  Protocol v2, 48 lệnh: schema payload, validate, execute
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
tools/                     Build static, backup SQLite và kiểm giao diện
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
| `HU_ONLINE_GRACE_MS` | Sau ngưỡng vắng heartbeat thì đóng băng thời gian game, mặc định 20000 ms; tab ẩn gửi tín hiệu pause ngay |

| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/v1/bootstrap` | Phiên bản giao thức/nội dung, giờ máy chủ, nhân vật của tài khoản |
| POST | `/api/v1/creation/preview` | Máy chủ gieo tuổi, chủng tộc, linh căn; trả ticket 10 phút (5 lần/ngày) |
| POST | `/api/v1/players` | Tạo nhân vật từ ticket + đạo hiệu/giới tính/thiên phú |
| GET | `/api/v1/players/{id}/state` | Snapshot hiện tại, không catch-up |
| POST | `/api/v1/players/{id}/sync` | Đồng bộ online; nếu đã offline thì chỉ điều chỉnh mốc giờ và tạm dừng mọi tiến trình |
| POST | `/api/v1/players/{id}/pause` | Tạm dừng có xác thực khi tab ẩn/đóng; server cũng tự đóng băng khi hết heartbeat |
| POST | `/api/v1/players/{id}/commands` | Một lệnh `{ protocolVersion, requestId, expectedRevision, type, payload }` |
| POST | `/api/v1/pavilion/purchase` | Mua nâng cấp hoặc Kỳ Trân từ số dư tài khoản `{requestId, expectedVersion, kind, key}` |
| GET | `/api/v1/me/export` | Tải bản sao dữ liệu gameplay của chính tài khoản (JSON) |
| POST | `/api/v1/me/erase` | Xóa dữ liệu gameplay, body `{ confirm: "delete-my-game-data" }` |
| POST | `/api/v1/me/delete-account` | Xóa dữ liệu gameplay + tài khoản Supabase, body `{ confirm: "delete-my-account" }`; cần `SUPABASE_SERVICE_ROLE_KEY` ở máy chủ |

Ba API `/me/*` không đòi hỏi bản chấp thuận chính sách còn hiệu lực. Sao lưu: `node tools/backup-db.cjs --keep 7`.

Đảm bảo: API JWT chỉ hoạt động khi máy chủ xác minh được cả hai bản chấp thuận chính sách `privacy` và `release_terms` phiên bản `2026-11-10-v5`. Không thể vượt qua bằng cách bỏ qua checkbox frontend; Supabase gián đoạn thì API từ chối tạm thời. `HU_LEGACY_AUTH=1` chỉ dùng phát triển, bị chặn khi `NODE_ENV=production`. Đặt thư mục SQLite quyền `0700` và tệp DB quyền `0600`; API không thể hoạt động trên Cloudflare static-only khi chưa triển khai Node riêng.

Đảm bảo: client không gửi state/thời gian/RNG/giá; `requestId` idempotent (retry trả `replayed: true`, không trừ tiền hai lần); `expectedRevision` lệch trả `REVISION_CONFLICT`; lệnh bị luật từ chối không ghi state; snapshot không chứa seed bí cảnh; mỗi người chơi có chuỗi RNG riêng (HMAC) lưu ở máy chủ; giới hạn tốc độ, body ≤ 64 KB, envelope lỗi `{ error: { code, message, requestId, retryable } }`. Chạy một instance (SQLite ghi một process); nhiều instance cần chuyển sang PostgreSQL theo cùng hợp đồng `server/repositories/player-repository.js`.

**Đã có:** `RemoteSession`, máy chủ cấp ticket tạo nhân vật, thực thi 48 lệnh engine, sync, reset sau tọa hóa, Thiên Mệnh Các theo tài khoản, đồng bộ cài đặt. **Chưa có:** máy chủ HTTPS đã triển khai, nhập save offline, PvP/chat nhiều người thật (các tính năng này vẫn chỉ là NPC/mô phỏng hoặc khung chưa triển khai), admin API và WebSocket. Nếu frontend tách domain API, đặt `HU_API_ORIGIN` khi build và `HU_ALLOWED_ORIGINS` trên Node; build tự sinh `dist/client/config.js` và CSP, không cần nới CSP thủ công.

Email liên hệ hỗ trợ, khiếu nại và dữ liệu cá nhân: **[zeplaovn@proton.me](mailto:zeplaovn@proton.me)**. Chính sách quyền riêng tư và điều khoản trực tuyến phiên bản `2026-11-10-v5` (phi lợi nhuận, không thanh toán trực tuyến) yêu cầu chấp thuận lại; **phải mở rộng CHECK `policy_version` trên Supabase trước khi triển khai** (xem `supabase/sql/policy_acceptances.sql`).

## Tài liệu

- [Kiến trúc](docs/architecture.md): các lớp, thư mục, luồng lệnh, cách nạp module, thêm lệnh.
- [Gameplay V9: một mạng, online-only](docs/gameplay-v9.md): quy tắc sinh tử, tạm dừng offline và các lựa chọn thiết kế cần xác nhận.
- [Hợp đồng engine](docs/engine-contract.md): đặc tả UI cần từ engine (48 lệnh, API `HU_GAME`, state, bản lưu).
- [Kế hoạch backend online](docs/backend-plan.md): thiết kế server-authoritative nhiều người chơi.
- [Tích hợp dữ liệu thiết kế](docs/design-integration.md): phạm vi dữ liệu và cách nhập snapshot mới.
- [data/README.md](data/README.md): dữ liệu thiết kế và công thức cân bằng.

## Thiên Thư · Vạn Kiếp Tàng Thư

Vào **Thiên Mệnh → Thiên Thư** để đọc 14 chương qua Hạ Giới, Linh Giới và Tiên Giới. Chương mở theo cảnh giới; trang đã đọc chỉ tồn tại trong kiếp nhân vật hiện tại. Ba lựa chọn cốt truyện lưu lời hẹn nhưng không đổi chỉ số hay phần thưởng.

Trong **Thế giới → NPC**, chọn **Trò chuyện** để gặp 10 kỳ nhân qua ba mức thiện cảm (0, 20, 55). Hội thoại nhiều lượt gồm câu đáp của người chơi, chủ đề và lựa chọn lưu qua engine. Bí cảnh và kỳ ngộ có lời dẫn bổ sung trong các bảng hiện có. Nội dung ở `data/story.js`, một lệnh mới `storyMark` thuộc miền `world`; không hỗ trợ chơi offline qua `file://`.
