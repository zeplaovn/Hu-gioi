# Hư Giới · Tiên Lộ Vô Tận

Game idle tu tiên bằng tiếng Việt, chạy trên trình duyệt với giao diện tiên hiệp tông tối. Người chơi tạo đạo thân, tu luyện, lịch luyện, vượt thiên kiếp và tích lũy Thiên mệnh qua nhiều kiếp.

> **Hiện trạng (nhánh `rebuild/backend-skeleton`): engine đã sẵn sàng, game chơi được offline.** Giao diện, tài nguyên, dữ liệu thiết kế và công thức cân bằng được giữ lại; `engine/` đã cài đặt đủ 9 miền luật, 46 lệnh và schema V7 nên `HU_GAME.READY === true`. `server/` vẫn là khung cho chế độ online. Mở `index.html` để tạo đạo thân và chơi; bản lưu nằm trong trình duyệt. Hợp đồng engine: [docs/engine-contract.md](docs/engine-contract.md). Bản chơi được cuối cùng trước đợt dọn backend nằm ở commit `5f6b9bc` (nhánh `main`).

Repository: [zeplaovn/Hu-gioi](https://github.com/zeplaovn/Hu-gioi).

## Chạy dự án

Yêu cầu **Node.js 20+**. Không cần `npm install`.

```sh
npm start        # máy chủ tại http://127.0.0.1:8000 (HOST, PORT tùy chọn)
npm run check    # cú pháp JavaScript, ranh giới engine, thứ tự script
npm test         # test hợp đồng, hành vi 9 miền luật, LocalSession và UI entry
```

`npm start` phục vụ game tĩnh và `GET /api/health`. Cũng có thể mở thẳng [index.html](index.html) (`file://`) hoặc chạy `python3 -m http.server 8000 --bind 127.0.0.1`; game dùng HTML, CSS và JavaScript với classic scripts, không cần build. Game chạy offline qua `LocalSession`, tự lưu bằng `localStorage` và cộng tiến trình bế quan khi mở lại. Nếu `HU_GAME.READY` là `false` (ví dụ thiếu file engine), trang mở bản xem trước và in danh sách phần còn thiếu trong console.

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
| Xuyên kiếp | Thọ nguyên, tọa hóa, chuyển thế, thành tựu, nâng cấp vĩnh viễn và lịch sử kiếp trước. Trọng sinh nằm trong **Thiên mệnh → Trọng sinh**. |
| Giao diện idle | Thanh tài nguyên (linh thạch, tu vi/giây, Đạo vận) có số chạy, thanh tu vi + dải chấm tầng, dock nâng cấp nhanh (Tốc tu ×1/×10/Tối đa, Hấp thu, Dùng đan) ngay trên sân khấu, nút lớn Đột phá đại cảnh giới, cầu linh khí bay vào thanh tu vi, chấm thông báo trên tab, popup Bế quan trở về có số đếm lên. Mã: `css/idle.css`, `client/ui/idle-hud.js`. |
| Trải nghiệm | Nhật ký tu tiên chữ lớn, nhạc nền, chuyển cảnh bốn mùa/ngày–đêm, tùy chọn giảm chuyển động, giao diện desktop/mobile. Mỗi menu (Nhân vật, Nghề phụ, Thế giới, Cài đặt…) mở thành một trang riêng phủ vùng màn chơi, có nút ‹ Tu luyện để quay lại; menu thu gọn/mở bằng icon ☰ (nhớ lựa chọn). Lịch luyện vẫn hiện bảng dưới sân khấu để xem trận đánh. |

Menu **Thêm** gồm: **Chat online · Tri kỷ · Đạo hữu · Tông môn · PvP · Bảng xếp hạng**. Giao du, PvP, bảng xếp hạng và đấu giá hiện phục vụ chế độ mô phỏng một người chơi.

Hạ Giới và Linh Giới dùng ảnh `.webp` trong `media/assets/world/bg/<giới>/<day|night>/<xuan|ha|thu|dong>.webp`. Mỗi mùa tự động dài 15 phút tiến trình tu luyện, chia đều ngày/đêm. Tiên Giới dùng duy nhất `tien_gioi/bg.webp`. Có thể chọn mùa cố định tại **Cài đặt → Tứ thời**.

## Lưu và chuyển tiến trình

- Game tự lưu bằng `localStorage`; vào **Cài đặt → Bản lưu** để **Lưu ngay**, **Xuất JSON** hoặc **Nhập JSON**.
- Tệp xuất có tên `hu-gioi-save.json`. Nhập bản lưu hỗ trợ V4, V5, V6 và V7, chuyển về schema **V7**.
- Khóa chính: `huGioiWorkspaceV1`; khóa dự phòng: `huGioiWorkspaceV1Backup`. Bản hiện tại được giữ thêm trước khi nhập JSON.
- Dữ liệu gắn với trình duyệt và địa chỉ chạy game. Dùng xuất/nhập JSON khi đổi thiết bị, trình duyệt hoặc chuyển giữa `file://` và HTTP.
- Thiên mệnh được giữ qua trọng sinh; **Xóa tiến trình** trong Cài đặt xóa cả bản lưu và tiến trình xuyên kiếp trên thiết bị.

## Cấu trúc mã nguồn

Phụ thuộc một chiều: `client/` và `server/` → `engine/` → `data/`. Chi tiết: [docs/architecture.md](docs/architecture.md).

```text
index.html                 Điểm vào trình duyệt và thứ tự nạp scripts
data/                      Dữ liệu thiết kế và công thức cân bằng (thuần dữ liệu)
engine/                    Luật chơi dùng chung cho client và server
  game.js                    Ghép data + state + rules; báo READY / MISSING
  state/                     Schema V7, create, normalize V4–V7
  rules/                     9 miền: progression inventory crafting combat world adventures social time creation
  protocol/                  46 lệnh: schema payload, validate, execute
client/
  assets/ platform/          Ảnh, âm thanh, loading, bảo vệ nội dung
  persistence/               localStorage, dự phòng, xuất/nhập JSON
  session/                   LocalSession (offline) và ChatSession (HTTP/SSE)
  ui/                        Màn hình, vỏ giao diện, hiệu ứng, tân thủ
  main.js                    Khởi động
server/                    Máy chủ HTTP
  main.js http/              File tĩnh + /api/health
  services/ repositories/ chat/   Khung PlayerService, kho lưu trữ, chat
css/  media/  _headers     Giao diện, hình ảnh/âm thanh, HTTP headers
tools/                     Kiểm tra, preload, import dữ liệu; pending-engine/ chờ engine mới
docs/                      Tài liệu
```

## Phát triển

- Viết luật và tính thưởng trong `engine/`; giao diện chỉ gửi lệnh bằng `UI.command(type, payload)` và hiển thị state. Cài đặt hiển thị dùng `UI.preference()`.
- `engine/` và `data/` không phụ thuộc DOM, `localStorage`, mạng hay timer; thời gian và RNG do phiên cung cấp.
- Thêm lệnh: khai báo schema trong `engine/protocol/commands.js`, gán cho đúng một miền trong `engine/rules/`, cập nhật [bảng lệnh](docs/engine-contract.md#4-lệnh-46) và test. `engine/game.js` từ chối nạp nếu lệnh thuộc hai miền hoặc không thuộc miền nào.
- Thêm module: cập nhật điểm ghép trong `engine/game.js` **và** thứ tự thẻ `<script>` trong `index.html` để Node lẫn `file://` nạp đúng; `npm test` kiểm tra thứ tự.
- Khi thay ảnh, cập nhật ánh xạ trong `client/assets/` và `client/assets/preload-manifest.js`.
- Thay dữ liệu thiết kế: xem [docs/design-integration.md](docs/design-integration.md).

Engine đã hoàn tất theo thứ tự state → time/creation → progression → inventory/crafting/combat → world/adventures/social. Test nằm trong `tests/`; `HU_GAME.MISSING` rỗng nên UI tự khởi động phiên chơi.

## Backend

`server/` hiện có file tĩnh và `GET /api/health`. `PlayerService` (create/sync/command, `expectedRevision`, `requestId` idempotent), `PlayerRepository` (`transact/get/create`) và chat là khung giao diện. Kế hoạch online (stack, schema, API, xác thực, triển khai, lộ trình nhiều người chơi) ở [docs/backend-plan.md](docs/backend-plan.md). Gameplay hiện chạy offline qua `LocalSession`; chat client (`client/session/chat-session.js`) chờ máy chủ chat.

## Tài liệu

- [Kiến trúc](docs/architecture.md): các lớp, thư mục, luồng lệnh, cách nạp module, thêm lệnh.
- [Hợp đồng engine](docs/engine-contract.md): đặc tả UI cần từ engine (46 lệnh, API `HU_GAME`, state, bản lưu).
- [Kế hoạch backend online](docs/backend-plan.md): thiết kế server-authoritative nhiều người chơi.
- [Tích hợp dữ liệu thiết kế](docs/design-integration.md): phạm vi dữ liệu và cách nhập snapshot mới.
- [data/README.md](data/README.md): dữ liệu thiết kế và công thức cân bằng.
